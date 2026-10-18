/** A worker thread of `sim ranges`: plays the sets it is given (phase 1.x ticket 08). */
import { parentPort } from 'node:worker_threads'
import { loadRepoData } from './data.ts'
import { runRangeSet, type RangeJob } from './ranges.ts'

const data = loadRepoData()

parentPort?.on('message', (message: { index: number; job: RangeJob }) => {
  parentPort?.postMessage({ index: message.index, result: runRangeSet(data, message.job) })
})
