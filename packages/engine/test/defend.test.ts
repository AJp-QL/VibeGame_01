import { describe, expect, it } from 'vitest'
import { tileFromName } from '@mt/shared'
import {
  applyAction,
  legalActions,
  previewAction,
  type Action,
  type ApplyResult,
  type AttackPreview,
  type BattleEvent,
  type BattleState,
  type UnitId,
} from '../src/index.ts'
import { NEUTRAL_ELEMENTS, scenario1Battle, scenario1Deployment, type BattleOptions } from './fixtures.ts'

// Fangrel (A.m1, d4) next to Tidewall (B.m1, d5), neutral elements, normal or
// neutral tiles: every roll is a single d20. Tidewall Guard 11, Ward 11; Fangrel Guard 11, Ward 9.
const TILES = { A: ['a1', 'd4', 'g1'], B: ['a7', 'd5', 'g7'] } as const

function battle(options: BattleOptions = {}): BattleState {
  return scenario1Battle({ tiles: TILES, elements: NEUTRAL_ELEMENTS, ...options })
}

function accepted(result: ApplyResult): { state: BattleState; events: readonly BattleEvent[] } {
  if (!result.ok) throw new Error(result.rejection.message)
  return result
}

const defend = (state: BattleState, unit: UnitId) => applyAction(state, { type: 'defend', unit })
const endTurn = (state: BattleState) => accepted(applyAction(state, { type: 'endTurn' }))
const unit = (state: BattleState, id: UnitId) => state.units.find((u) => u.id === id)

function preview(state: BattleState, attacker: UnitId, target: UnitId): AttackPreview {
  const result = previewAction(state, { type: 'basicAttack', unit: attacker, target })
  if (!result.ok || result.preview?.type !== 'attack') throw new Error('expected an attack preview')
  return result.preview
}

describe('Defend: the Unit\'s Action, Guarded +2 to Guard and Ward (rules §12)', () => {
  it('uses the Action and makes the Unit Guarded', () => {
    const { state, events } = accepted(defend(battle(), 'A.m1'))
    expect(events).toEqual([
      { type: 'defended', unit: 'A.m1' },
      { type: 'statusApplied', unit: 'A.m1', status: { id: 'guarded', bonus: 2 } },
    ])
    expect(unit(state, 'A.m1')).toMatchObject({ hasActed: true, statuses: [{ id: 'guarded', bonus: 2 }] })
  })

  it('legalActions offers Defend to every Unit that may still use its Action', () => {
    const defenders = (state: BattleState) =>
      legalActions(state).flatMap((a) => (a.type === 'defend' ? [a.unit] : []))
    const state = battle()
    expect(defenders(state)).toEqual(['A.tamer', 'A.m1', 'A.m2'])
    const after = accepted(defend(state, 'A.m1')).state
    expect(defenders(after)).toEqual(['A.tamer', 'A.m2'])
    for (const action of legalActions(after)) expect(applyAction(after, action).ok).toBe(true)
  })

  it('the Unit can still Move after Defend, but not attack', () => {
    const state = accepted(defend(battle(), 'A.m1')).state
    expect(applyAction(state, { type: 'basicAttack', unit: 'A.m1', target: 'B.m1' })).toMatchObject({
      ok: false,
      rejection: { code: 'already-acted' },
    })
    expect(applyAction(state, { type: 'move', unit: 'A.m1', to: tileFromName('c3') }).ok).toBe(true)
  })

  it('a Unit can Move first and then Defend', () => {
    const moved = accepted(applyAction(battle(), { type: 'move', unit: 'A.m1', to: tileFromName('c3') })).state
    expect(defend(moved, 'A.m1').ok).toBe(true)
  })

  it('enemy attacks roll against Guard + 2: Fangrel needs 13 instead of 11', () => {
    const guarded = endTurn(accepted(defend(battle({ firstSide: 'B', dice: { rolls: [10] } }), 'B.m1')).state).state
    // Team A's Turn now; Tidewall is still Guarded.
    const p = preview(guarded, 'A.m1', 'B.m1')
    expect(p).toMatchObject({ defence: 13, defenceKind: 'guard', guardedBonus: 2, hitChance: { numerator: 10, denominator: 20 } })
    const { events } = accepted(applyAction(guarded, { type: 'basicAttack', unit: 'A.m1', target: 'B.m1' }))
    expect(events).toEqual([expect.objectContaining({ natural: 10, total: 12, defence: 13, hit: false })])
  })

  it('elemental attacks roll against Ward + 2', () => {
    const state = battle({ firstSide: 'B', skills: { basic_attack: { attack: 'elemental' } } })
    const guarded = endTurn(accepted(defend(state, 'B.m1')).state).state
    expect(preview(guarded, 'A.m1', 'B.m1')).toMatchObject({ defence: 13, defenceKind: 'ward', guardedBonus: 2 })
    expect(preview(state, 'B.m1', 'A.m1')).toMatchObject({ defence: 9, guardedBonus: 0 })
  })
})

describe('Guarded lasts until the start of the next Turn of the Unit\'s side (rules §12, §14.1, §17.4)', () => {
  it('holds through the enemy Turn and ends as its own side starts its next Turn', () => {
    let state = accepted(defend(battle(), 'A.m1')).state
    const bStart = endTurn(state)
    expect(bStart.events.map((e) => e.type)).toEqual(['turnEnded', 'turnStarted'])
    state = bStart.state
    expect(unit(state, 'A.m1')?.statuses).toEqual([{ id: 'guarded', bonus: 2 }])
    expect(preview(state, 'B.m1', 'A.m1')).toMatchObject({ defence: 13, guardedBonus: 2 })

    const aStart = endTurn(state)
    expect(aStart.events).toEqual([
      { type: 'turnEnded', side: 'B', turn: 1 },
      { type: 'turnStarted', side: 'A', turn: 2, round: 2 },
      { type: 'statusEnded', unit: 'A.m1', status: 'guarded' },
    ])
    expect(unit(aStart.state, 'A.m1')?.statuses).toEqual([])
  })

  it('the start of the other side\'s Turn does not end it', () => {
    // Team B defends in its Turn 1; team A's Turn 2 starts, Tidewall stays Guarded.
    let state = endTurn(battle()).state
    state = accepted(defend(state, 'B.m1')).state
    const aTurn = endTurn(state)
    expect(aTurn.events.some((e) => e.type === 'statusEnded')).toBe(false)
    expect(unit(aTurn.state, 'B.m1')?.statuses).toEqual([{ id: 'guarded', bonus: 2 }])
    expect(endTurn(aTurn.state).events).toContainEqual({ type: 'statusEnded', unit: 'B.m1', status: 'guarded' })
  })

  it('a Unit that goes down loses Guarded', () => {
    // Quillfox (B.m2, HP 19) defends; Fangrel POW 30 rolls a critical: 8 + 8 + 10 = 26.
    const tiles = { A: ['a1', 'd4', 'g1'], B: ['a7', 'g7', 'd5'] } as const
    let state = scenario1Battle({
      tiles,
      elements: NEUTRAL_ELEMENTS,
      firstSide: 'B',
      stats: { 'A.m1': { pow: 30 } },
      dice: { rolls: [20, 8, 8] },
    })
    state = endTurn(accepted(defend(state, 'B.m2')).state).state
    const { state: after } = accepted(applyAction(state, { type: 'basicAttack', unit: 'A.m1', target: 'B.m2' }))
    expect(after.fallen).toEqual([expect.objectContaining({ id: 'B.m2', hp: 0, statuses: [] })])
  })
})

describe('Defend follows the activation rules and is rejected when illegal (rules §17.4)', () => {
  it('starts the Unit\'s activation: an earlier Unit cannot resume after another starts', () => {
    let state = accepted(defend(battle(), 'A.m1')).state
    expect(state.activations).toMatchObject({ current: 'A.m1', started: ['A.m1'] })
    state = accepted(applyAction(state, { type: 'move', unit: 'A.tamer', to: tileFromName('b1') })).state
    expect(applyAction(state, { type: 'move', unit: 'A.m1', to: tileFromName('c3') })).toMatchObject({
      ok: false,
      rejection: { code: 'activation-over' },
    })
  })

  it('counts toward 2 of 3 Units on the first Turn of the side that starts', () => {
    let state = accepted(defend(battle(), 'A.m1')).state
    state = accepted(defend(state, 'A.m2')).state
    expect(defend(state, 'A.tamer')).toMatchObject({ ok: false, rejection: { code: 'activation-limit' } })
    expect(legalActions(state).some((a) => a.type === 'defend')).toBe(false)
  })

  const state = battle()
  const acted = accepted(defend(state, 'A.m1')).state
  const illegal: readonly [string, () => ApplyResult, string][] = [
    ['twice in one Turn', () => defend(acted, 'A.m1'), 'already-acted'],
    ['after attacking', () => defend(accepted(applyAction(battle({ dice: { rolls: [8] } }), { type: 'basicAttack', unit: 'A.m1', target: 'B.m1' })).state, 'A.m1'), 'already-acted'],
    ['by the side not to act', () => defend(state, 'B.m1'), 'not-your-turn'],
    ['by an unknown Unit', () => defend(state, 'A.m9'), 'unknown-unit'],
    ['during deployment', () => defend(scenario1Deployment(), 'A.m1'), 'wrong-phase'],
  ]

  for (const [what, attempt, code] of illegal) {
    it(`Defend ${what}: ${code}, state unchanged`, () => {
      const result = attempt()
      expect(result).toMatchObject({ ok: false, rejection: { code } })
      expect(result.ok || result.rejection.message !== '').toBe(true)
    })
  }

  it('a rejected Defend returns the same state object', () => {
    const before = structuredClone(acted)
    const result = defend(acted, 'A.m1')
    expect(result.state).toBe(acted)
    expect(acted).toEqual(before)
  })

  it('previewAction: Defend has nothing to roll; an illegal one gives the same reason', () => {
    const action: Action = { type: 'defend', unit: 'A.m1' }
    expect(previewAction(state, action)).toEqual({ ok: true, preview: null })
    const rejected = applyAction(acted, action)
    expect(previewAction(acted, action)).toEqual({ ok: false, rejection: !rejected.ok && rejected.rejection })
  })
})
