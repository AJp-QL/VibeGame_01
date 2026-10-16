import type { BattleOutcome } from '@mt/engine'
import type { BattleChoice } from './battleChoice.ts'

/**
 * The playtester's local play stats (ticket 17): app opens, Battles started
 * and finished, and the days played. Kept in browser storage only and never
 * sent anywhere; they leave the device only inside a file the player saves
 * (an exported Replay's `meta.stats`, or the stats file from the menu).
 *
 * Storage may be missing or throw (private mode, blocked site data, full
 * quota): every read and write is wrapped, and the counts then live in memory
 * for this visit only, so the game always works.
 */

/** One Battle as the stats see it. */
export interface BattleRecord {
  readonly startedAt: string
  readonly mode: BattleChoice['mode']
  readonly scenarioId: string
  readonly boardId: string
  /** Against the AI: the human's team. */
  readonly humanSide?: BattleChoice['humanSide']
  readonly finishedAt?: string
  readonly winner?: BattleOutcome['winner']
  readonly cause?: BattleOutcome['cause']
  readonly rounds?: number
}

export interface PlayStats {
  readonly format: 'monster-tactics-play-stats'
  readonly version: 1
  readonly appOpens: number
  readonly battlesStarted: number
  readonly battlesFinished: number
  /** Local dates (YYYY-MM-DD) the game was opened on, oldest first. */
  readonly daysPlayed: readonly string[]
  /** The most recent Battles, oldest first (at most MAX_BATTLES). */
  readonly battles: readonly BattleRecord[]
}

/** The part of the Web Storage API the stats use. */
export interface StatsStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const STATS_KEY = 'monster-tactics.play-stats.v1'
export const MAX_BATTLES = 200

export function emptyStats(): PlayStats {
  return {
    format: 'monster-tactics-play-stats',
    version: 1,
    appOpens: 0,
    battlesStarted: 0,
    battlesFinished: 0,
    daysPlayed: [],
    battles: [],
  }
}

/** `window.localStorage`, or null where reading it throws or it does not exist. */
export function browserStorage(): StatsStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** The local calendar date of `at`, as YYYY-MM-DD. */
export function localDay(at: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
}

const count = (value: unknown) => (typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0)

/** Stats read back from storage; anything unreadable starts from empty. */
function parseStats(text: string | null): PlayStats {
  if (text === null) return emptyStats()
  try {
    const raw = JSON.parse(text) as Partial<PlayStats> | null
    if (raw === null || typeof raw !== 'object' || raw.format !== 'monster-tactics-play-stats') return emptyStats()
    return {
      ...emptyStats(),
      appOpens: count(raw.appOpens),
      battlesStarted: count(raw.battlesStarted),
      battlesFinished: count(raw.battlesFinished),
      daysPlayed: Array.isArray(raw.daysPlayed) ? raw.daysPlayed.filter((d) => typeof d === 'string') : [],
      battles: Array.isArray(raw.battles) ? raw.battles.filter((b) => b !== null && typeof b === 'object') : [],
    }
  } catch {
    return emptyStats()
  }
}

export interface PlayStatsStore {
  /** The stats now (what an export would contain). */
  read(): PlayStats
  /** Whether the stats are being saved on this device (false: this visit only). */
  persistent(): boolean
  recordAppOpen(): void
  /** A Battle began; returns its index for `recordBattleFinished`. */
  recordBattleStarted(choice: BattleChoice): number
  recordBattleFinished(index: number, outcome: BattleOutcome, rounds: number): void
}

export function createPlayStats(storage: StatsStorage | null, now: () => Date = () => new Date()): PlayStatsStore {
  let saving = storage !== null
  let stats = emptyStats()
  if (storage !== null) {
    try {
      stats = parseStats(storage.getItem(STATS_KEY))
    } catch {
      saving = false
    }
  }

  function save(next: PlayStats): void {
    stats = next
    if (!saving || storage === null) return
    try {
      storage.setItem(STATS_KEY, JSON.stringify(next))
    } catch {
      // Quota or blocked storage: keep counting in memory.
      saving = false
    }
  }

  function withDay(days: readonly string[], at: Date): readonly string[] {
    const day = localDay(at)
    return days.includes(day) ? days : [...days, day]
  }

  return {
    read: () => stats,
    persistent: () => saving,
    recordAppOpen() {
      save({ ...stats, appOpens: stats.appOpens + 1, daysPlayed: withDay(stats.daysPlayed, now()) })
    },
    recordBattleStarted(choice) {
      const at = now()
      const record: BattleRecord = {
        startedAt: at.toISOString(),
        mode: choice.mode,
        scenarioId: choice.scenarioId,
        boardId: choice.boardId,
        ...(choice.mode === 'ai' ? { humanSide: choice.humanSide } : {}),
      }
      const battles = [...stats.battles, record].slice(-MAX_BATTLES)
      save({ ...stats, battlesStarted: stats.battlesStarted + 1, daysPlayed: withDay(stats.daysPlayed, at), battles })
      return stats.battlesStarted - 1
    },
    recordBattleFinished(index, outcome, rounds) {
      // The record's place in `battles` (older ones may have been dropped).
      const position = stats.battles.length - (stats.battlesStarted - index)
      const record = stats.battles[position]
      if (record === undefined || record.finishedAt !== undefined) return
      const at = now()
      const finished: BattleRecord = {
        ...record,
        finishedAt: at.toISOString(),
        winner: outcome.winner,
        cause: outcome.cause,
        rounds,
      }
      const battles = stats.battles.map((b, i) => (i === position ? finished : b))
      save({ ...stats, battlesFinished: stats.battlesFinished + 1, daysPlayed: withDay(stats.daysPlayed, at), battles })
    },
  }
}

/** The stats as a file the player saves from the menu. */
export function statsFileName(at: Date): string {
  return `monster-tactics-stats-${localDay(at)}.json`
}
