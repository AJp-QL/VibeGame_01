import { describe, expect, it } from 'vitest'
import { GAME_PROFILES } from '@mt/ai'
import { GAME_RANGE_RULES, type BattleEvent } from '@mt/engine'
import {
  aggregate,
  applyVariant,
  loadRepoData,
  meetsTargets,
  parseArgs,
  RANGE_VARIANTS,
  rangeJobs,
  rangeTables,
  runRangeJobs,
  runRangeSet,
  simulateGames,
  summarizeBattle,
  variantById,
  type GameRecord,
} from '../src/index.ts'

// Phase 1.x ticket 08: the range variants, the new metric and the runner. Nothing here
// may change data/ or the game: a variant only lives inside a simulator run.

const data = loadRepoData()

describe('Turns before the first attack', () => {
  const kinds = new Map([['A.m1', 'Fangrel'], ['B.m1', 'Tidewall']])
  const end = { outcome: { winner: 'A', cause: 'turnLimit' } as never, turnNumber: { A: 3, B: 3 }, round: 3, damageDealt: { A: 0, B: 0 } }
  const record = (events: unknown[]): GameRecord => summarizeBattle('s', kinds, data.skills, end, [], [{ type: 'initiativeDecided', firstSide: 'A' }, ...events] as BattleEvent[])
  const turn = (n: number) => ({ type: 'turnStarted', side: n % 2 === 1 ? 'A' : 'B', turn: Math.ceil(n / 2), round: Math.ceil(n / 2) })
  const attack = { type: 'attackRolled', attacker: 'A.m1', target: 'B.m1', hit: false }

  it('0 when the first attack roll is in the very first Turn', () => {
    expect(record([turn(1), attack]).turnsBeforeFirstAttack).toBe(0)
  })

  it('counts the Turns that were over before the Turn of the first attack roll', () => {
    expect(record([turn(1), turn(2), turn(3), attack, turn(4), attack]).turnsBeforeFirstAttack).toBe(2)
  })

  it('a reroll or a later attack does not move it', () => {
    expect(record([turn(1), turn(2), attack, { type: 'attackRolled', attacker: 'A.m1', target: 'B.m1', hit: true, rerolled: true }, turn(3), attack]).turnsBeforeFirstAttack).toBe(1)
  })

  it('a Battle with no attack roll counts every Turn it had', () => {
    expect(record([turn(1), turn(2), turn(3)]).turnsBeforeFirstAttack).toBe(3)
  })

  it('the mean and its standard error over Battles', () => {
    const base = record([turn(1), attack])
    const m = aggregate([0, 2, 4, 2].map((t) => ({ ...base, turnsBeforeFirstAttack: t })))
    expect(m.turnsBeforeFirstAttack).toBe(2)
    expect(m.se.turnsBeforeFirstAttack).toBeCloseTo(Math.sqrt(8 / 3 / 4))
  })
})

describe('the variants', () => {
  const ranges = (d: typeof data) => ['long_shot', 'element_bolt', 'pin', 'mark'].map((id) => d.skills[id]?.range)
  const mountains = (d: typeof data, id: string) => d.boards[id]!.terrain.flat().filter((x) => x === 'mountain').length

  it('there are eight: today, a, b, c and their combinations', () => {
    expect(RANGE_VARIANTS.map((v) => v.id)).toEqual(['baseline', 'a', 'b', 'c', 'ab', 'ac', 'bc', 'abc'])
    expect(() => variantById('d')).toThrow(/unknown variant/)
  })

  it('data/ has the ranges and mountains of variant abc since ticket 09 (D-31)', () => {
    expect(ranges(data)).toEqual([3, 3, 3, 4])
    expect(mountains(data, 'crossroads')).toBe(2 + 4)
    expect(mountains(data, 'shallows')).toBe(2 + 4)
  })

  it('baseline is how the game was before ticket 09: old ranges, plain Boards, neither rule', () => {
    const applied = applyVariant(data, variantById('baseline'))
    expect(applied.rules).toEqual({})
    expect(ranges(applied.data)).toEqual([4, 4, 4, 5])
    expect(mountains(applied.data, 'crossroads')).toBe(2)
    expect(mountains(applied.data, 'shallows')).toBe(2)
  })

  it('a: Long Shot, Element Bolt and Pin reach 3, Mark 4; nothing else', () => {
    const applied = applyVariant(data, variantById('a'))
    expect(ranges(applied.data)).toEqual([3, 3, 3, 4])
    expect(applied.rules).toEqual({})
    expect(mountains(applied.data, 'crossroads')).toBe(2)
    expect(applied.data.skills.burst).toBe(data.skills.burst)
  })

  it('b: attack rolls from distance 4 get disadvantage, ranges and Boards as before', () => {
    const applied = applyVariant(data, variantById('b'))
    expect(applied.rules).toEqual({ longRangeDisadvantageFrom: 4 })
    expect(ranges(applied.data)).toEqual([4, 4, 4, 5])
    expect(mountains(applied.data, 'crossroads')).toBe(2)
  })

  it('c: mountains block sight and each Board has four more, still the same after a 180 degree turn', () => {
    const applied = applyVariant(data, variantById('c'))
    expect(applied.rules).toEqual({ sightBlockedBy: ['mountain'] })
    expect(ranges(applied.data)).toEqual([4, 4, 4, 5])
    for (const id of ['crossroads', 'shallows']) {
      const after = applied.data.boards[id]!.terrain
      expect(mountains(applied.data, id)).toBe(2 + 4)
      const n = after.length
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) expect(after[y]![x], `${id} ${x},${y}`).toBe(after[n - 1 - y]![n - 1 - x])
    }
  })

  it('abc is the game: the same ranges, Boards and rules as data/ and the engine have', () => {
    const abc = applyVariant(data, variantById('abc'))
    expect(abc.rules).toEqual(GAME_RANGE_RULES)
    expect(ranges(abc.data)).toEqual(ranges(data))
    expect(abc.data.boards.crossroads!.terrain).toEqual(data.boards.crossroads!.terrain)
    expect(abc.data.boards.shallows!.terrain).toEqual(data.boards.shallows!.terrain)
  })
})

describe('running a set', () => {
  const job = { scenario: 'scenario_1', board: 'crossroads', games: 2, seed: '0000000000000007' }

  it('abc plays exactly as the game does: the same numbers as a plain run with the real data and rules', () => {
    const set = runRangeSet(data, { ...job, variant: 'abc' })
    const profile = GAME_PROFILES.greedy
    const plain = aggregate(simulateGames(data, { scenario: job.scenario, board: job.board, profiles: { A: profile, B: profile } }, job.games, job.seed))
    expect(set.metrics).toEqual(plain)
  })

  it('every variant plays its Battles to the end, the same every time', () => {
    for (const v of RANGE_VARIANTS) {
      const first = runRangeSet(data, { ...job, variant: v.id })
      expect(first.metrics.games).toBe(2)
      expect(runRangeSet(data, { ...job, variant: v.id }).metrics).toEqual(first.metrics)
    }
  }, 120_000)

  it('the variants really play differently from the baseline', () => {
    const big = { ...job, games: 30 }
    const baseline = runRangeSet(data, { ...big, variant: 'baseline' }).metrics
    for (const id of ['a', 'b', 'c']) {
      const metrics = runRangeSet(data, { ...big, variant: id }).metrics
      expect(metrics, id).not.toEqual(baseline)
    }
  }, 120_000)

  it('threads give the same sets as one thread, in the order asked', { timeout: 120_000 }, async () => {
    const jobs = [
      { ...job, variant: 'a', games: 3 },
      { ...job, variant: 'b', games: 3, board: 'shallows' },
      { ...job, variant: 'c', games: 3, scenario: 'scenario_2' },
    ]
    const done: number[] = []
    const results = await runRangeJobs(jobs, 2, (_r, n) => done.push(n))
    expect(done.sort()).toEqual([1, 2, 3])
    expect(results.map((r) => r.variant)).toEqual(['a', 'b', 'c'])
    results.forEach((r, i) => expect(r.metrics).toEqual(runRangeSet(data, jobs[i]!).metrics))
  })

  it('the job list is every variant on the four sets', () => {
    const jobs = rangeJobs(2000, '0')
    expect(jobs).toHaveLength(RANGE_VARIANTS.length * 4)
    expect(new Set(jobs.map((j) => `${j.scenario}/${j.board}`)).size).toBe(4)
    expect(jobs.every((j) => j.games === 2000)).toBe(true)
  })
})

describe('the report and the command line', () => {
  it('the targets are the spec ones: team A 40-60%, turn limit 15% at most', () => {
    const base = runRangeSet(data, { variant: 'baseline', scenario: 'scenario_1', board: 'crossroads', games: 2, seed: '1' }).metrics
    expect(meetsTargets({ ...base, winA: 0.5, limit: 0.1 })).toBe(true)
    expect(meetsTargets({ ...base, winA: 0.39, limit: 0.1 })).toBe(false)
    expect(meetsTargets({ ...base, winA: 0.61, limit: 0.1 })).toBe(false)
    expect(meetsTargets({ ...base, winA: 0.5, limit: 0.16 })).toBe(false)
  })

  it('the tables list every variant and set', () => {
    const results = RANGE_VARIANTS.slice(0, 2).map((v) => runRangeSet(data, { variant: v.id, scenario: 'scenario_1', board: 'crossroads', games: 2, seed: '1' }))
    const text = rangeTables(results)
    expect(text).toContain('## Summary by variant')
    expect(text).toContain('Baseline (today)')
    expect(text).toContain('a: shorter ranges')
    expect(text).toContain('S1 crossroads')
    expect(text).toContain('## Actions per Battle')
  })

  it('run takes --variant, ranges takes --workers, an unknown variant is refused', () => {
    expect(parseArgs(['run', '--variant', 'abc']).variant).toBe('abc')
    expect(parseArgs(['ranges', '--games', '50', '--workers', '3'])).toMatchObject({ command: 'ranges', games: 50, workers: 3 })
    expect(() => parseArgs(['run', '--variant', 'z'])).toThrow(/unknown variant/)
  })
})
