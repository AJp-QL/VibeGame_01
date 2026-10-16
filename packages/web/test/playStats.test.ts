import { describe, expect, it } from 'vitest'
import type { BattleChoice } from '../src/battleChoice.ts'
import { createPlayStats, emptyStats, MAX_BATTLES, STATS_KEY, type StatsStorage } from '../src/playStats.ts'

const AI: BattleChoice = { scenarioId: 'scenario_2', boardId: 'shallows', mode: 'ai', humanSide: 'B' }
const HOTSEAT: BattleChoice = { scenarioId: 'scenario_1', boardId: 'crossroads', mode: 'hotseat', humanSide: 'A' }

/** A Map-backed stand-in for localStorage. */
function memoryStorage(): StatsStorage & { items: Map<string, string> } {
  const items = new Map<string, string>()
  return { items, getItem: (k) => items.get(k) ?? null, setItem: (k, v) => void items.set(k, v) }
}

/** A clock that starts at `start` and moves on by `stepHours` each call. */
function clock(start: string, stepHours = 1) {
  let at = new Date(start).getTime()
  return () => {
    const now = new Date(at)
    at += stepHours * 3600_000
    return now
  }
}

describe('local play stats', () => {
  it('counts app opens, Battles started and finished (mode, Scenario, Board, outcome) and the days played', () => {
    const storage = memoryStorage()
    const stats = createPlayStats(storage, clock('2026-10-16T09:00:00', 20))
    stats.recordAppOpen()
    const first = stats.recordBattleStarted(AI)
    const second = stats.recordBattleStarted(HOTSEAT)
    stats.recordBattleFinished(first, { winner: 'B', cause: 'tamerDown' }, 6)

    const read = stats.read()
    expect(read).toMatchObject({ appOpens: 1, battlesStarted: 2, battlesFinished: 1 })
    // Open 09:00 on the 16th, starts 05:00 on the 17th and 01:00 on the 18th, finish 21:00 on the 18th.
    expect(read.daysPlayed).toEqual(['2026-10-16', '2026-10-17', '2026-10-18'])
    expect(read.battles[first]).toMatchObject({ mode: 'ai', scenarioId: 'scenario_2', boardId: 'shallows', humanSide: 'B', winner: 'B', cause: 'tamerDown', rounds: 6 })
    expect(read.battles[first]?.finishedAt).toBeDefined()
    expect(read.battles[second]).toEqual({ startedAt: read.battles[second]?.startedAt, mode: 'hotseat', scenarioId: 'scenario_1', boardId: 'crossroads' })
    expect(stats.persistent()).toBe(true)

    // Saved in storage: a new visit carries on from there.
    expect(JSON.parse(storage.items.get(STATS_KEY)!)).toEqual(read)
    const again = createPlayStats(storage, clock('2026-10-20T10:00:00'))
    again.recordAppOpen()
    expect(again.read()).toMatchObject({ appOpens: 2, battlesStarted: 2, battlesFinished: 1 })
  })

  it('counts a finished Battle once, even if told twice', () => {
    const stats = createPlayStats(memoryStorage(), clock('2026-10-16T09:00:00'))
    const index = stats.recordBattleStarted(AI)
    stats.recordBattleFinished(index, { winner: null, cause: 'turnLimit' }, 10)
    stats.recordBattleFinished(index, { winner: null, cause: 'turnLimit' }, 10)
    expect(stats.read().battlesFinished).toBe(1)
  })

  it(`keeps the last ${MAX_BATTLES} Battles and still finds the one being played`, () => {
    const stats = createPlayStats(memoryStorage(), clock('2026-10-16T09:00:00', 0))
    let last = -1
    for (let i = 0; i < MAX_BATTLES + 5; i++) last = stats.recordBattleStarted(HOTSEAT)
    stats.recordBattleFinished(last, { winner: 'A', cause: 'monstersDown' }, 4)
    const read = stats.read()
    expect(read.battles).toHaveLength(MAX_BATTLES)
    expect(read.battlesStarted).toBe(MAX_BATTLES + 5)
    expect(read.battles.at(-1)).toMatchObject({ winner: 'A', rounds: 4 })
  })

  it('works without storage: counts for this visit only', () => {
    const stats = createPlayStats(null)
    stats.recordAppOpen()
    stats.recordBattleFinished(stats.recordBattleStarted(AI), { winner: 'A', cause: 'tamerDown' }, 3)
    expect(stats.persistent()).toBe(false)
    expect(stats.read()).toMatchObject({ appOpens: 1, battlesStarted: 1, battlesFinished: 1 })
  })

  it('works when storage throws on read or write (private mode, blocked site data, full quota)', () => {
    const throwing: StatsStorage = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    const stats = createPlayStats(throwing)
    expect(() => stats.recordAppOpen()).not.toThrow()
    expect(stats.read().appOpens).toBe(1)
    expect(stats.persistent()).toBe(false)

    const readable = memoryStorage()
    const writeFails = { ...readable, setItem: throwing.setItem }
    const later = createPlayStats(writeFails)
    expect(() => later.recordBattleStarted(AI)).not.toThrow()
    expect(later.read().battlesStarted).toBe(1)
    expect(later.persistent()).toBe(false)
  })

  it('starts over from empty when the saved stats are unreadable', () => {
    for (const saved of ['not json', '{"format":"other"}', 'null', '{"format":"monster-tactics-play-stats","appOpens":-3}']) {
      const storage = memoryStorage()
      storage.items.set(STATS_KEY, saved)
      expect(createPlayStats(storage).read()).toEqual(emptyStats())
    }
  })
})
