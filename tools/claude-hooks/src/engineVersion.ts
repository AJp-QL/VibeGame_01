/**
 * ENGINE_VERSION reminder (Stop): when Claude is about to end a turn, compare the
 * checkout with its merge-base on origin/main (committed, staged, unstaged and
 * untracked files). Engine source or data/ changed without the ENGINE_VERSION
 * file → exit 2 with a reminder, once per stop (`stop_hook_active` keeps it silent).
 * Outside any git repo it stays silent.
 */
import { execFileSync } from 'node:child_process'
import type { HookResult } from './guard.ts'

export const VERSION_FILE = 'packages/engine/src/version.ts'
const BASE_REF = 'origin/main'

const PASS: HookResult = { exitCode: 0, stderr: '' }

/** Fail open: pass, tell Claude on stderr and the user through `systemMessage`. */
function warn(message: string): HookResult {
  const text = `ENGINE_VERSION reminder could not check this branch, so it stays silent: ${message}`
  return { exitCode: 0, stderr: `${text}\n`, stdout: `${JSON.stringify({ systemMessage: text })}\n` }
}

class OutsideRepo extends Error {}

function git(dir: string, ...args: string[]): string {
  try {
    return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (e) {
    const stderr = String((e as { stderr?: unknown }).stderr ?? '')
    if (/not a git repository/i.test(stderr)) throw new OutsideRepo()
    // Only ever reaches warn() (exit 0): on Stop, exit 2 with missing-file text would be dropped as an error.
    throw new Error(`git ${args[0]} failed: ${stderr.trim().split(/\r?\n/)[0] ?? ''}`)
  }
}

const isDoc = (file: string) => file.endsWith('.md')
/** Engine code that runs in a battle: packages/engine/src, minus tests and docs. */
const isEngineSource = (file: string) =>
  file.startsWith('packages/engine/src/') && !isDoc(file) && !/\.test\.[cm]?[jt]sx?$/.test(file)
/** Game data; the README files do not feed `dataHash`. */
const isData = (file: string) => file.startsWith('data/') && !isDoc(file)

function changedFiles(root: string): string[] {
  let base: string
  try {
    base = git(root, 'merge-base', 'HEAD', BASE_REF).trim()
  } catch {
    throw new Error(`no merge-base with ${BASE_REF} (missing ref or shallow clone?)`)
  }
  const split = (out: string) => out.split('\0').filter((f) => f !== '')
  return [
    ...split(git(root, 'diff', '--name-only', '-z', '--no-renames', base)),
    ...split(git(root, 'ls-files', '--others', '--exclude-standard', '-z')),
  ]
}

function list(files: string[]): string {
  const shown = files.slice(0, 5).join(', ')
  return files.length > 5 ? `${shown} and ${files.length - 5} more` : shown
}

export function engineVersion(stdin: string): HookResult {
  try {
    const input = JSON.parse(stdin) as { cwd?: unknown; stop_hook_active?: unknown }
    if (input.stop_hook_active === true) return PASS
    const cwd = typeof input.cwd === 'string' ? input.cwd : process.cwd()

    let root: string
    try {
      root = git(cwd, 'rev-parse', '--show-toplevel').trim()
    } catch (e) {
      if (e instanceof OutsideRepo) return PASS
      throw e
    }
    const files = changedFiles(root)
    if (files.includes(VERSION_FILE)) return PASS
    const engine = files.filter(isEngineSource)
    const data = files.filter(isData)
    if (engine.length === 0 && data.length === 0) return PASS

    const lines = [`ENGINE_VERSION reminder: this branch changes ${list([...engine, ...data])} but not ${VERSION_FILE}.`]
    if (engine.length > 0) {
      lines.push(
        'If the engine change can make the same data, Dice Seed and actions give a different result ' +
          '(state, events, dice order, accepted or rejected actions), bump ENGINE_VERSION (0.x: minor) ' +
          'in the same commit as the rules change. A pure refactor needs no bump.',
      )
    }
    if (data.length > 0) {
      lines.push('A data/ change changes the data hash; bump ENGINE_VERSION only if engine behaviour changed too.')
    }
    lines.push(
      'A bump or a data/ change makes the visual fixtures stale: list the follow-up ticket "refresh visual fixtures and baselines" ' +
        '(Owner: codex, Blocked by: this ticket) in the PR (AGENTS.md, ENGINE_VERSION). ' +
        'If none of this applies, say why and finish; this reminder fires once per stop.',
    )
    return { exitCode: 2, stderr: `${lines.join('\n')}\n` }
  } catch (e) {
    return warn(e instanceof Error ? e.message : String(e))
  }
}
