import { describe, expect, it } from 'vitest'
import { SIM_PROFILES } from '@mt/ai'
import { createBattle, derivedValues, type Action, type BattleEvent } from '@mt/engine'
import { dataHash, type GameData } from '@mt/shared'
import {
  aggregate,
  compareWithSimV4,
  gameSeed,
  loadRepoData,
  loadSimV4,
  PARITY_CONFIGS,
  parseArgs,
  runParity,
  simEquivalentData,
  simulateGames,
  summarizeBattle,
  type GameRecord,
} from '../src/index.ts'

const data = loadRepoData()
const greedy = { A: SIM_PROFILES.greedy, B: SIM_PROFILES.greedy }

function tidewallMove(d: GameData, scenarioId: string): number {
  const scenario = d.scenarios[scenarioId]
  const board = d.boards.crossroads
  if (scenario === undefined || board === undefined) throw new Error('missing data')
  const state = createBattle({ scenario, board, species: d.species, skills: d.skills, statuses: d.statuses, elementWheel: d.elementWheel, dice: { seed: '0000000000000001' },
    preset: { tiles: { A: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }], B: [{ x: 0, y: 6 }, { x: 1, y: 6 }, { x: 2, y: 6 }] }, firstSide: 'A' },
  })
  return derivedValues(state, 'B.m1').move
}

describe('Dice Seeds and determinism', () => {
  it('derives Battle seeds from the base seed (base 0 = packages/ai seedOf(i + 1))', () => {
    expect(gameSeed('0', 0)).toBe('9e3779b97f4a7c15')
    expect(gameSeed('0', 1)).toBe(((2n * 0x9e3779b97f4a7c15n) & ((1n << 64n) - 1n)).toString(16).padStart(16, '0'))
    expect(gameSeed('ffffffffffffffff', 0)).toBe('9e3779b97f4a7c14')
    expect(() => gameSeed('xyz', 0)).toThrow()
  })

  it('same base seed → identical records and metrics JSON; another seed → other Battles', () => {
    const matchup = { scenario: 'scenario_2', board: 'shallows', profiles: greedy }
    const a = simulateGames(data, matchup, 3, '2a')
    const b = simulateGames(data, matchup, 3, '2a')
    expect(JSON.stringify(b)).toBe(JSON.stringify(a))
    expect(JSON.stringify(aggregate(b))).toBe(JSON.stringify(aggregate(a)))
    const c = simulateGames(data, matchup, 3, '2b')
    expect(c.map((r) => r.seed)).not.toEqual(a.map((r) => r.seed))
  })
})

describe('summarizeBattle (hand-made Battle)', () => {
  const kinds = new Map([
    ['A.tamer', 'Tamer'],
    ['A.m1', 'Fangrel'],
    ['A.m2', 'Wispling'],
    ['B.tamer', 'Tamer'],
    ['B.m1', 'Tidewall'],
    ['B.m2', 'Quillfox'],
  ])
  const events = [
    { type: 'initiativeDecided', firstSide: 'B' },
    // Missed, rerolled with Inspiration, hit: one attack, one hit on a Tamer.
    { type: 'attackRolled', attacker: 'A.m1', target: 'B.tamer', hit: false },
    { type: 'inspirationUsed', side: 'A' },
    { type: 'attackRolled', attacker: 'A.m1', target: 'B.tamer', hit: true, rerolled: true },
    { type: 'damageDealt', source: 'A.m1', target: 'B.tamer', amount: 9, hpBefore: 5, hpAfter: -4 },
    { type: 'attackRolled', attacker: 'B.m1', target: 'A.m2', hit: true },
    { type: 'damageDealt', source: 'B.m1', target: 'A.m2', amount: 4, hpBefore: 12, hpAfter: 8 },
    { type: 'unitPushed', unit: 'A.m2', by: 'B.m1' },
    { type: 'attackRolled', attacker: 'A.m2', target: 'B.m1', hit: false },
    { type: 'counterattack', unit: 'B.m1', target: 'A.m2' },
    { type: 'unitDown', unit: 'B.tamer' },
    { type: 'unitDown', unit: 'A.m2' },
  ] as unknown as BattleEvent[]
  const actions = [
    { type: 'basicAttack', unit: 'A.m1', target: 'B.tamer' },
    { type: 'useSkill', unit: 'B.m1', skill: 'shield_bash', target: 'A.m2' },
    { type: 'useSkill', unit: 'A.m2', skill: 'hex', target: 'B.m1' },
    { type: 'command', unit: 'A.tamer', target: 'A.m1', option: 'advantage' },
    { type: 'defend', unit: 'B.m2' },
    { type: 'endTurn' },
  ] as unknown as Action[]
  const record = summarizeBattle(
    's',
    kinds,
    data.skills,
    { outcome: { winner: 'A', cause: 'tamerDown' }, turnNumber: { A: 3, B: 4 }, round: 4, damageDealt: { A: 9, B: 4 } },
    actions,
    events,
  )

  it('counts what happened', () => {
    expect(record).toEqual({
      seed: 's',
      winner: 'A',
      cause: 'tamerDown',
      firstSide: 'B',
      turns: { A: 3, B: 4 },
      round: 4,
      firstDown: 'Tamer',
      tamerDown: { A: false, B: true },
      damageBy: { Fangrel: 5, Tidewall: 4 },
      damageBySide: { A: 9, B: 4 },
      attacks: { Fangrel: { n: 1, hit: 1 }, Tidewall: { n: 1, hit: 1 }, Wispling: { n: 1, hit: 0 } },
      hitsTaken: { Tamer: 1, Wispling: 1 },
      tamerHits: 1,
      pushes: 1,
      skills: { 'Basic Attack': 1, 'Shield Bash': 1, Hex: 1, 'Command (advantage)': 1, Defend: 1, '(Counter triggered)': 1 },
    })
  })
})

describe('aggregate (hand-checked)', () => {
  const rec = (over: Partial<GameRecord>): GameRecord => ({
    seed: 'x',
    winner: 'A',
    cause: 'tamerDown',
    firstSide: 'A',
    turns: { A: 5, B: 5 },
    round: 5,
    firstDown: 'Tamer',
    tamerDown: { A: false, B: true },
    damageBy: {},
    damageBySide: { A: 0, B: 0 },
    attacks: {},
    hitsTaken: {},
    tamerHits: 0,
    pushes: 0,
    skills: {},
    ...over,
  })
  const m = aggregate([
    rec({ damageBy: { Fangrel: 10 }, tamerHits: 2, skills: { Hex: 1 } }),
    rec({ winner: 'B', firstSide: 'B', cause: 'monstersDown', firstDown: 'Fangrel', turns: { A: 6, B: 7 }, tamerDown: { A: false, B: false }, pushes: 2 }),
    rec({ winner: null, firstSide: 'B', cause: 'turnLimit', firstDown: null, turns: { A: 10, B: 10 }, tamerDown: { A: false, B: false }, damageBy: { Fangrel: 6, Tidewall: 4 } }),
    rec({ winner: 'B', cause: 'turnLimit', firstDown: 'Quillfox', turns: { A: 10, B: 10 }, tamerDown: { A: false, B: false }, attacks: { Fangrel: { n: 4, hit: 3 } } }),
  ])

  it('shares, means, per-Battle counts and standard errors', () => {
    expect(m.games).toBe(4)
    expect([m.winA, m.winB, m.draw]).toEqual([0.25, 0.5, 0.25])
    // Winner played first: Battle 1 (A/A) and 2 (B/B).
    expect(m.winFirst).toBe(0.5)
    expect(m.firstA).toBe(0.5)
    expect([m.limit, m.byTamer, m.byMonsters]).toEqual([0.5, 0.25, 0.25])
    expect(m.tamerFirstDown).toBe(0.25)
    expect(m.firstDown).toEqual({ Tamer: 0.25, Fangrel: 0.25, none: 0.25, Quillfox: 0.25 })
    expect(m.turnsA).toBe(7.75)
    expect(m.turnsB).toBe(8)
    expect(m.roundsMean).toBe(8)
    expect(m.roundsMedian).toBe(8.5)
    expect(m.tamerBDown).toBe(0.25)
    expect(m.damageByPerGame).toEqual({ Fangrel: 4, Tidewall: 1 })
    expect(m.tamerHitsPerGame).toBe(0.5)
    expect(m.pushesPerGame).toBe(0.5)
    expect(m.skillsPerGame).toEqual({ Hex: 0.25 })
    expect(m.hitRateByAttacker).toEqual({ Fangrel: 0.75 })
    expect(m.decidedBySide['B-turnLimit']).toBe(0.25)
    expect(m.se.winA).toBeCloseTo(Math.sqrt((0.25 * 0.75) / 4))
    // turns A: 5, 6, 10, 10 → sd² = (7.5625 + 3.0625 + 5.0625 + 5.0625) / 3
    expect(m.se.turnsA).toBeCloseTo(Math.sqrt(20.75 / 3 / 4))
  })
})

describe('sim-equivalent conditions (test/tool only)', () => {
  const before = dataHash(data)
  const { data: sim, overrides } = simEquivalentData(data)

  it('Tidewall moves 3 like sim.py; the real data still moves it 2 and is untouched', () => {
    expect(tidewallMove(sim, 'scenario_1')).toBe(3)
    expect(tidewallMove(sim, 'scenario_2')).toBe(3)
    expect(tidewallMove(data, 'scenario_1')).toBe(2)
    expect(tidewallMove(data, 'scenario_2')).toBe(2)
    expect(dataHash(data)).toBe(before)
    expect(dataHash(loadRepoData())).toBe(before)
    expect(data.species.tidewall).not.toHaveProperty('moveBonus')
  })

  it('uses sim v4 stats (D-25): only Scenario 2 Tidewall POW and Quillfox SPI differ from data/', () => {
    expect(overrides.map((o) => o.what)).toEqual(['scenario_2 B tidewall', 'scenario_2 B quillfox', 'tidewall moveBonus (base move 2 → 3)'])
    const b = sim.scenarios.scenario_2?.teams.B.monsters
    expect(b?.[0]?.stats.pow).toBe(16)
    expect(b?.[1]?.stats.spi).toBe(12)
  })
})

describe('CLI arguments', () => {
  it('defaults and values', () => {
    expect(parseArgs(['run'])).toMatchObject({ command: 'run', scenario: 'scenario_1', board: 'crossroads', a: 'sim:greedy', b: 'sim:greedy', seed: '0', simEquivalent: false, format: 'md' })
    expect(
      parseArgs(['run', '--', '--scenario', 'scenario_2', '--board', 'shallows', '--a', 'game:tamer_rush', '--b', 'sim:neutral', '--games', '50', '--seed', 'beef', '--sim-equivalent', '--format', 'json', '--out', 'x.json']),
    ).toEqual({ command: 'run', scenario: 'scenario_2', board: 'shallows', a: 'game:tamer_rush', b: 'sim:neutral', games: 50, otherGames: undefined, seed: 'beef', simEquivalent: true, format: 'json', out: 'x.json' })
    expect(parseArgs(['parity', '--games', '10', '--other-games', '5'])).toMatchObject({ command: 'parity', games: 10, otherGames: 5 })
  })

  it('rejects bad input', () => {
    expect(() => parseArgs([])).toThrow(/usage/)
    expect(() => parseArgs(['play'])).toThrow(/usage/)
    expect(() => parseArgs(['run', '--frobnicate', '1'])).toThrow(/unknown option/)
    expect(() => parseArgs(['run', '--games'])).toThrow(/needs a value/)
    expect(() => parseArgs(['run', '--games', '0'])).toThrow(/positive integer/)
    expect(() => parseArgs(['run', '--seed', 'zz'])).toThrow(/hex/)
    expect(() => parseArgs(['run', '--a', 'sim:berserk'])).toThrow(/profile/)
    expect(() => parseArgs(['run', '--format', 'csv'])).toThrow(/md or json/)
  })
})

describe('parity with sim v4 (quick smoke; full run: corepack pnpm sim parity)', () => {
  it('S1 and S2 U4, sim-equivalent: every checked metric within 4 standard errors of sim v4', () => {
    const { data: sim } = simEquivalentData(data)
    const simV4 = loadSimV4()
    const configs = PARITY_CONFIGS.filter((c) => c.sameRules)
    const results = runParity(sim, { games: () => 100, seed: '16', configs, simV4 })
    for (const r of results) {
      const v = simV4[r.config.label]
      if (v === undefined) throw new Error('missing sim v4 result')
      expect(compareWithSimV4(r.config, r.metrics, v)).toEqual(r.checks)
      for (const c of r.checks) expect(Math.abs(c.diff), `${c.config} ${c.metric}: ours ${c.ours} sim ${c.sim}`).toBeLessThanOrEqual(4 * c.se)
    }
  }, 180_000)
})
