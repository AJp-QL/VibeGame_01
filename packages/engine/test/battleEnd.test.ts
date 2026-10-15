import { describe, expect, it } from 'vitest'
import { tileFromName } from '@mt/shared'
import {
  applyAction,
  derivedValues,
  legalActions,
  previewAction,
  type Action,
  type ApplyResult,
  type BattleEvent,
  type BattleState,
  type UnitId,
} from '../src/index.ts'
import { scenario1Battle } from './fixtures.ts'

// Team A's Monsters get POW 30 (mod +10) so a few hits are enough:
// a critical deals 2d8 + 10, up to 26.
const STRONG = { 'A.m1': { pow: 30 }, 'A.m2': { pow: 30 } } as const

function accepted(result: ApplyResult): { state: BattleState; events: readonly BattleEvent[] } {
  if (!result.ok) throw new Error(result.rejection.message)
  return result
}

function attack(state: BattleState, unit: UnitId, target: UnitId) {
  return accepted(applyAction(state, { type: 'basicAttack', unit, target }))
}

function endTurn(state: BattleState): BattleState {
  return accepted(applyAction(state, { type: 'endTurn' })).state
}

describe('a Unit at 0 HP goes down and leaves the Board (rules §10.4)', () => {
  // Fangrel d4 next to Quillfox d5 (HP 19); Tidewall and Tamer B far away.
  const start = () =>
    scenario1Battle({
      tiles: { A: ['a1', 'd4', 'c5'], B: ['a7', 'g7', 'd5'] },
      stats: STRONG,
      dice: { rolls: [20, 8, 8] },
    })

  it('HP is set to 0, the Unit is listed as fallen and an event says so', () => {
    const { state, events } = attack(start(), 'A.m1', 'B.m2')
    expect(events.map((e) => e.type)).toEqual(['attackRolled', 'damageDealt', 'unitDown'])
    // The full damage is reported even past the HP left (rules §10.3, D-11).
    expect(events[1]).toMatchObject({ amount: 26, hpBefore: 19, hpAfter: 0 })
    expect(events[2]).toEqual({ type: 'unitDown', unit: 'B.m2', tile: tileFromName('d5') })
    expect(state.units.map((u) => u.id)).toEqual(['A.tamer', 'A.m1', 'A.m2', 'B.tamer', 'B.m1'])
    expect(state.fallen).toEqual([expect.objectContaining({ id: 'B.m2', hp: 0 })])
    expect(derivedValues(state, 'B.m2').maxHp).toBe(19)
    expect(state.outcome).toBeNull()
  })

  it('its tile is free, it cannot be targeted and it cannot act', () => {
    const { state } = attack(start(), 'A.m1', 'B.m2')
    expect(applyAction(state, { type: 'move', unit: 'A.m2', to: tileFromName('d5') }).ok).toBe(true)
    expect(applyAction(state, { type: 'basicAttack', unit: 'A.m2', target: 'B.m2' })).toMatchObject({
      ok: false,
      rejection: { code: 'unknown-unit' },
    })
    const bTurn = endTurn(state)
    expect(legalActions(bTurn).some((a) => 'unit' in a && a.unit === 'B.m2')).toBe(false)
    expect(applyAction(bTurn, { type: 'move', unit: 'B.m2', to: tileFromName('d6') })).toMatchObject({
      ok: false,
      rejection: { code: 'unknown-unit' },
    })
  })
})

describe('the Battle ends when a side wins (rules §19.1)', () => {
  it("a side wins at once when the other side's Tamer reaches 0 HP", () => {
    // Fangrel d6 next to Tamer B d7 (HP 25); critical 8 + 8 + 10 = 26.
    const state = scenario1Battle({
      tiles: { A: ['a1', 'd6', 'g1'], B: ['d7', 'a6', 'g7'] },
      stats: STRONG,
      dice: { rolls: [20, 8, 8] },
    })
    const { state: over, events } = attack(state, 'A.m1', 'B.tamer')
    expect(events.slice(2)).toEqual([
      { type: 'unitDown', unit: 'B.tamer', tile: tileFromName('d7') },
      { type: 'battleEnded', winner: 'A', cause: 'tamerDown', round: 1 },
    ])
    expect(over.outcome).toEqual({ winner: 'A', cause: 'tamerDown' })
  })

  it("a side wins when every Monster of the other side reaches 0 HP, with that side's Tamer still up", () => {
    // Round 1: Fangrel downs Quillfox (19), Wispling deals 26 to Tidewall (31 → 5).
    // Round 2: Fangrel finishes Tidewall.
    let state = scenario1Battle({
      tiles: { A: ['a1', 'd4', 'e4'], B: ['a7', 'e5', 'd5'] },
      stats: STRONG,
      dice: { rolls: [20, 8, 8, 20, 8, 8, 15, 1] },
    })
    state = attack(state, 'A.m1', 'B.m2').state
    const second = attack(state, 'A.m2', 'B.m1')
    expect(second.events[1]).toMatchObject({ hpAfter: 5 })
    expect(second.state.outcome).toBeNull()
    state = endTurn(endTurn(second.state))
    expect(state.round).toBe(2)

    const last = attack(state, 'A.m1', 'B.m1')
    expect(last.events.map((e) => e.type)).toEqual(['attackRolled', 'damageDealt', 'unitDown', 'battleEnded'])
    expect(last.events[3]).toEqual({ type: 'battleEnded', winner: 'A', cause: 'monstersDown', round: 2 })
    expect(last.state.outcome).toEqual({ winner: 'A', cause: 'monstersDown' })
    expect(last.state.units.find((u) => u.id === 'B.tamer')?.hp).toBe(25)
  })

  it('a Monster going down while the side still has another does not end the Battle', () => {
    const state = scenario1Battle({
      tiles: { A: ['a1', 'd4', 'g1'], B: ['a7', 'g7', 'd5'] },
      stats: STRONG,
      dice: { rolls: [20, 8, 8] },
    })
    const { state: after, events } = attack(state, 'A.m1', 'B.m2')
    expect(events.some((e) => e.type === 'battleEnded')).toBe(false)
    expect(after.outcome).toBeNull()
    expect(legalActions(after)).toContainEqual({ type: 'endTurn' })
  })
})

describe('after the Battle ends no action is legal', () => {
  const over = (() => {
    const state = scenario1Battle({
      tiles: { A: ['a1', 'd6', 'c6'], B: ['d7', 'a6', 'g7'] },
      stats: STRONG,
      dice: { rolls: [20, 8, 8] },
    })
    return attack(state, 'A.m1', 'B.tamer').state
  })()

  it('legalActions offers nothing, not even End Turn', () => {
    expect(legalActions(over)).toEqual([])
  })

  const attempts: readonly [string, Action][] = [
    ['End Turn', { type: 'endTurn' }],
    ['a Move', { type: 'move', unit: 'A.tamer', to: tileFromName('b1') }],
    ['an attack by a Unit that has not acted', { type: 'basicAttack', unit: 'A.m2', target: 'B.m1' }],
  ]

  for (const [what, action] of attempts) {
    it(`${what} is rejected (battle-over) and the state is unchanged`, () => {
      const before = structuredClone(over)
      const result = applyAction(over, action)
      expect(result).toMatchObject({ ok: false, rejection: { code: 'battle-over' } })
      expect(result.state).toBe(over)
      expect(over).toEqual(before)
      expect(previewAction(over, action)).toMatchObject({ ok: false, rejection: { code: 'battle-over' } })
    })
  }
})
