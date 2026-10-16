/**
 * Totals over many Battles: sim.py v4's `aggregate` metric set (shares are
 * 0–1, counts are per Battle) plus standard errors, and Markdown tables.
 */
import type { GameRecord } from './simulate.ts'

export interface Metrics {
  readonly games: number
  readonly winA: number
  readonly winB: number
  readonly draw: number
  /** Battles won by the side that played first. */
  readonly winFirst: number
  readonly firstA: number
  readonly turnsA: number
  readonly turnsB: number
  /** Rounds = the larger of the two sides' Turn counts (sim.py `rounds`). */
  readonly roundsMean: number
  readonly roundsMedian: number
  /** Battles decided at the 10-turn limit. */
  readonly limit: number
  readonly byTamer: number
  readonly byMonsters: number
  /** Battles whose first fallen Unit was a Tamer. */
  readonly tamerFirstDown: number
  /** Share of Battles by the kind of the first Unit to fall ("none" if none fell). */
  readonly firstDown: Readonly<Record<string, number>>
  /** Winner-cause shares, e.g. "A-tamerDown". */
  readonly decidedBySide: Readonly<Record<string, number>>
  readonly tamerADown: number
  readonly tamerBDown: number
  readonly damageByPerGame: Readonly<Record<string, number>>
  readonly attacksPerGame: number
  readonly hitRateByAttacker: Readonly<Record<string, number>>
  readonly hitsTakenPerGame: Readonly<Record<string, number>>
  readonly tamerHitsPerGame: number
  readonly pushesPerGame: number
  /** Uses per Battle by action name, most used first. */
  readonly skillsPerGame: Readonly<Record<string, number>>
  /** Standard errors: of the shares sqrt(p(1−p)/n), of the means sd/sqrt(n). */
  readonly se: {
    readonly winA: number
    readonly limit: number
    readonly tamerFirstDown: number
    readonly turnsA: number
    readonly turnsB: number
  }
}

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 === 1 ? (s[m] ?? 0) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2
}
const seShare = (p: number, n: number) => Math.sqrt((p * (1 - p)) / n)
function seMean(xs: readonly number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1) / xs.length)
}
function sumInto(target: Record<string, number>, from: Readonly<Record<string, number>>) {
  for (const [k, v] of Object.entries(from)) target[k] = (target[k] ?? 0) + v
}
function perGame(totals: Readonly<Record<string, number>>, n: number): Record<string, number> {
  return Object.fromEntries(
    Object.entries(totals)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .map(([k, v]) => [k, v / n]),
  )
}

export function aggregate(records: readonly GameRecord[]): Metrics {
  const n = records.length
  if (n === 0) throw new Error('no games')
  const share = (f: (r: GameRecord) => boolean) => records.filter(f).length / n
  const winA = share((r) => r.winner === 'A')
  const limit = share((r) => r.cause === 'turnLimit')
  const tamerFirstDown = share((r) => r.firstDown === 'Tamer')
  const turnsA = records.map((r) => r.turns.A)
  const turnsB = records.map((r) => r.turns.B)
  const rounds = records.map((r) => Math.max(r.turns.A, r.turns.B))
  const firstDown: Record<string, number> = {}
  const decidedBySide: Record<string, number> = {}
  for (const w of ['A', 'B'] as const)
    for (const c of ['tamerDown', 'monstersDown', 'turnLimit'] as const) decidedBySide[`${w}-${c}`] = share((r) => r.winner === w && r.cause === c)
  const damageBy: Record<string, number> = {}
  const hitsTaken: Record<string, number> = {}
  const skills: Record<string, number> = {}
  const attackN: Record<string, number> = {}
  const attackHit: Record<string, number> = {}
  for (const r of records) {
    const k = r.firstDown ?? 'none'
    firstDown[k] = (firstDown[k] ?? 0) + 1 / n
    sumInto(damageBy, r.damageBy)
    sumInto(hitsTaken, r.hitsTaken)
    sumInto(skills, r.skills)
    for (const [kind, a] of Object.entries(r.attacks)) {
      attackN[kind] = (attackN[kind] ?? 0) + a.n
      attackHit[kind] = (attackHit[kind] ?? 0) + a.hit
    }
  }
  const allAttacks = Object.values(attackN).reduce((a, b) => a + b, 0)
  return {
    games: n,
    winA,
    winB: share((r) => r.winner === 'B'),
    draw: share((r) => r.winner === null),
    winFirst: share((r) => r.winner === r.firstSide),
    firstA: share((r) => r.firstSide === 'A'),
    turnsA: mean(turnsA),
    turnsB: mean(turnsB),
    roundsMean: mean(rounds),
    roundsMedian: median(rounds),
    limit,
    byTamer: share((r) => r.cause === 'tamerDown'),
    byMonsters: share((r) => r.cause === 'monstersDown'),
    tamerFirstDown,
    firstDown,
    decidedBySide,
    tamerADown: share((r) => r.tamerDown.A),
    tamerBDown: share((r) => r.tamerDown.B),
    damageByPerGame: perGame(damageBy, n),
    attacksPerGame: allAttacks / n,
    hitRateByAttacker: Object.fromEntries(Object.entries(attackN).map(([k, v]) => [k, (attackHit[k] ?? 0) / v])),
    hitsTakenPerGame: perGame(hitsTaken, n),
    tamerHitsPerGame: records.reduce((a, r) => a + r.tamerHits, 0) / n,
    pushesPerGame: records.reduce((a, r) => a + r.pushes, 0) / n,
    skillsPerGame: perGame(skills, n),
    se: {
      winA: seShare(winA, n),
      limit: seShare(limit, n),
      tamerFirstDown: seShare(tamerFirstDown, n),
      turnsA: seMean(turnsA),
      turnsB: seMean(turnsB),
    },
  }
}

// ------------------------------------------------------------------ Markdown

const pct = (x: number) => `${(100 * x).toFixed(1)}%`
const num = (x: number, d = 1) => x.toFixed(d)

export const KINDS = ['Tamer', 'Fangrel', 'Wispling', 'Tidewall', 'Quillfox'] as const

/** One labelled result for the tables. */
export interface LabelledMetrics {
  readonly label: string
  readonly metrics: Metrics
}

/** Outcome, damage/hits and first-down tables (the sim v4 report's columns). */
export function metricsTables(rows: readonly LabelledMetrics[]): string {
  const L: string[] = []
  L.push('| Config | Games | A win (±SE) | B win | Draw | First-mover win | Rounds mean/median | Turns A / B | 10-turn limit | Tamer first down | By Tamer kill | By monsters | By limit |')
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
  for (const { label, metrics: m } of rows) {
    L.push(
      `| ${label} | ${m.games} | ${pct(m.winA)} (±${num(100 * m.se.winA)}) | ${pct(m.winB)} | ${pct(m.draw)} | ${pct(m.winFirst)} | ` +
        `${num(m.roundsMean)} / ${num(m.roundsMedian, 0)} | ${num(m.turnsA, 2)} / ${num(m.turnsB, 2)} | ${pct(m.limit)} | ${pct(m.tamerFirstDown)} | ` +
        `${pct(m.byTamer)} | ${pct(m.byMonsters)} | ${pct(m.limit)} |`,
    )
  }
  L.push('')
  L.push(`| Config | ${KINDS.map((k) => `Dmg by ${k}`).join(' | ')} | ${KINDS.map((k) => `Hits on ${k}`).join(' | ')} | Tamer hits/game | Shield Bash pushes/game |`)
  L.push(`|---|${KINDS.map(() => '---').join('|')}|${KINDS.map(() => '---').join('|')}|---|---|`)
  for (const { label, metrics: m } of rows) {
    L.push(
      `| ${label} | ${KINDS.map((k) => num(m.damageByPerGame[k] ?? 0)).join(' | ')} | ${KINDS.map((k) => num(m.hitsTakenPerGame[k] ?? 0, 2)).join(' | ')} | ` +
        `${num(m.tamerHitsPerGame, 2)} | ${num(m.pushesPerGame, 2)} |`,
    )
  }
  L.push('')
  L.push(`| Config | ${[...KINDS, 'none'].map((k) => `First down: ${k}`).join(' | ')} | Tamer A fell | Tamer B fell |`)
  L.push(`|---|${[...KINDS, 'none'].map(() => '---').join('|')}|---|---|`)
  for (const { label, metrics: m } of rows) {
    L.push(`| ${label} | ${[...KINDS, 'none'].map((k) => pct(m.firstDown[k] ?? 0)).join(' | ')} | ${pct(m.tamerADown)} | ${pct(m.tamerBDown)} |`)
  }
  return L.join('\n')
}

/** Uses per Battle of every action name seen in any row. */
export function skillTable(rows: readonly LabelledMetrics[]): string {
  const names = [...new Set(rows.flatMap((r) => Object.keys(r.metrics.skillsPerGame)))].sort()
  const L = [`| Action | ${rows.map((r) => r.label).join(' | ')} |`, `|---|${rows.map(() => '---:').join('|')}|`]
  for (const name of names) L.push(`| ${name} | ${rows.map((r) => num(r.metrics.skillsPerGame[name] ?? 0, 2)).join(' | ')} |`)
  return L.join('\n')
}
