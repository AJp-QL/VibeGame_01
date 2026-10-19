/**
 * The 9x9 vs 7x7 report of phase 1.x ticket 15: the game as it ships (variant
 * abc = the range rules the game plays with) on every Scenario x Board set of
 * data/, game AI on both sides, many Battles each. Sets run on the worker
 * threads of `sim ranges`.
 */
import { boardSize, type GameData } from '@mt/shared'
import { meetsTargets, RANGE_SCENARIOS, TARGETS, type RangeJob, type RangeSetResult } from './ranges.ts'

/** Board ids of `data` smallest first, then by id. */
export function boardIdsBySize(data: GameData): string[] {
  return Object.values(data.boards)
    .sort((a, b) => boardSize(a) - boardSize(b) || a.id.localeCompare(b.id))
    .map((b) => b.id)
}

export function boardJobs(data: GameData, games: number, seed: string): RangeJob[] {
  return RANGE_SCENARIOS.flatMap((scenario) => boardIdsBySize(data).map((board) => ({ variant: 'abc', scenario, board, games, seed })))
}

const pct = (x: number) => `${(100 * x).toFixed(1)}%`
const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

export function boardTables(data: GameData, results: readonly RangeSetResult[]): string {
  const size = (board: string) => boardSize(data.boards[board]!)
  const L: string[] = []
  L.push('## Summary by Board size')
  L.push('')
  L.push(`Targets: team A win ${pct(TARGETS.winAMin)}-${pct(TARGETS.winAMax)}, 10-turn limit at most ${pct(TARGETS.limitMax)} in every set.`)
  L.push('')
  L.push('| Size | Sets within targets | A win, lowest-highest | 10-turn limit, highest | Turns before first attack (mean of sets) | Attack rolls per Battle | Rounds (mean of sets) |')
  L.push('|---|---|---|---|---|---|---|')
  for (const n of [...new Set(results.map((r) => size(r.board)))].sort((a, b) => a - b)) {
    const sets = results.filter((r) => size(r.board) === n)
    const wins = sets.map((r) => r.metrics.winA)
    L.push(
      `| ${n}x${n} | ${sets.filter((r) => meetsTargets(r.metrics)).length} / ${sets.length} | ${pct(Math.min(...wins))}-${pct(Math.max(...wins))} | ${pct(Math.max(...sets.map((r) => r.metrics.limit)))} | ${mean(sets.map((r) => r.metrics.turnsBeforeFirstAttack)).toFixed(2)} | ${mean(sets.map((r) => r.metrics.attacksPerGame)).toFixed(1)} | ${mean(sets.map((r) => r.metrics.roundsMean)).toFixed(1)} |`,
    )
  }
  L.push('')
  L.push('## Every set')
  L.push('')
  L.push('| Set | Size | Battles | A win (±SE) | 10-turn limit | Turns before first attack (±SE) | Attack rolls/Battle | Rounds mean | Within targets |')
  L.push('|---|---|---|---|---|---|---|---|---|')
  for (const r of results) {
    const m = r.metrics
    L.push(
      `| ${r.scenario === 'scenario_1' ? 'S1' : 'S2'} ${r.board} | ${size(r.board)}x${size(r.board)} | ${m.games} | ${pct(m.winA)} ±${pct(m.se.winA)} | ${pct(m.limit)} | ${m.turnsBeforeFirstAttack.toFixed(2)} ±${m.se.turnsBeforeFirstAttack.toFixed(2)} | ${m.attacksPerGame.toFixed(1)} | ${m.roundsMean.toFixed(1)} | ${meetsTargets(m) ? 'yes' : 'no'} |`,
    )
  }
  L.push('')
  return L.join('\n')
}
