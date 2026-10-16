/**
 * CI entry point: `node tools/path-check/src/bin.ts --branch <name> --base <ref> [--tag]`
 * Diffs `<base>...HEAD` (merge base with the base branch, renames split into
 * delete + add so both paths are checked) and checks the changed files against
 * `.github/ownership.json`. Exit code 1 on failure.
 */
import { execFileSync } from 'node:child_process'
import { parseArgs } from 'node:util'
import { checkPaths, formatResult, loadOwnership } from './index.ts'

const { values } = parseArgs({
  options: {
    branch: { type: 'string' },
    base: { type: 'string', default: 'origin/main' },
    tag: { type: 'boolean', default: false },
  },
})

try {
  if (!values.branch) throw new Error('missing --branch')
  const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim()
  const root = git('rev-parse', '--show-toplevel')
  const map = loadOwnership(root)
  const skip = values.tag || values.branch === 'main'
  const files = skip ? [] : git('diff', '--name-only', '--no-renames', '-z', `${values.base}...HEAD`).split('\0')
  const result = checkPaths(map, values.branch, files, { isTag: values.tag })
  console.log(formatResult(result))
  if (result.status === 'fail') process.exitCode = 1
} catch (e) {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`)
  process.exitCode = 1
}
