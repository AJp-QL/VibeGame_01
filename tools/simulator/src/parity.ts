/**
 * Parity with sim v4 (ticket 16, decision log 2026-10-16): the sim v4
 * configs played under sim-equivalent conditions, compared with
 * prototype/simulation/results_v4.json.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SIM_PROFILES, type AiMode } from '@mt/ai'
import type { GameData } from '@mt/shared'
import { REPO_ROOT } from './data.ts'
import type { Metrics } from './metrics.ts'
import { simulateGames, type Matchup } from './simulate.ts'
import { aggregate } from './metrics.ts'

export interface ParityConfig {
  /** Key in results_v4.json. */
  readonly label: string
  readonly scenario: string
  readonly modes: Readonly<{ A: AiMode; B: AiMode }>
  /**
   * The rules sim v4 ran this config under match the engine's (variant U4:
   * Command advantage does not cancel a protected Tamer's disadvantage).
   * The rush and neutral configs ran under plain v4 (it does), so they are
   * reported but do not decide the verdict.
   */
  readonly sameRules: boolean
}

export const PARITY_CONFIGS: readonly ParityConfig[] = [
  { label: 'S1 U4', scenario: 'scenario_1', modes: { A: 'greedy', B: 'greedy' }, sameRules: true },
  { label: 'S2 U4', scenario: 'scenario_2', modes: { A: 'greedy', B: 'greedy' }, sameRules: true },
  { label: 'S1 rushA', scenario: 'scenario_1', modes: { A: 'tamer_rush', B: 'greedy' }, sameRules: false },
  { label: 'S1 rushB', scenario: 'scenario_1', modes: { A: 'greedy', B: 'tamer_rush' }, sameRules: false },
  { label: 'S2 rushA', scenario: 'scenario_2', modes: { A: 'tamer_rush', B: 'greedy' }, sameRules: false },
  { label: 'S2 rushB', scenario: 'scenario_2', modes: { A: 'greedy', B: 'tamer_rush' }, sameRules: false },
  { label: 'S1 neutral', scenario: 'scenario_1', modes: { A: 'neutral', B: 'neutral' }, sameRules: false },
  { label: 'S2 neutral', scenario: 'scenario_2', modes: { A: 'neutral', B: 'neutral' }, sameRules: false },
]

/** sim v4 runs on one Board; its terrain is data/boards/crossroads. */
export const PARITY_BOARD = 'crossroads'

/** The sim v4 numbers compared (results_v4.json `results[label]`). */
export interface SimV4Result {
  readonly n: number
  readonly winA: number
  readonly turnsA_mean: number
  readonly turnsB_mean: number
  readonly tamer_first_drop: number
  readonly limit: number
}

export function loadSimV4(path = join(REPO_ROOT, 'prototype/simulation/results_v4.json')): Readonly<Record<string, SimV4Result>> {
  return (JSON.parse(readFileSync(path, 'utf8')) as { results: Record<string, SimV4Result> }).results
}

export interface ParityCheck {
  readonly config: string
  readonly metric: 'A win' | 'Turns A' | 'Turns B' | 'Tamer first down' | '10-turn limit'
  /** Shares as 0–1, turns as Turns. */
  readonly ours: number
  readonly sim: number
  readonly diff: number
  /** ±0.05 for shares (5 pp); 5% of sim's value for turn counts. */
  readonly tolerance: number
  /** Standard error of the difference (both samples). */
  readonly se: number
  readonly pass: boolean
  readonly decides: boolean
}

/** Compare one config's metrics with sim v4's. */
export function compareWithSimV4(config: ParityConfig, ours: Metrics, sim: SimV4Result): ParityCheck[] {
  const shareSe = (oursSe: number, p: number) => Math.sqrt(oursSe ** 2 + (p * (1 - p)) / sim.n)
  // sim v4 kept no spread of turn counts; use ours scaled to its sample size.
  const meanSe = (oursSe: number) => oursSe * Math.sqrt(1 + ours.games / sim.n)
  const share = (metric: ParityCheck['metric'], o: number, s: number, oSe: number): ParityCheck => ({
    config: config.label,
    metric,
    ours: o,
    sim: s,
    diff: o - s,
    tolerance: 0.05,
    se: shareSe(oSe, s),
    pass: Math.abs(o - s) <= 0.05,
    decides: config.sameRules,
  })
  const turns = (metric: ParityCheck['metric'], o: number, s: number, oSe: number): ParityCheck => ({
    config: config.label,
    metric,
    ours: o,
    sim: s,
    diff: o - s,
    tolerance: 0.05 * s,
    se: meanSe(oSe),
    pass: Math.abs(o - s) <= 0.05 * s,
    decides: config.sameRules,
  })
  return [
    share('A win', ours.winA, sim.winA, ours.se.winA),
    turns('Turns A', ours.turnsA, sim.turnsA_mean, ours.se.turnsA),
    turns('Turns B', ours.turnsB, sim.turnsB_mean, ours.se.turnsB),
    share('Tamer first down', ours.tamerFirstDown, sim.tamer_first_drop, ours.se.tamerFirstDown),
    share('10-turn limit', ours.limit, sim.limit, ours.se.limit),
  ]
}

export function parityMatchup(config: ParityConfig): Matchup {
  return { scenario: config.scenario, board: PARITY_BOARD, profiles: { A: SIM_PROFILES[config.modes.A], B: SIM_PROFILES[config.modes.B] } }
}

export interface ParityResult {
  readonly config: ParityConfig
  readonly metrics: Metrics
  readonly checks: readonly ParityCheck[]
}

/** Play every config (sim-equivalent `data`) and compare. */
export function runParity(
  data: GameData,
  options: { games: (c: ParityConfig) => number; seed: string; configs?: readonly ParityConfig[]; simV4?: Readonly<Record<string, SimV4Result>> },
): ParityResult[] {
  const simV4 = options.simV4 ?? loadSimV4()
  return (options.configs ?? PARITY_CONFIGS).map((config) => {
    const sim = simV4[config.label]
    if (sim === undefined) throw new Error(`results_v4 has no "${config.label}"`)
    const metrics = aggregate(simulateGames(data, parityMatchup(config), options.games(config), options.seed))
    return { config, metrics, checks: compareWithSimV4(config, metrics, sim) }
  })
}

const pp = (x: number) => `${x >= 0 ? '+' : ''}${(100 * x).toFixed(1)}`

export function parityTable(results: readonly ParityResult[]): string {
  const L = [
    '| Config | Rules as engine | Metric | Ours | sim v4 | Diff | Tolerance | SE of diff | Diff / SE | Within |',
    '|---|---|---|---|---|---|---|---|---|---|',
  ]
  for (const r of results)
    for (const c of r.checks) {
      const isTurns = c.metric.startsWith('Turns')
      const f = (x: number) => (isTurns ? x.toFixed(2) : `${(100 * x).toFixed(1)}%`)
      const d = isTurns ? `${c.diff >= 0 ? '+' : ''}${c.diff.toFixed(2)}` : `${pp(c.diff)} pp`
      const tol = isTurns ? `±${c.tolerance.toFixed(2)} (5%)` : '±5 pp'
      const se = isTurns ? c.se.toFixed(2) : `${(100 * c.se).toFixed(1)} pp`
      L.push(
        `| ${c.config} | ${c.decides ? 'yes (U4)' : 'no (v4)'} | ${c.metric} | ${f(c.ours)} | ${f(c.sim)} | ${d} | ${tol} | ${se} | ${(c.diff / c.se).toFixed(1)} | ${c.pass ? 'yes' : '**no**'} |`,
      )
    }
  return L.join('\n')
}
