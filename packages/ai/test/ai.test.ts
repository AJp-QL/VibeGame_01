import { isDeepStrictEqual } from 'node:util'
import { describe, expect, it } from 'vitest'
import {
  applyAction,
  createBattle,
  decidingSide,
  isInStartZone,
  legalActions,
  type Action,
  type BattleState,
} from '@mt/engine'
import type { Side, Tile } from '@mt/shared'
import {
  chooseAction,
  createAi,
  GAME_PROFILES,
  planDeployment,
  SIM_PROFILES,
  type AiProfile,
} from '../src/index.ts'
import { gameData, newBattle, playBattle, seedOf, type PlayedBattle } from './play.ts'

const SCENARIOS = ['scenario_1', 'scenario_2'] as const
const BOARDS = Object.keys(gameData.boards)
const PROFILES: readonly AiProfile[] = [...Object.values(SIM_PROFILES), ...Object.values(GAME_PROFILES)]
const SEEDS = [seedOf(1), seedOf(2)]

const isLegal = (state: BattleState, action: Action) => legalActions(state).some((a) => isDeepStrictEqual(a, action))

/** Replay recorded actions from the initial state, without the AI. */
function replay(played: PlayedBattle): BattleState {
  let state = played.initial
  for (const action of played.actions) {
    const result = applyAction(state, action)
    if (!result.ok) throw new Error(result.rejection.message)
    state = result.state
  }
  return state
}

describe('AI plays whole Battles', () => {
  it('has both Boards and both Scenarios in data', () => {
    expect(BOARDS.length).toBeGreaterThanOrEqual(2)
    for (const s of SCENARIOS) expect(gameData.scenarios[s]).toBeDefined()
  })

  for (const scenario of SCENARIOS) {
    for (const board of BOARDS) {
      it(`${scenario} on ${board}: every profile, both sides AI, to an outcome, only legal actions`, () => {
        for (const profile of PROFILES) {
          for (const seed of SEEDS) {
            const played = playBattle(newBattle(scenario, board, seed), { A: profile, B: profile }, { checkLegal: isLegal })
            expect(played.final.outcome, `${profile.name} ${seed}`).not.toBeNull()
            expect(played.illegal, `${profile.name} ${seed}`).toEqual([])
          }
        }
      }, 120000)
    }
  }

  it('sim and game profiles can play each other', () => {
    const played = playBattle(newBattle('scenario_1', 'crossroads', seedOf(7)), { A: SIM_PROFILES.tamer_rush, B: GAME_PROFILES.greedy }, { checkLegal: isLegal })
    expect(played.final.outcome).not.toBeNull()
    expect(played.illegal).toEqual([])
  })
})

describe('determinism', () => {
  it('the same Battle, Dice Seed and profiles give the same actions every time', () => {
    for (const profile of [SIM_PROFILES.greedy, GAME_PROFILES.neutral]) {
      const first = playBattle(newBattle('scenario_2', 'shallows', seedOf(3)), { A: profile, B: profile })
      const second = playBattle(newBattle('scenario_2', 'shallows', seedOf(3)), { A: profile, B: profile })
      expect(second.actions).toEqual(first.actions)
    }
  })

  it('chooseAction is pure: same state and memory, same answer; nothing it is given changes', () => {
    const state = newBattle('scenario_1', 'crossroads', seedOf(4))
    const ai = createAi(state, 'A', GAME_PROFILES.greedy)
    const before = JSON.stringify({ state, ai })
    const a = chooseAction(state, ai)
    const b = chooseAction(state, ai)
    expect(b).toEqual(a)
    expect(JSON.stringify({ state, ai })).toBe(before)
  })

  it("the AI's thinking draws no Battle dice: replaying its actions without it gives the same Battle", () => {
    for (const seed of SEEDS) {
      const played = playBattle(newBattle('scenario_1', 'shallows', seed), { A: SIM_PROFILES.greedy, B: GAME_PROFILES.greedy })
      const again = replay(played)
      // Same dice stream position, same everything.
      expect(again).toEqual(played.final)
    }
  })

  it('uses its own dice stream, derived from the Battle by jump (rules §21.5 item 4)', () => {
    const state = newBattle('scenario_1', 'crossroads', seedOf(5))
    const ai = createAi(state, 'B', SIM_PROFILES.greedy)
    expect(ai.rng).not.toEqual(state.dice)
    expect(createAi(state, 'B', SIM_PROFILES.greedy).rng).toEqual(ai.rng)
  })
})

describe('deployment', () => {
  it('the AI places its 3 Units in its own start zone, then confirms', () => {
    for (const seed of SEEDS) {
      const played = playBattle(newBattle('scenario_1', 'crossroads', seed), { A: SIM_PROFILES.greedy, B: GAME_PROFILES.greedy })
      for (const side of ['A', 'B'] as const) {
        const deploys = played.actions.filter((a) => a.type === 'deploy' && a.unit.startsWith(side))
        expect(deploys).toHaveLength(3)
        for (const d of deploys) if (d.type === 'deploy') expect(isInStartZone(side, d.to)).toBe(true)
      }
      expect(played.actions.filter((a) => a.type === 'confirmDeployment')).toHaveLength(2)
    }
  })

  it('works out its placements before the other side places (vs AI the AI deploys first), and plays them later', () => {
    let state = newBattle('scenario_2', 'crossroads', seedOf(6))
    let aiB = createAi(state, 'B', GAME_PROFILES.greedy)
    const early = planDeployment(state, aiB) // team A has not placed anything yet
    aiB = early.ai
    let aiA = createAi(state, 'A', GAME_PROFILES.greedy)
    while (state.phase === 'deployment' && state.sideToAct === 'A') {
      const c = chooseAction(state, aiA)
      aiA = c.ai
      const r = applyAction(state, c.action)
      if (!r.ok) throw new Error(r.rejection.message)
      state = r.state
    }
    const sent: Action[] = []
    while (state.phase === 'deployment' && decidingSide(state) === 'B') {
      const c = chooseAction(state, aiB)
      aiB = c.ai
      sent.push(c.action)
      const r = applyAction(state, c.action)
      if (!r.ok) throw new Error(r.rejection.message)
      state = r.state
    }
    expect(sent).toEqual(early.actions)
  })
})

// --------------------------------------------------------------- decisions

function presetBattle(tiles: Record<Side, [Tile, Tile, Tile]>, firstSide: Side, rolls: number[]): BattleState {
  const scenario = gameData.scenarios.scenario_1
  const board = gameData.boards.crossroads
  if (scenario === undefined || board === undefined) throw new Error('data')
  return createBattle({
    scenario,
    board,
    species: gameData.species,
    skills: gameData.skills,
    statuses: gameData.statuses,
    elementWheel: gameData.elementWheel,
    dice: { rolls },
    preset: { tiles, firstSide },
  })
}

function apply(state: BattleState, action: Action): BattleState {
  const r = applyAction(state, action)
  if (!r.ok) throw new Error(r.rejection.message)
  return r.state
}

const far = { A: [{ x: 3, y: 3 }, { x: 0, y: 0 }, { x: 6, y: 0 }], B: [{ x: 3, y: 6 }, { x: 0, y: 6 }, { x: 6, y: 6 }] } as const

describe('pending decisions', () => {
  it('rerolls a missed attack roll on a Tamer (sim.py), keeps a missed one on a Monster', () => {
    // A.m1 (Fangrel) next to B's Tamer, no Monster of B next to it: a natural 2 misses.
    let state = presetBattle({ A: [{ x: 0, y: 1 }, { x: 3, y: 5 }, { x: 6, y: 1 }], B: [{ x: 3, y: 6 }, { x: 0, y: 4 }, { x: 6, y: 4 }] }, 'A', [2, 15])
    state = apply(state, { type: 'basicAttack', unit: 'A.m1', target: 'B.tamer' })
    expect(state.pending?.kind).toBe('inspiration')
    expect(chooseAction(state, createAi(state, 'A', SIM_PROFILES.greedy)).action).toEqual({ type: 'useInspiration', side: 'A' })

    let other = presetBattle({ A: [{ x: 0, y: 1 }, { x: 3, y: 5 }, { x: 6, y: 1 }], B: [{ x: 3, y: 0 }, { x: 3, y: 6 }, { x: 6, y: 4 }] }, 'A', [2, 15])
    other = apply(other, { type: 'basicAttack', unit: 'A.m1', target: 'B.m1' })
    expect(other.pending?.kind).toBe('inspiration')
    expect(chooseAction(other, createAi(other, 'A', GAME_PROFILES.greedy)).action).toEqual({ type: 'declineInspiration', side: 'A' })
  })

  it("answers its own failed save during the other side's Turn with Inspiration; a passed save is never offered (D-29)", () => {
    // A's Tamer Distracts B.m1 two tiles away: B decides on its save while it is A's Turn.
    const tiles = { A: [{ x: 3, y: 3 }, { x: 0, y: 0 }, { x: 6, y: 0 }], B: [{ x: 0, y: 6 }, { x: 3, y: 5 }, { x: 6, y: 6 }] } as Record<Side, [Tile, Tile, Tile]>
    let failed = presetBattle(tiles, 'A', [3, 18])
    failed = apply(failed, { type: 'useSkill', unit: 'A.tamer', skill: 'distract', target: 'B.m1' })
    expect(failed.pending).toMatchObject({ kind: 'inspiration', side: 'B' })
    expect(failed.sideToAct).toBe('A')
    expect(decidingSide(failed)).toBe('B')
    expect(chooseAction(failed, createAi(failed, 'B', SIM_PROFILES.greedy)).action).toEqual({ type: 'useInspiration', side: 'B' })

    let saved = presetBattle(tiles, 'A', [19])
    saved = apply(saved, { type: 'useSkill', unit: 'A.tamer', skill: 'distract', target: 'B.m1' })
    expect(saved.pending).toBeNull()
  })

  it('never rerolls initiative (sim.py has no Inspiration there)', () => {
    for (const seed of [seedOf(1), seedOf(2), seedOf(3), seedOf(4)]) {
      const played = playBattle(newBattle('scenario_1', 'crossroads', seed), { A: GAME_PROFILES.greedy, B: SIM_PROFILES.greedy })
      expect(played.events.filter((e) => e.type === 'initiativeRolled' && e.rerolled !== undefined)).toEqual([])
    }
  })

  it("answers decisions during the other side's Turn in real Battles, and Hit and Run's step", () => {
    let offeredOffTurn = 0
    let retreats = 0
    for (const seed of [seedOf(1), seedOf(2), seedOf(3), seedOf(4), seedOf(5), seedOf(6)]) {
      const played = playBattle(newBattle('scenario_1', 'crossroads', seed), { A: SIM_PROFILES.greedy, B: SIM_PROFILES.greedy })
      let turnSide: Side | null = null
      for (const e of played.events) {
        if (e.type === 'turnStarted') turnSide = e.side
        if (e.type === 'inspirationOffered' && turnSide !== null && e.side !== turnSide) offeredOffTurn++
      }
      retreats += played.actions.filter((a) => a.type === 'retreat').length
    }
    expect(offeredOffTurn).toBeGreaterThan(0)
    expect(retreats).toBeGreaterThan(0)
  })

  it('throws when it is not its decision', () => {
    const state = presetBattle(far as unknown as Record<Side, [Tile, Tile, Tile]>, 'A', [])
    expect(() => chooseAction(state, createAi(state, 'B', SIM_PROFILES.greedy))).toThrow(/decides now/)
  })
})
