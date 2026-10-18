/**
 * The range experiments of phase 1.x ticket 08: every variant on every
 * Scenario x Board set with the game's AI on both sides, many Battles each,
 * spread over worker threads, and the report that compares them.
 */
import { cpus } from 'node:os'
import { Worker } from 'node:worker_threads'
import { GAME_PROFILES } from '@mt/ai'
import type { GameData } from '@mt/shared'
import { aggregate, type Metrics } from './metrics.ts'
import { simulateGames } from './simulate.ts'
import { applyVariant, RANGE_VARIANTS, variantById } from './variants.ts'

export const RANGE_SCENARIOS = ['scenario_1', 'scenario_2'] as const
export const RANGE_BOARDS = ['crossroads', 'shallows'] as const

/** Targets of the spec (user story 41). */
export const TARGETS = { winAMin: 0.4, winAMax: 0.6, limitMax: 0.15 } as const

export interface RangeJob {
  readonly variant: string
  readonly scenario: string
  readonly board: string
  readonly games: number
  readonly seed: string
}

export interface RangeSetResult extends RangeJob {
  readonly metrics: Metrics
}

/** Play one set: `games` Battles of `job.variant` on `job.scenario` x `job.board`, game AI on both sides. */
export function runRangeSet(data: GameData, job: RangeJob): RangeSetResult {
  const applied = applyVariant(data, variantById(job.variant))
  const profile = GAME_PROFILES.greedy
  const matchup = {
    scenario: job.scenario,
    board: job.board,
    profiles: { A: profile, B: profile },
    rangeRules: applied.rules,
  }
  return { ...job, metrics: aggregate(simulateGames(applied.data, matchup, job.games, job.seed)) }
}

/** Every set of the experiment, in report order. */
export function rangeJobs(games: number, seed: string): RangeJob[] {
  return RANGE_VARIANTS.flatMap((v) =>
    RANGE_SCENARIOS.flatMap((scenario) => RANGE_BOARDS.map((board) => ({ variant: v.id, scenario, board, games, seed }))),
  )
}

/** Run `jobs` on `workers` threads; results in the order of `jobs`. */
export function runRangeJobs(jobs: readonly RangeJob[], workers: number, onDone: (result: RangeSetResult, done: number) => void): Promise<RangeSetResult[]> {
  const results: (RangeSetResult | undefined)[] = Array.from({ length: jobs.length })
  let next = 0
  let done = 0
  const count = Math.max(1, Math.min(workers, jobs.length, cpus().length))
  return new Promise((resolve, reject) => {
    let running = count
    const start = () => {
      const worker = new Worker(new URL('./rangesWorker.ts', import.meta.url))
      const give = () => {
        const index = next++
        if (index >= jobs.length) {
          void worker.terminate()
          if (--running === 0) resolve(results as RangeSetResult[])
          return
        }
        worker.postMessage({ index, job: jobs[index] })
      }
      worker.on('message', (message: { index: number; result: RangeSetResult }) => {
        results[message.index] = message.result
        onDone(message.result, ++done)
        give()
      })
      worker.on('error', reject)
      give()
    }
    for (let i = 0; i < count; i++) start()
  })
}

// ------------------------------------------------------------------ report

const pct = (x: number) => `${(100 * x).toFixed(1)}%`
const setLabel = (r: RangeJob) => `${r.scenario === 'scenario_1' ? 'S1' : 'S2'} ${r.board}`
const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

/** Does a set meet the balance targets? */
export function meetsTargets(m: Metrics): boolean {
  return m.winA >= TARGETS.winAMin && m.winA <= TARGETS.winAMax && m.limit <= TARGETS.limitMax
}

/** The tables of the report, Markdown. */
export function rangeTables(results: readonly RangeSetResult[]): string {
  const byVariant = (id: string) => results.filter((r) => r.variant === id)
  const baseline = byVariant('baseline')
  const baseFirst = baseline.length === 0 ? 0 : mean(baseline.map((r) => r.metrics.turnsBeforeFirstAttack))
  const L: string[] = []
  L.push('## Summary by variant')
  L.push('')
  L.push(`Targets: team A win ${pct(TARGETS.winAMin)}-${pct(TARGETS.winAMax)}, 10-turn limit at most ${pct(TARGETS.limitMax)} in every set, Turns before the first attack higher than the baseline (${baseFirst.toFixed(2)}).`)
  L.push('')
  L.push('| Variant | Sets within targets | A win, lowest-highest | 10-turn limit, highest | Turns before first attack (mean of sets) | vs baseline | Attack rolls per Battle | Rounds (mean of sets) |')
  L.push('|---|---|---|---|---|---|---|---|')
  for (const v of RANGE_VARIANTS) {
    const sets = byVariant(v.id)
    if (sets.length === 0) continue
    const wins = sets.map((r) => r.metrics.winA)
    const first = mean(sets.map((r) => r.metrics.turnsBeforeFirstAttack))
    L.push(
      `| ${v.label} | ${sets.filter((r) => meetsTargets(r.metrics)).length} / ${sets.length} | ${pct(Math.min(...wins))}-${pct(Math.max(...wins))} | ${pct(Math.max(...sets.map((r) => r.metrics.limit)))} | ${first.toFixed(2)} | ${first > baseFirst ? '+' : ''}${(first - baseFirst).toFixed(2)} | ${mean(sets.map((r) => r.metrics.attacksPerGame)).toFixed(1)} | ${mean(sets.map((r) => r.metrics.roundsMean)).toFixed(1)} |`,
    )
  }
  L.push('')
  L.push('## Every set')
  L.push('')
  L.push('| Variant | Set | Battles | A win (±SE) | 10-turn limit | Turns before first attack (±SE) | Attack rolls/Battle | Rounds mean | Within targets |')
  L.push('|---|---|---|---|---|---|---|---|---|')
  for (const r of results) {
    const m = r.metrics
    L.push(
      `| ${variantById(r.variant).label} | ${setLabel(r)} | ${m.games} | ${pct(m.winA)} ±${pct(m.se.winA)} | ${pct(m.limit)} | ${m.turnsBeforeFirstAttack.toFixed(2)} ±${m.se.turnsBeforeFirstAttack.toFixed(2)} | ${m.attacksPerGame.toFixed(1)} | ${m.roundsMean.toFixed(1)} | ${meetsTargets(m) ? 'yes' : 'no'} |`,
    )
  }
  L.push('')
  L.push('## Actions per Battle (mean of the four sets)')
  L.push('')
  const variants = RANGE_VARIANTS.filter((v) => byVariant(v.id).length > 0)
  const names = [...new Set(results.flatMap((r) => Object.keys(r.metrics.skillsPerGame)))].sort()
  L.push(`| Action | ${variants.map((v) => v.id).join(' | ')} |`)
  L.push(`|---|${variants.map(() => '---:').join('|')}|`)
  for (const name of names) {
    L.push(`| ${name} | ${variants.map((v) => mean(byVariant(v.id).map((r) => r.metrics.skillsPerGame[name] ?? 0)).toFixed(2)).join(' | ')} |`)
  }
  L.push('')
  return L.join('\n')
}
