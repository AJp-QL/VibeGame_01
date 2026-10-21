import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Drives the bin the way Claude Code does: Stop hook JSON on stdin, verdict in the exit code and stderr.
const BIN = fileURLToPath(new URL('../src/bin.ts', import.meta.url))

let tmp: string
let repo: string // on main, with refs/remotes/origin/main at the first commit
let noBase: string // separate repo without origin/main
let outside: string // not a git repo
let cases = 0

function git(cwd: string, ...args: string[]) {
  execFileSync('git', args, { cwd, stdio: 'pipe' })
}

function write(dir: string, file: string, text = `${file}\n`) {
  mkdirSync(dirname(join(dir, file)), { recursive: true })
  writeFileSync(join(dir, file), text)
}

function initRepo(dir: string) {
  mkdirSync(dir, { recursive: true })
  git(dir, 'init', '-q', '-b', 'main')
  git(dir, 'config', 'user.name', 'engine-version test')
  git(dir, 'config', 'user.email', 'engine-version@test.invalid')
  git(dir, 'config', 'commit.gpgsign', 'false')
  write(dir, '.gitignore', '.claude/worktrees/\n')
  for (const file of [
    'packages/engine/src/attack.ts',
    'packages/engine/src/version.ts',
    'packages/engine/test/attack.test.ts',
    'packages/engine/README.md',
    'data/skills/bite.json',
    'data/README.md',
    'tools/x.ts',
  ]) {
    write(dir, file)
  }
  git(dir, 'add', '.')
  git(dir, 'commit', '-q', '-m', 'init')
}

/** A fresh worktree on its own branch from main, so each case has its own changes. */
function branch(): string {
  const dir = join(repo, '.claude', 'worktrees', `case-${++cases}`)
  git(repo, 'worktree', 'add', '-q', '-b', `claude/x-${cases}-case`, dir, 'main')
  return dir
}

function commit(dir: string, ...files: string[]) {
  for (const file of files) write(dir, file, `${file} changed\n`)
  git(dir, 'add', '.')
  git(dir, 'commit', '-q', '-m', 'change')
}

function run(input: unknown) {
  const stdin = typeof input === 'string' ? input : JSON.stringify(input)
  const r = spawnSync(process.execPath, [BIN, 'engine-version'], { input: stdin, encoding: 'utf8' })
  return { code: r.status, stderr: r.stderr }
}

const stop = (cwd: string, stopHookActive = false) =>
  run({ hook_event_name: 'Stop', cwd, stop_hook_active: stopHookActive, last_assistant_message: 'done' })

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'mt-engine-version-'))
  repo = join(tmp, 'repo')
  initRepo(repo)
  git(repo, 'update-ref', 'refs/remotes/origin/main', 'main')
  noBase = join(tmp, 'no-base')
  initRepo(noBase)
  outside = join(tmp, 'outside')
  mkdirSync(outside)
}, 60_000)

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true })
})

describe('engine-version reminds', { timeout: 60_000 }, () => {
  it('when committed engine source changed without ENGINE_VERSION', () => {
    const dir = branch()
    commit(dir, 'packages/engine/src/attack.ts')
    const r = stop(dir)
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('packages/engine/src/attack.ts')
    expect(r.stderr).toContain('ENGINE_VERSION')
    expect(r.stderr).toContain('same commit')
    expect(r.stderr).toContain('refresh visual fixtures and baselines')
    expect(r.stderr).toContain('Owner: codex')
  })

  it('when only data/ changed, without asking for a bump for the data alone', () => {
    const dir = branch()
    commit(dir, 'data/skills/bite.json')
    const r = stop(dir)
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('data/skills/bite.json')
    expect(r.stderr).toContain('data hash')
    expect(r.stderr).toContain('refresh visual fixtures and baselines')
  })

  it('when an engine change is only uncommitted, staged or untracked', () => {
    const unstaged = branch()
    write(unstaged, 'packages/engine/src/attack.ts', 'edited\n')
    expect(stop(unstaged).code).toBe(2)

    const staged = branch()
    write(staged, 'packages/engine/src/attack.ts', 'edited\n')
    git(staged, 'add', '.')
    expect(stop(staged).code).toBe(2)

    const untracked = branch()
    write(untracked, 'packages/engine/src/newRule.ts')
    const r = stop(untracked)
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('packages/engine/src/newRule.ts')
  })
})

describe('engine-version stays silent', { timeout: 60_000 }, () => {
  it('when ENGINE_VERSION changed too, committed or not', () => {
    const committed = branch()
    commit(committed, 'packages/engine/src/attack.ts', 'packages/engine/src/version.ts', 'data/skills/bite.json')
    expect(stop(committed)).toEqual({ code: 0, stderr: '' })

    const uncommitted = branch()
    commit(uncommitted, 'packages/engine/src/attack.ts')
    write(uncommitted, 'packages/engine/src/version.ts', 'bumped\n')
    expect(stop(uncommitted)).toEqual({ code: 0, stderr: '' })
  })

  it('when only engine tests, docs or other paths changed', () => {
    const dir = branch()
    commit(dir, 'packages/engine/test/attack.test.ts', 'packages/engine/README.md', 'data/README.md', 'tools/x.ts')
    write(dir, 'packages/engine/src/NOTES.md')
    expect(stop(dir)).toEqual({ code: 0, stderr: '' })
  })

  it('when stop_hook_active is true, so it can never loop', () => {
    const dir = branch()
    commit(dir, 'packages/engine/src/attack.ts')
    expect(stop(dir).code).toBe(2)
    expect(stop(dir, true)).toEqual({ code: 0, stderr: '' })
  })

  it('outside any git repo', () => {
    expect(stop(outside)).toEqual({ code: 0, stderr: '' })
  })
})

describe('engine-version fails open', { timeout: 60_000 }, () => {
  it('passes with a warning when origin/main is missing', () => {
    const r = stop(noBase)
    expect(r.code).toBe(0)
    expect(r.stderr).toContain('could not check')
    expect(r.stderr).toContain('origin/main')
  })

  it('passes with a warning on unreadable stdin', () => {
    const r = run('not json')
    expect(r.code).toBe(0)
    expect(r.stderr).toContain('could not check')
  })
})
