/**
 * The distance and long-shot experiments of phase 1.x ticket 20, on top of the
 * game as it plays since ticket 09 (variant a+b+c, D-31): how distance is
 * measured (Chebyshev as today, no diagonals, diagonals alternating 1/2) crossed
 * with the range of the long-shot skills (3 as today, or 2). Nothing here
 * touches data/ or the game's rules: a variant exists only inside a simulator run
 * (the metric through `RangeRules.distanceMetric`, the ranges on a copy of the data).
 */
import { cpus } from 'node:os'
import { Worker } from 'node:worker_threads'
import { GAME_PROFILES } from '@mt/ai'
import { GAME_RANGE_RULES, type DistanceMetric } from '@mt/engine'
import type { GameData } from '@mt/shared'
import { aggregate, type Metrics } from './metrics.ts'
import { RANGE_BOARDS, RANGE_SCENARIOS, meetsTargets, TARGETS } from './ranges.ts'
import { gameSeed, playBattle, summarizeBattle, unitKinds, type GameRecord } from './simulate.ts'
import { sampleThreat, type ThreatSample } from './threat.ts'

export interface DistanceVariant {
  readonly id: string
  readonly label: string
  readonly metric: DistanceMetric
  /** Range of Long Shot, Element Bolt and Pin; Mark is one more, as in a+b+c (3 and 4). */
  readonly shotRange: 2 | 3
}

const METRICS: readonly { id: string; label: string; metric: DistanceMetric }[] = [
  { id: 'cheb', label: 'Chebyshev (today)', metric: 'chebyshev' },
  { id: 'orth', label: 'No diagonals', metric: 'orthogonal' },
  { id: 'alt', label: 'Diagonals 1/2', metric: 'alternating' },
]

/** Today's game first (`cheb-r3`), then shots 3 with the other metrics, then shots 2. */
export const DISTANCE_VARIANTS: readonly DistanceVariant[] = ([3, 2] as const).flatMap((shotRange) =>
  METRICS.map((m) => ({ id: `${m.id}-r${shotRange}`, label: `${m.label}, shots ${shotRange}`, metric: m.metric, shotRange })),
)

export const DISTANCE_BASELINE = 'cheb-r3'

export function distanceVariantById(id: string): DistanceVariant {
  const found = DISTANCE_VARIANTS.find((v) => v.id === id)
  if (found === undefined) throw new Error(`unknown distance variant "${id}" (one of ${DISTANCE_VARIANTS.map((v) => v.id).join(', ')})`)
  return found
}

/** `data` with Long Shot, Element Bolt and Pin at `shotRange` and Mark one more (a copy). Range 3 is what data/ has now. */
export function withShotRange(data: GameData, shotRange: number): GameData {
  const skills: Record<string, GameData['skills'][string]> = { ...data.skills }
  for (const [id, range] of Object.entries({ long_shot: shotRange, element_bolt: shotRange, pin: shotRange, mark: shotRange + 1 })) {
    const skill = data.skills[id]
    if (skill === undefined) throw new Error(`no skill "${id}"`)
    skills[id] = { ...skill, range }
  }
  return { ...data, skills }
}

export interface DistanceJob {
  readonly variant: string
  readonly scenario: string
  readonly board: string
  readonly games: number
  readonly seed: string
}

export interface ThreatSummary {
  /** Mean share of the Board's tiles that were threatened, over every Turn start. */
  readonly threatenedShare: number
  /** The same over the first two Turn starts of a Battle (the opening). */
  readonly openingShare: number
  /** Mean number of safe tiles over every Turn start. */
  readonly safeTiles: number
  readonly tiles: number
  /** Turn starts sampled. */
  readonly samples: number
}

export interface DistanceSetResult extends DistanceJob {
  readonly metrics: Metrics
  readonly threat: ThreatSummary
}

export function summarizeThreat(samples: readonly ThreatSample[]): ThreatSummary {
  const share = (xs: readonly ThreatSample[]) => (xs.length === 0 ? 0 : xs.reduce((a, s) => a + s.threatened / s.tiles, 0) / xs.length)
  return {
    threatenedShare: share(samples),
    openingShare: share(samples.filter((s) => s.turn <= 2)),
    safeTiles: samples.length === 0 ? 0 : samples.reduce((a, s) => a + (s.tiles - s.threatened), 0) / samples.length,
    tiles: samples[0]?.tiles ?? 0,
    samples: samples.length,
  }
}

/** Play one set with the game's AI on both sides, measuring the threat at every Turn start. */
export function runDistanceSet(data: GameData, job: DistanceJob): DistanceSetResult {
  const v = distanceVariantById(job.variant)
  const played = withShotRange(data, v.shotRange)
  const profile = GAME_PROFILES.greedy
  const kinds = unitKinds(played, job.scenario)
  const records: GameRecord[] = []
  const samples: ThreatSample[] = []
  for (let i = 0; i < job.games; i++) {
    const seed = gameSeed(job.seed, i)
    let turn = 0
    const battle = playBattle(
      played,
      {
        scenario: job.scenario,
        board: job.board,
        profiles: { A: profile, B: profile },
        rangeRules: { ...GAME_RANGE_RULES, distanceMetric: v.metric },
        onTurnStart: (state, side) => samples.push(sampleThreat(state, side, ++turn)),
      },
      seed,
    )
    records.push(summarizeBattle(seed, kinds, played.skills, battle.final, battle.actions, battle.events))
  }
  return { ...job, metrics: aggregate(records), threat: summarizeThreat(samples) }
}

export function distanceJobs(games: number, seed: string): DistanceJob[] {
  return DISTANCE_VARIANTS.flatMap((v) => RANGE_SCENARIOS.flatMap((scenario) => RANGE_BOARDS.map((board) => ({ variant: v.id, scenario, board, games, seed }))))
}

/** Run `jobs` on `workers` threads; results in the order of `jobs`. */
export function runDistanceJobs(jobs: readonly DistanceJob[], workers: number, onDone: (result: DistanceSetResult, done: number) => void): Promise<DistanceSetResult[]> {
  const results: (DistanceSetResult | undefined)[] = Array.from({ length: jobs.length })
  let next = 0
  let done = 0
  const count = Math.max(1, Math.min(workers, jobs.length, cpus().length))
  return new Promise((resolve, reject) => {
    let running = count
    for (let i = 0; i < count; i++) {
      const worker = new Worker(new URL('./distanceWorker.ts', import.meta.url))
      const give = () => {
        const index = next++
        if (index >= jobs.length) {
          void worker.terminate()
          if (--running === 0) resolve(results as DistanceSetResult[])
          return
        }
        worker.postMessage({ index, job: jobs[index] })
      }
      worker.on('message', (message: { index: number; result: DistanceSetResult }) => {
        results[message.index] = message.result
        onDone(message.result, ++done)
        give()
      })
      worker.on('error', reject)
      give()
    }
  })
}

// ------------------------------------------------------------------ report

const pct = (x: number) => `${(100 * x).toFixed(1)}%`
const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const setLabel = (r: DistanceJob) => `${r.scenario === 'scenario_1' ? 'S1' : 'S2'} ${r.board}`

/** The tables of the report, Markdown. */
export function distanceTables(results: readonly DistanceSetResult[]): string {
  const byVariant = (id: string) => results.filter((r) => r.variant === id)
  const variants = DISTANCE_VARIANTS.filter((v) => byVariant(v.id).length > 0)
  const L: string[] = []
  L.push('## Summary by variant')
  L.push('')
  L.push(
    `Targets: team A win ${pct(TARGETS.winAMin)}-${pct(TARGETS.winAMax)} and 10-turn limit at most ${pct(TARGETS.limitMax)} in every set. "Threatened" = share of the Board's tiles the side about to play could attack this Turn (Threat zone, exact Move and range, no line of sight), mean over every Turn start; "opening" = the first two Turn starts.`,
  )
  L.push('')
  L.push('| Variant | Sets within targets | A win, lowest-highest | 10-turn limit, highest | Turns before first attack | Threatened tiles | Safe tiles | Threatened, opening | Attack rolls/Battle | Rounds |')
  L.push('|---|---|---|---|---|---|---|---|---|---|')
  for (const v of variants) {
    const sets = byVariant(v.id)
    const wins = sets.map((r) => r.metrics.winA)
    L.push(
      `| ${v.label} (\`${v.id}\`) | ${sets.filter((r) => meetsTargets(r.metrics)).length} / ${sets.length} | ${pct(Math.min(...wins))}-${pct(Math.max(...wins))} | ${pct(Math.max(...sets.map((r) => r.metrics.limit)))} | ${mean(sets.map((r) => r.metrics.turnsBeforeFirstAttack)).toFixed(2)} | ${pct(mean(sets.map((r) => r.threat.threatenedShare)))} | ${mean(sets.map((r) => r.threat.safeTiles)).toFixed(1)} of ${sets[0]?.threat.tiles ?? 0} | ${pct(mean(sets.map((r) => r.threat.openingShare)))} | ${mean(sets.map((r) => r.metrics.attacksPerGame)).toFixed(1)} | ${mean(sets.map((r) => r.metrics.roundsMean)).toFixed(1)} |`,
    )
  }
  L.push('')
  L.push('## Every set')
  L.push('')
  L.push('| Variant | Set | Battles | A win (±SE) | 10-turn limit | Turns before first attack (±SE) | Threatened | Safe tiles | Threatened, opening | Attack rolls/Battle | Rounds | Within targets |')
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|')
  for (const r of results) {
    const m = r.metrics
    L.push(
      `| \`${r.variant}\` | ${setLabel(r)} | ${m.games} | ${pct(m.winA)} ±${pct(m.se.winA)} | ${pct(m.limit)} | ${m.turnsBeforeFirstAttack.toFixed(2)} ±${m.se.turnsBeforeFirstAttack.toFixed(2)} | ${pct(r.threat.threatenedShare)} | ${r.threat.safeTiles.toFixed(1)} | ${pct(r.threat.openingShare)} | ${m.attacksPerGame.toFixed(1)} | ${m.roundsMean.toFixed(1)} | ${meetsTargets(m) ? 'yes' : 'no'} |`,
    )
  }
  L.push('')
  L.push('## Actions per Battle (mean of the four sets)')
  L.push('')
  const names = [...new Set(results.flatMap((r) => Object.keys(r.metrics.skillsPerGame)))].sort()
  L.push(`| Action | ${variants.map((v) => v.id).join(' | ')} |`)
  L.push(`|---|${variants.map(() => '---:').join('|')}|`)
  for (const name of names) L.push(`| ${name} | ${variants.map((v) => mean(byVariant(v.id).map((r) => r.metrics.skillsPerGame[name] ?? 0)).toFixed(2)).join(' | ')} |`)
  L.push('')
  return L.join('\n')
}

// ------------------------------------------------------------------ command

/** `sim distance`: every variant on every set, then the report (Markdown and JSON). */
export async function distanceCommand(opts: {
  readonly data: GameData
  readonly games: number
  readonly seed: string
  readonly workers: number
  readonly only: readonly string[] | undefined
  readonly header: readonly string[]
  readonly log: (line: string) => void
}): Promise<{ readonly md: string; readonly results: DistanceSetResult[]; readonly seconds: number }> {
  const jobs = distanceJobs(opts.games, opts.seed).filter((j) => opts.only === undefined || opts.only.includes(j.variant))
  opts.log(`distance: ${jobs.length} sets of ${opts.games} Battles (${jobs.length * opts.games} in all) on up to ${opts.workers} threads…`)
  const started = Date.now()
  const results = await runDistanceJobs(jobs, opts.workers, (r, done) =>
    opts.log(`distance ${done}/${jobs.length} ${r.variant} ${setLabel(r)}: A ${pct(r.metrics.winA)}, limit ${pct(r.metrics.limit)}, first attack after ${r.metrics.turnsBeforeFirstAttack.toFixed(2)} Turns, threatened ${pct(r.threat.threatenedShare)}`),
  )
  const md = [
    ...opts.header,
    `Variants: ${DISTANCE_VARIANTS.map((v) => `**${v.id}** ${v.label}`).join('; ')}. Baseline \`${DISTANCE_BASELINE}\` is the game as it plays now (ticket 09, a+b+c). Game AI (\`game:greedy\`) on both sides, ${opts.games} Battles per set, sets = Scenario 1/2 x Crossroads/Shallows. Variants never touch data/ or the rules of the game; they exist only inside this run (tools/simulator/src/distanceExperiment.ts).`,
    '',
    distanceTables(results),
  ].join('\n')
  return { md, results, seconds: Math.round((Date.now() - started) / 1000) }
}
