/**
 * Ownership guard (PreToolUse on Edit|Write|NotebookEdit): before Claude edits a
 * file in this repo, check the file's branch and category with the same rules as
 * CI's path check (`@mt/path-check`). Outside any git repo the edit passes.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { branchOwner, checkPaths, loadOwnership, OWNERSHIP_FILE } from '@mt/path-check'

export type HookResult = { exitCode: 0 | 2; stderr: string; stdout?: string }

const ALLOW: HookResult = { exitCode: 0, stderr: '' }

/** Fail open: allow, tell Claude on stderr and the user through `systemMessage`. */
function warn(message: string): HookResult {
  const text = `ownership guard could not check this edit, so it is allowed: ${message}`
  return { exitCode: 0, stderr: `${text}\n`, stdout: `${JSON.stringify({ systemMessage: text })}\n` }
}

const block = (message: string): HookResult => ({ exitCode: 2, stderr: `${message}\n` })

class OutsideRepo extends Error {}

function git(dir: string, ...args: string[]): string {
  try {
    return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (e) {
    const stderr = String((e as { stderr?: unknown }).stderr ?? '')
    if (/not a git repository/i.test(stderr)) throw new OutsideRepo()
    throw e
  }
}

/**
 * Repo root and repo-relative path (forward slashes) of a file that may not exist
 * yet. Git resolves from the nearest existing directory, so worktrees, drive-letter
 * case and Windows short names all come out the way git sees them.
 */
function locate(file: string, cwd: string): { root: string; rel: string } {
  let dir = dirname(resolve(cwd, file.replace(/\\/g, '/')))
  const rest = [basename(file.replace(/\\/g, '/'))]
  while (!existsSync(dir)) {
    const up = dirname(dir)
    if (up === dir) break
    rest.unshift(basename(dir))
    dir = up
  }
  const [root = '', prefix = ''] = git(dir, 'rev-parse', '--show-toplevel', '--show-prefix').split(/\r?\n/)
  return { root, rel: prefix + rest.join('/') }
}

export function guard(stdin: string): HookResult {
  try {
    const input = JSON.parse(stdin) as { cwd?: unknown; tool_input?: { file_path?: unknown; notebook_path?: unknown } }
    const file = input.tool_input?.file_path ?? input.tool_input?.notebook_path
    if (typeof file !== 'string' || file === '') return ALLOW
    const cwd = typeof input.cwd === 'string' ? input.cwd : process.cwd()

    let where: { root: string; rel: string }
    try {
      where = locate(file, cwd)
    } catch (e) {
      if (e instanceof OutsideRepo) return ALLOW
      throw e
    }
    const { root, rel } = where
    const map = loadOwnership(root)
    const branch = git(root, 'branch', '--show-current').trim()

    if (branchOwner(branch) !== 'claude') {
      return block(
        `Blocked by the ownership guard: ${rel} is in a checkout on ${branch ? `branch "${branch}"` : 'a detached HEAD'}. ` +
          'Claude edits only on a claude/* branch: create a git worktree from origin/main on the ticket branch ' +
          '(claude/<code>-<NN>-<slug>, or claude/<research|spec|docs|chore>-<slug>) and edit there (AGENTS.md, Workflow).',
      )
    }
    const result = checkPaths(map, branch, [rel])
    if (result.status !== 'fail') return ALLOW
    const category = result.offending[0]?.category ?? null
    if (category === null) {
      return block(
        `Blocked by the ownership guard: ${rel} is not classified in ${OWNERSHIP_FILE}. ` +
          `Add a glob for it to ${OWNERSHIP_FILE} first (a Claude-only change), or put the file under an existing path.`,
      )
    }
    return block(
      `Blocked by the ownership guard: ${rel} is a ${category} path (${OWNERSHIP_FILE}), which claude/* branches may not change. ` +
        'Do not edit it; write a ticket with "Owner: codex" under .scratch/<feature>/issues/ that describes the change instead.',
    )
  } catch (e) {
    return warn(e instanceof Error ? e.message : String(e))
  }
}
