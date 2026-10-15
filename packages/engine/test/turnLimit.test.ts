import { describe, expect, it } from 'vitest'
import type { Side } from '@mt/shared'
import {
  applyAction,
  derivedValues,
  legalActions,
  ROUND_LIMIT,
  type ApplyResult,
  type BattleEvent,
  type BattleState,
  type UnitId,
} from '../src/index.ts'
import { NEUTRAL_ELEMENTS, scenario1Battle, type BattleOptions } from './fixtures.ts'

// Turn limit (rules §19.2, §17.4 end of Turn step 5, D-11): after Round 10
// the side that dealt more total damage wins; equal totals are a draw. Every
// HP loss counts in full for the other side, past the HP left, Bleed included.

// Fangrel (A.m1, d4) next to Tidewall (B.m1, d5), every Monster forest
// (neutral). Fangrel hits Tidewall on a d20 of 9+; damage 1d8 + 2.
const TILES = { A: ['a1', 'd4', 'g1'], B: ['a7', 'd5', 'g7'] } as const

function battle(options: BattleOptions = {}): BattleState {
  return scenario1Battle({ tiles: TILES, elements: NEUTRAL_ELEMENTS, ...options })
}

function accepted(result: ApplyResult): { state: BattleState; events: readonly BattleEvent[] } {
  if (!result.ok) throw new Error(result.rejection.message)
  return result
}

const attack = (state: BattleState, unit: UnitId, target: UnitId) =>
  accepted(applyAction(state, { type: 'basicAttack', unit, target })).state
const endTurn = (state: BattleState) => accepted(applyAction(state, { type: 'endTurn' }))

/** End Turns until the Battle is over; returns the last End Turn. */
function playOut(start: BattleState): { state: BattleState; events: readonly BattleEvent[]; turnsEnded: number } {
  let state = start
  let turnsEnded = 0
  for (;;) {
    const result = endTurn(state)
    turnsEnded++
    state = result.state
    if (state.outcome !== null) return { ...result, turnsEnded }
    if (turnsEnded > 2 * ROUND_LIMIT) throw new Error('the Battle did not end')
  }
}

describe('the Battle ends when Round 10 ends (rules §19.2, §17.4)', () => {
  it('exactly after the second Turn of Round 10: the 20th End Turn when nothing happens', () => {
    let state = battle()
    for (let i = 0; i < 19; i++) state = endTurn(state).state
    expect(state).toMatchObject({ round: 10, sideToAct: 'B', turnNumber: { A: 10, B: 10 }, outcome: null })
    const { state: over, events } = endTurn(state)
    expect(events).toEqual([
      { type: 'turnEnded', side: 'B', turn: 10 },
      { type: 'battleEnded', winner: null, cause: 'turnLimit', round: 10, damageDealt: { A: 0, B: 0 } },
    ])
    expect(over.outcome).toEqual({ winner: null, cause: 'turnLimit' })
    expect(over.round).toBe(10)
    expect(legalActions(over)).toEqual([])
    expect(applyAction(over, { type: 'endTurn' })).toMatchObject({ ok: false, rejection: { code: 'battle-over' } })
  })

  it('when team B starts, Round 10 ends with team A\'s 10th Turn', () => {
    const { state, events, turnsEnded } = playOut(battle({ firstSide: 'B' }))
    expect(turnsEnded).toBe(20)
    expect(events[0]).toEqual({ type: 'turnEnded', side: 'A', turn: 10 })
    expect(state.turnNumber).toEqual({ A: 10, B: 10 })
  })

  it('statuses of the ending side still count down first (end of Turn steps 1–4 before step 5)', () => {
    let state = battle()
    for (let i = 0; i < 19; i++) state = endTurn(state).state
    state = accepted(applyAction(state, { type: 'defend', unit: 'B.m1' })).state
    // Guarded ends at the start of B's next Turn, which never comes: it is still there at the end.
    const { state: over } = endTurn(state)
    expect(over.outcome?.cause).toBe('turnLimit')
    expect(over.units.find((u) => u.id === 'B.m1')?.statuses).toEqual([{ id: 'guarded', bonus: 2 }])
  })
})

describe('more total damage wins; equal is a draw (rules §19.2)', () => {
  it('team A wins when it dealt more', () => {
    // A hits for 5 + 2 = 7; nobody else deals damage.
    const state = attack(battle({ dice: { rolls: [15, 5] } }), 'A.m1', 'B.m1')
    expect(state.damageDealt).toEqual({ A: 7, B: 0 })
    const { state: over, events } = playOut(state)
    expect(over.outcome).toEqual({ winner: 'A', cause: 'turnLimit' })
    expect(events.at(-1)).toEqual({ type: 'battleEnded', winner: 'A', cause: 'turnLimit', round: 10, damageDealt: { A: 7, B: 0 } })
  })

  it('team A loses when team B dealt more', () => {
    // A hits for 1 + 2 = 3; then B's Tidewall hits Fangrel for more.
    let state = attack(battle({ dice: { rolls: [15, 1, 19, 8] } }), 'A.m1', 'B.m1')
    state = attack(endTurn(state).state, 'B.m1', 'A.m1')
    expect(state.damageDealt.A).toBe(3)
    expect(state.damageDealt.B).toBeGreaterThan(3)
    const { state: over } = playOut(state)
    expect(over.outcome).toEqual({ winner: 'B', cause: 'turnLimit' })
  })

  it('equal totals are a draw', () => {
    // A deals 5 + POW mod; B rolls whatever makes its total the same.
    const start = battle({ dice: { rolls: [] } })
    const modA = derivedValues(start, 'A.m1').damageMod.melee
    const modB = derivedValues(start, 'B.m1').damageMod.melee
    const rollB = 5 + modA - modB
    expect(rollB).toBeGreaterThanOrEqual(1)
    let state = attack(battle({ dice: { rolls: [15, 5, 19, rollB] } }), 'A.m1', 'B.m1')
    state = attack(endTurn(state).state, 'B.m1', 'A.m1')
    expect(state.damageDealt.A).toBe(state.damageDealt.B)
    expect(state.damageDealt.A).toBeGreaterThan(0)
    const { state: over, events } = playOut(state)
    expect(over.outcome).toEqual({ winner: null, cause: 'turnLimit' })
    expect(events.at(-1)).toMatchObject({ type: 'battleEnded', winner: null, cause: 'turnLimit' })
  })
})

describe('what counts in the total damage (D-11)', () => {
  it('overkill counts in full: 26 damage on a Unit with 19 HP counts 26', () => {
    // Team A's Fangrel with POW 30 (mod +10) crits Quillfox (B.m2, HP 19) on d5: 8 + 8 + 10 = 26.
    // Then team B's Tidewall (POW 30) crits Fangrel for 6 + 5 + 10 = 21: without overkill A would have 19 and lose.
    const options: BattleOptions = {
      tiles: { A: ['a1', 'd4', 'g1'], B: ['a7', 'c4', 'd5'] },
      stats: { 'A.m1': { pow: 30, vit: 30 }, 'B.m1': { pow: 30 } },
    }
    let state = attack(battle({ ...options, dice: { rolls: [20, 8, 8, 20, 6, 5] } }), 'A.m1', 'B.m2')
    expect(state.fallen.map((u) => u.id)).toEqual(['B.m2'])
    expect(state.damageDealt.A).toBe(26)
    state = attack(endTurn(state).state, 'B.m1', 'A.m1')
    expect(state.damageDealt.B).toBeGreaterThan(19)
    expect(state.damageDealt.B).toBeLessThan(26)
    expect(playOut(state).state.outcome).toEqual({ winner: 'A', cause: 'turnLimit' })
  })

  it('Bleed ticks count for the side that applied it (the other side of the bleeding Unit)', () => {
    // Rend: hit 15, damage 4 + 2 = 6, save 5 + 2 < 11 → Bleed 3. Ticks 2, 3, 4 at the start of B's Turns.
    let state = accepted(
      applyAction(battle({ dice: { rolls: [15, 4, 5, 2, 3, 4] } }), { type: 'useSkill', unit: 'A.m1', skill: 'rend', target: 'B.m1' }),
    ).state
    expect(state.damageDealt).toEqual({ A: 6, B: 0 })
    const ticks: number[] = []
    for (let i = 0; i < 6; i++) {
      const result = endTurn(state)
      state = result.state
      for (const e of result.events) if (e.type === 'statusTicked') ticks.push(e.amount)
    }
    expect(ticks).toEqual([2, 3, 4])
    expect(state.damageDealt).toEqual({ A: 6 + 2 + 3 + 4, B: 0 })
    expect(playOut(state).state.outcome).toEqual({ winner: 'A', cause: 'turnLimit' })
  })

  it('totals are in the state from the start, for the HUD', () => {
    const state = battle()
    expect(state.damageDealt).toEqual({ A: 0, B: 0 })
    expect(state.round).toBe(1)
    expect(ROUND_LIMIT).toBe(10)
  })
})

describe('a Battle won outright before the limit is not a turn-limit result', () => {
  it('the Tamer going down in Round 10 ends it with tamerDown', () => {
    let state = battle({
      tiles: { A: ['a1', 'd4', 'g1'], B: ['d5', 'a7', 'g7'] },
      stats: { 'A.m1': { pow: 30 } },
      dice: { rolls: [20, 8, 8] },
    })
    for (let i = 0; i < 18; i++) state = endTurn(state).state
    expect(state).toMatchObject({ round: 10, sideToAct: 'A' as Side })
    state = attack(state, 'A.m1', 'B.tamer')
    expect(state.outcome).toEqual({ winner: 'A', cause: 'tamerDown' })
  })
})
