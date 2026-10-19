/** A worker thread of `sim distance`: plays the sets it is given (phase 1.x ticket 20). */
import { parentPort } from 'node:worker_threads'
import { loadRepoData } from './data.ts'
import { runDistanceSet, type DistanceJob } from './distanceExperiment.ts'

const data = loadRepoData()

parentPort?.on('message', (message: { index: number; job: DistanceJob }) => {
  parentPort?.postMessage({ index: message.index, result: runDistanceSet(data, message.job) })
})
