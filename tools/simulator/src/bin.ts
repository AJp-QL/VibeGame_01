/** Entry point: `node tools/simulator/src/bin.ts <command> [options]` (usage in cli.ts). */
import { main } from './cli.ts'

try {
  main(process.argv.slice(2))
} catch (e) {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`)
  process.exitCode = 1
}
