/**
 * Are the Replay files in a folder still playable by this build?
 * `node tools/simulator/src/replays-check.ts [dir]` (default: the Board visual fixtures).
 * Exit 0: all compatible. Exit 3: at least one is stale (engineVersion or dataHash differs).
 * Exit 1: a file cannot be read or is not a Replay. Used by the CI visual job (ticket 26).
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseReplayText } from '@mt/shared'
import { replayCompatibility } from '@mt/engine'
import { loadRepoData, REPO_ROOT } from './data.ts'

const STALE_EXIT_CODE = 3

const dir = process.argv[2] ?? join(REPO_ROOT, 'packages', 'web', 'visual', 'fixtures')
const data = loadRepoData()
let stale = 0
let broken = 0

for (const name of readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
  const parsed = parseReplayText(readFileSync(join(dir, name), 'utf8'))
  if (!parsed.ok) {
    broken++
    process.stdout.write(`${name}: not a Replay: ${parsed.issues.join('; ')}\n`)
    continue
  }
  const result = replayCompatibility(parsed.replay, data)
  if (result.compatible) continue
  stale++
  for (const m of result.mismatches) process.stdout.write(`${name}: ${m.field} is ${m.replay}, this build has ${m.current}\n`)
}

if (broken > 0) process.exitCode = 1
else if (stale > 0) process.exitCode = STALE_EXIT_CODE
else process.stdout.write('all Replay files match this build\n')
