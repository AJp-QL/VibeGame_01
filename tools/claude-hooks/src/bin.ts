/**
 * Claude Code hook entry: `node tools/claude-hooks/src/bin.ts <subcommand>`, hook JSON on stdin.
 *   guard           PreToolUse on Edit|Write|NotebookEdit: exit 0 = allow, exit 2 = block (reason on stderr).
 *   engine-version  Stop: exit 0 = stop, exit 2 = keep going with the ENGINE_VERSION reminder on stderr.
 * Anything unexpected (unknown subcommand, unreadable stdin, missing dependency) exits 0
 * with a warning, so a broken tool never locks a session.
 */
import { readFileSync } from 'node:fs'
import type { HookResult } from './guard.ts'

const failOpen = (message: string): HookResult => ({
  exitCode: 0,
  stderr: `claude-hooks: ${message}; allowed\n`,
  stdout: `${JSON.stringify({ systemMessage: `claude-hooks: ${message}; allowed` })}\n`,
})

let result: HookResult
try {
  const [command] = process.argv.slice(2)
  if (command === 'guard') {
    const { guard } = await import('./guard.ts')
    result = guard(readFileSync(0, 'utf8'))
  } else if (command === 'engine-version') {
    const { engineVersion } = await import('./engineVersion.ts')
    result = engineVersion(readFileSync(0, 'utf8'))
  } else {
    result = failOpen(`unknown subcommand "${command ?? ''}"`)
  }
} catch (e) {
  result = failOpen(e instanceof Error ? e.message : String(e))
}
if (result.stdout) process.stdout.write(result.stdout)
if (result.stderr) process.stderr.write(result.stderr)
process.exitCode = result.exitCode
