import { describe, expect, it } from 'vitest'
import { createBattle, type BattleState, type DistanceMetric } from '@mt/engine'
import { tileFromName, type Tile } from '@mt/shared'
import {
  DISTANCE_BASELINE,
  DISTANCE_VARIANTS,
  distanceJobs,
  distanceTables,
  loadRepoData,
  runDistanceJobs,
  runDistanceSet,
  sampleThreat,
  summarizeThreat,
  threatenedTiles,
  withShotRange,
} from '../src/index.ts'

// Phase 1.x ticket 20: the distance variants, the long-shot ranges and the safe/threatened
// tiles metric. Nothing here may change data/ or the game.

const data = loadRepoData()

function battle(tiles: { A: readonly [string, string, string]; B: readonly [string, string, string] }, distanceMetric?: DistanceMetric): BattleState {
  const toTiles = (names: readonly [string, string, string]) => names.map(tileFromName) as unknown as readonly [Tile, Tile, Tile]
  return createBattle({
    scenario: data.scenarios.scenario_1!,
    board: data.boards.crossroads!,
    species: data.species,
    skills: data.skills,
    statuses: data.statuses,
    elementWheel: data.elementWheel,
    dice: { seed: '0000000000000001' },
    ...(distanceMetric === undefined ? {} : { rangeRules: { distanceMetric } }),
    preset: { tiles: { A: toTiles(tiles.A), B: toTiles(tiles.B) }, firstSide: 'A' },
  })
}

// Team A in one corner, team B in the other.
const TEAMS = { A: ['a1', 'a2', 'b1'], B: ['g7', 'g6', 'f7'] } as const
const LONE = { A: ['g1', 'a1', 'a2'], B: ['g7', 'g6', 'f7'] } as const
const apart = battle(TEAMS)

describe('the threatened-tiles metric (Threat zone)', () => {
  it('counts the tiles within Move + skill range of a side', () => {
    const chebyshev = threatenedTiles(apart, 'A')
    const orthogonal = threatenedTiles(battle(TEAMS, 'orthogonal'), 'A')
    const alternating = threatenedTiles(battle(TEAMS, 'alternating'), 'A')
    // The same Units, fewer tiles the less far a step and a shot carry.
    expect(orthogonal.size).toBeLessThan(alternating.size)
    expect(alternating.size).toBeLessThanOrEqual(chebyshev.size)
    expect(chebyshev.size).toBeGreaterThan(0)
    expect(chebyshev.size).toBeLessThanOrEqual(49)
  })

  it('a stricter metric only ever threatens a subset of the tiles', () => {
    const lone = battle(LONE)
    for (const side of ['A', 'B'] as const) {
      const chebyshev = threatenedTiles(lone, side)
      const alternating = threatenedTiles(battle(LONE, 'alternating'), side)
      const orthogonal = threatenedTiles(battle(LONE, 'orthogonal'), side)
      expect([...orthogonal].every((t) => alternating.has(t))).toBe(true)
      expect([...alternating].every((t) => chebyshev.has(t))).toBe(true)
    }
  })

  it('a sample gives the share of the Board', () => {
    const sample = sampleThreat(apart, 'A', 1)
    expect(sample.tiles).toBe(49)
    expect(sample).toMatchObject({ turn: 1, side: 'A' })
    expect(sample.threatened).toBe(threatenedTiles(apart, 'A').size)
  })

  it('summarizes: mean share, the opening and the mean of safe tiles', () => {
    const s = (turn: number, threatened: number) => ({ turn, side: 'A' as const, threatened, tiles: 49 })
    const summary = summarizeThreat([s(1, 49), s(2, 24.5), s(3, 0), s(4, 0)])
    expect(summary.threatenedShare).toBeCloseTo(0.375)
    expect(summary.openingShare).toBeCloseTo(0.75)
    expect(summary.safeTiles).toBeCloseTo(49 - 18.375)
    expect(summary.samples).toBe(4)
  })
})

describe('the distance variants', () => {
  it('are the baseline plus five, layered on the game of today', () => {
    expect(DISTANCE_VARIANTS.map((v) => v.id)).toEqual(['cheb-r3', 'orth-r3', 'alt-r3', 'cheb-r2', 'orth-r2', 'alt-r2'])
    expect(DISTANCE_BASELINE).toBe('cheb-r3')
  })

  it('shots 3 is data as it is; shots 2 shortens the long shots (Mark one more) on a copy', () => {
    const ranges = (d: typeof data) => ['long_shot', 'element_bolt', 'pin', 'mark'].map((id) => d.skills[id]?.range)
    expect(ranges(withShotRange(data, 3))).toEqual(ranges(data))
    expect(ranges(withShotRange(data, 3))).toEqual([3, 3, 3, 4])
    expect(ranges(withShotRange(data, 2))).toEqual([2, 2, 2, 3])
    expect(ranges(data)).toEqual([3, 3, 3, 4])
  })

  it('every variant plays whole Battles', () => {
    for (const v of DISTANCE_VARIANTS) {
      const set = runDistanceSet(data, { variant: v.id, scenario: 'scenario_1', board: 'crossroads', games: 3, seed: '0' })
      expect(set.metrics.games).toBe(3)
      expect(set.threat.samples).toBeGreaterThan(0)
      expect(set.threat.threatenedShare).toBeGreaterThan(0)
      expect(set.threat.threatenedShare).toBeLessThanOrEqual(1)
    }
  })

  it('the baseline plays the game of today: the same Battles as without any variant', async () => {
    const { simulateGames, aggregate } = await import('../src/index.ts')
    const { GAME_PROFILES } = await import('@mt/ai')
    const { GAME_RANGE_RULES } = await import('@mt/engine')
    const profile = GAME_PROFILES.greedy
    const direct = aggregate(simulateGames(data, { scenario: 'scenario_1', board: 'shallows', profiles: { A: profile, B: profile }, rangeRules: GAME_RANGE_RULES }, 8, '0'))
    const set = runDistanceSet(data, { variant: DISTANCE_BASELINE, scenario: 'scenario_1', board: 'shallows', games: 8, seed: '0' })
    expect(set.metrics).toEqual(direct)
  }, 60000)

  it('jobs and tables: every variant on the four sets, run on worker threads', async () => {
    expect(distanceJobs(5, '0')).toHaveLength(DISTANCE_VARIANTS.length * 4)
    const jobs = distanceJobs(2, '0').filter((j) => j.variant === 'orth-r2')
    const results = await runDistanceJobs(jobs, 2, () => undefined)
    expect(results.map((r) => `${r.scenario}/${r.board}`)).toEqual(jobs.map((j) => `${j.scenario}/${j.board}`))
    const text = distanceTables(results)
    expect(text).toContain('Summary by variant')
    expect(text).toContain('No diagonals, shots 2')
  })
})
