/** Entry point: `node tools/simulator/src/bin.ts <command> [options]` (usage in cli.ts). */
import { main } from './cli.ts'

main(process.argv.slice(2)).catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`)
  process.exitCode = 1
})
