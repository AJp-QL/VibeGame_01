import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  categoriesOf,
  checkPaths,
  classify,
  formatResult,
  globToRegExp,
  loadOwnership,
  matches,
  type CheckResult,
  type OwnershipMap,
} from '../src/index.ts'

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const map = loadOwnership(REPO_ROOT)

const offendingFiles = (r: CheckResult) => (r.status === 'fail' ? r.offending.map((o) => o.file) : [])

describe('glob matching', () => {
  it('"dir/**" matches anything below dir but not the dir name as a prefix of another', () => {
    expect(matches('packages/web/**', 'packages/web/src/App.tsx')).toBe(true)
    expect(matches('packages/web/**', 'packages/web/wrangler.jsonc')).toBe(true)
    expect(matches('packages/web/**', 'packages/webkit/x.ts')).toBe(false)
    expect(matches('packages/web/**', 'packages/web')).toBe(false)
  })

  it('exact paths match only themselves; dots are literal', () => {
    expect(matches('package.json', 'package.json')).toBe(true)
    expect(matches('package.json', 'packages/web/package.json')).toBe(false)
    expect(matches('package.json', 'packageXjson')).toBe(false)
  })

  it('"*" stays within a segment, "**/" matches zero or more directories', () => {
    expect(matches('docs/*.md', 'docs/README.md')).toBe(true)
    expect(matches('docs/*.md', 'docs/rules/rules.md')).toBe(false)
    expect(matches('**/package.json', 'package.json')).toBe(true)
    expect(matches('**/package.json', 'packages/ai/package.json')).toBe(true)
    expect(globToRegExp('a/b+c(1).md').test('a/b+c(1).md')).toBe(true)
  })
})

describe('the repo ownership map', () => {
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\0')
    .filter((f) => f.length > 0)

  it('classifies every tracked file into exactly one category', () => {
    const unclassified = tracked.filter((f) => categoriesOf(map, f).length === 0)
    const overlapping = tracked.filter((f) => categoriesOf(map, f).length > 1)
    expect(unclassified).toEqual([])
    expect(overlapping).toEqual([])
  })

  it('gives each area the owner from ADR 0004 / decision log 2026-10-16', () => {
    expect(classify(map, '.scratch/phase-1-battle-slice/issues/21-ci.md')).toBe('shared')
    expect(classify(map, 'pnpm-lock.yaml')).toBe('shared')
    for (const f of ['package.json', 'AGENTS.md', 'CONTEXT.md', '.github/workflows/ci.yml', 'docs/decisions/decision-log.md', 'tsconfig.json']) {
      expect(classify(map, f), f).toBe('claudeOnly')
    }
    for (const f of ['packages/engine/src/index.ts', 'packages/session/package.json', 'tools/simulator/src/cli.ts', 'data/species/x.json', 'docs/rules/rules.md', 'docs/balance/phase-1-baseline.md']) {
      expect(classify(map, f), f).toBe('claude')
    }
    for (const f of ['packages/battle/src/x.ts', 'packages/web/wrangler.jsonc', 'packages/web/package.json', 'art/sprites/a.png']) {
      expect(classify(map, f), f).toBe('codex')
    }
  })
})

describe('checkPaths', () => {
  it('skips main and tags', () => {
    expect(checkPaths(map, 'main', ['packages/engine/src/x.ts']).status).toBe('skipped')
    expect(checkPaths(map, 'refs/heads/main', ['x']).status).toBe('skipped')
    expect(checkPaths(map, 'refs/tags/v0.1.0', ['x']).status).toBe('skipped')
    expect(checkPaths(map, 'v0.1.0', ['x'], { isTag: true }).status).toBe('skipped')
  })

  it('lets claude/* change Claude, Claude-only and shared paths', () => {
    const r = checkPaths(map, 'claude/ticket-21', [
      'packages/engine/src/x.ts',
      '.github/workflows/ci.yml',
      'AGENTS.md',
      'package.json',
      '.scratch/a/b.md',
      'pnpm-lock.yaml',
    ])
    expect(r).toEqual({ status: 'pass', owner: 'claude', checked: 6 })
  })

  it('stops claude/* from changing Codex paths', () => {
    const r = checkPaths(map, 'claude/x', ['packages/engine/src/x.ts', 'packages/web/src/App.tsx', 'art/ui/a.png'])
    expect(r.status).toBe('fail')
    expect(offendingFiles(r)).toEqual(['packages/web/src/App.tsx', 'art/ui/a.png'])
  })

  it('lets codex/* change Codex and shared paths, including its own package.json', () => {
    const r = checkPaths(map, 'codex/split-app', [
      'packages/battle/package.json',
      'packages/web/package.json',
      'packages/web/src/App.tsx',
      'art/sprites/a.png',
      'pnpm-lock.yaml',
      '.scratch/x/issue.md',
    ])
    expect(r).toEqual({ status: 'pass', owner: 'codex', checked: 6 })
  })

  it("stops codex/* from changing Claude packages' package.json, root config and Claude-only docs", () => {
    const r = checkPaths(map, 'codex/x', [
      'packages/battle/package.json',
      'packages/engine/package.json',
      'package.json',
      'AGENTS.md',
      '.github/ownership.json',
      'docs/decisions/decision-log.md',
      'CONTEXT.md',
      'packages/session/src/index.ts',
    ])
    expect(offendingFiles(r)).toEqual([
      'packages/engine/package.json',
      'package.json',
      'AGENTS.md',
      '.github/ownership.json',
      'docs/decisions/decision-log.md',
      'CONTEXT.md',
      'packages/session/src/index.ts',
    ])
  })

  it('fails any other branch name, even with no changes', () => {
    for (const branch of ['feature/x', 'claude', 'codex', 'Claude/x', 'dev', 'main2']) {
      const r = checkPaths(map, branch, ['.scratch/a.md'])
      expect(r.status, branch).toBe('fail')
    }
    expect(checkPaths(map, 'feature/x', []).status).toBe('fail')
  })

  it('fails unclassified paths (a new top-level path must be added to the map first)', () => {
    const claude = checkPaths(map, 'claude/x', ['newdir/file.ts', 'packages/engine/src/x.ts'])
    expect(offendingFiles(claude)).toEqual(['newdir/file.ts'])
    expect(claude.status === 'fail' && claude.offending[0]!.category).toBe(null)
    expect(checkPaths(map, 'codex/x', ['Dockerfile']).status).toBe('fail')
  })

  it('normalises backslashes, blank lines and duplicates', () => {
    const r = checkPaths(map, 'codex/x', ['packages\\web\\src\\a.ts', '', '  ', 'packages/web/src/a.ts'])
    expect(r).toEqual({ status: 'pass', owner: 'codex', checked: 1 })
  })

  it('passes a branch with no changed files', () => {
    expect(checkPaths(map, 'claude/x', [])).toEqual({ status: 'pass', owner: 'claude', checked: 0 })
  })

  it('works with any map, not just the repo one', () => {
    const tiny: OwnershipMap = { shared: [], claudeOnly: [], claude: ['a/**'], codex: ['b/**'] }
    expect(checkPaths(tiny, 'claude/x', ['a/1']).status).toBe('pass')
    expect(checkPaths(tiny, 'claude/x', ['b/1']).status).toBe('fail')
  })
})

describe('formatResult', () => {
  it('lists offending files with their category', () => {
    const text = formatResult(checkPaths(map, 'codex/x', ['packages/engine/package.json', 'newdir/a']))
    expect(text).toContain('path check failed')
    expect(text).toContain('packages/engine/package.json  (claude)')
    expect(text).toContain('newdir/a  (not classified in .github/ownership.json)')
  })
})
