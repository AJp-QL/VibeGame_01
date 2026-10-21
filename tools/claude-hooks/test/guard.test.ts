import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Drives the bin the way Claude Code does: hook JSON on stdin, verdict in the exit code and stderr.
const BIN = fileURLToPath(new URL('../src/bin.ts', import.meta.url))

const OWNERSHIP = {
  shared: ['.scratch/**'],
  claudeOnly: ['.claude/**', '.github/**', '.gitignore'],
  claude: ['tools/**'],
  codex: ['packages/web/**'],
}

let tmp: string
let repo: string // on claude/x-01-guard
let onMain: string // worktree inside repo, on main
let onCodex: string // worktree inside repo, on codex/x-01-guard
let onClaude: string // worktree inside repo, on claude/x-02-other
let noOwnership: string // separate repo on a claude branch without ownership.json
let outside: string // not a git repo

function git(cwd: string, ...args: string[]) {
  execFileSync('git', args, { cwd, stdio: 'pipe' })
}

function initRepo(dir: string, withOwnership: boolean) {
  mkdirSync(dir, { recursive: true })
  git(dir, 'init', '-q', '-b', 'main')
  git(dir, 'config', 'user.name', 'guard test')
  git(dir, 'config', 'user.email', 'guard@test.invalid')
  git(dir, 'config', 'commit.gpgsign', 'false')
  writeFileSync(join(dir, '.gitignore'), '.claude/worktrees/\n')
  mkdirSync(join(dir, 'tools'))
  writeFileSync(join(dir, 'tools', 'keep.ts'), '')
  if (withOwnership) {
    mkdirSync(join(dir, '.github'))
    writeFileSync(join(dir, '.github', 'ownership.json'), JSON.stringify(OWNERSHIP))
  }
  git(dir, 'add', '.')
  git(dir, 'commit', '-q', '-m', 'init')
}

function run(input: unknown, subcommand = 'guard') {
  const stdin = typeof input === 'string' ? input : JSON.stringify(input)
  const r = spawnSync(process.execPath, [BIN, subcommand], { input: stdin, encoding: 'utf8' })
  return { code: r.status, stderr: r.stderr }
}

const edit = (file: string, cwd = repo) => run({ hook_event_name: 'PreToolUse', tool_name: 'Edit', cwd, tool_input: { file_path: file } })
const backslashes = (p: string) => p.replace(/\//g, '\\')

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'mt-claude-hooks-'))
  repo = join(tmp, 'repo')
  initRepo(repo, true)
  git(repo, 'checkout', '-q', '-b', 'claude/x-01-guard')
  onMain = join(repo, '.claude', 'worktrees', 'on-main')
  onCodex = join(repo, '.claude', 'worktrees', 'on-codex')
  onClaude = join(repo, '.claude', 'worktrees', 'on-claude')
  git(repo, 'worktree', 'add', '-q', onMain, 'main')
  git(repo, 'worktree', 'add', '-q', '-b', 'codex/x-01-guard', onCodex)
  git(repo, 'worktree', 'add', '-q', '-b', 'claude/x-02-other', onClaude)
  noOwnership = join(tmp, 'no-ownership')
  initRepo(noOwnership, false)
  git(noOwnership, 'checkout', '-q', '-b', 'claude/x-01-guard')
  outside = join(tmp, 'outside')
  mkdirSync(outside)
}, 60_000)

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true })
})

describe('guard on a claude/* branch', { timeout: 60_000 }, () => {
  it('allows claude, claudeOnly and shared files, existing or new', () => {
    for (const file of ['tools/new/dir/x.ts', '.github/ownership.json', '.scratch/a/issues/x.md']) {
      expect(edit(join(repo, file)), file).toEqual({ code: 0, stderr: '' })
    }
  })

  it('blocks a codex file and points at an Owner: codex ticket', () => {
    const r = edit(join(repo, 'packages/web/src/App.tsx'))
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('packages/web/src/App.tsx')
    expect(r.stderr).toContain('Owner: codex')
  })

  it('blocks an unclassified new top-level path and points at ownership.json', () => {
    const r = edit(join(repo, 'newtop/x.ts'))
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('newtop/x.ts')
    expect(r.stderr).toContain('.github/ownership.json')
  })

  it('gives the same verdict for a Windows-style backslash path', () => {
    // Same verdicts as the forward-slash claude and codex cases above.
    expect(edit(backslashes(join(repo, 'tools/keep.ts')))).toEqual({ code: 0, stderr: '' })
    const r = edit(backslashes(join(repo, 'packages/web/src/App.tsx')))
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('packages/web/src/App.tsx')
  })

  it('resolves a relative path against cwd and reads NotebookEdit notebook_path', () => {
    expect(edit('packages/web/a.ts', repo).code).toBe(2)
    const nb = run({ tool_name: 'NotebookEdit', cwd: repo, tool_input: { notebook_path: join(repo, 'packages/web/n.ipynb') } })
    expect(nb.code).toBe(2)
  })
})

describe('guard on other branches', { timeout: 60_000 }, () => {
  it('blocks every edit on main with a worktree hint', () => {
    const r = edit(join(onMain, 'tools/keep.ts'), onMain)
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('"main"')
    expect(r.stderr).toContain('worktree')
  })

  it('blocks every edit on a codex/* branch, even codex files', () => {
    const r = edit(join(onCodex, 'packages/web/src/App.tsx'), onCodex)
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('codex/x-01-guard')
  })
})

describe('guard root resolution', { timeout: 60_000 }, () => {
  it('judges a file in a worktree by that worktree, not by the repo around it', () => {
    // Resolved against the outer repo these would be .claude/** (claudeOnly) on a claude branch, i.e. allowed.
    expect(edit(join(onClaude, 'packages/web/src/App.tsx'), repo).code).toBe(2)
    expect(edit(join(onMain, 'tools/keep.ts'), repo).code).toBe(2)
    expect(edit(join(onClaude, 'tools/keep.ts'), repo)).toEqual({ code: 0, stderr: '' })
  })

  it('allows files outside any repo silently', () => {
    expect(edit(join(outside, 'notes.md'), outside)).toEqual({ code: 0, stderr: '' })
    expect(edit(join(outside, 'deep/new/notes.md'), repo)).toEqual({ code: 0, stderr: '' })
  })
})

describe('guard fails open', { timeout: 60_000 }, () => {
  it('allows with a warning when ownership.json is missing', () => {
    const r = edit(join(noOwnership, 'tools/keep.ts'), noOwnership)
    expect(r.code).toBe(0)
    expect(r.stderr).toContain('could not check')
    expect(r.stderr).toContain('ownership.json')
  })

  it('allows with a warning on unreadable stdin or an unknown subcommand', () => {
    const bad = run('not json')
    expect(bad.code).toBe(0)
    expect(bad.stderr).toContain('could not check')
    const unknown = run({}, 'nope')
    expect(unknown.code).toBe(0)
    expect(unknown.stderr).toContain('unknown subcommand')
  })

  it('allows a hook call without a file path', () => {
    expect(run({ tool_name: 'Edit', cwd: repo, tool_input: {} })).toEqual({ code: 0, stderr: '' })
  })
})
