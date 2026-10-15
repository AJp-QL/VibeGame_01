import { describe, expect, it } from 'vitest'
import { tileFromName } from '@mt/shared'
import { applyAction, legalActions, type ApplyResult, type BattleState, type UnitId } from '../src/index.ts'
import { deployBothSides, scenario1Battle } from './fixtures.ts'

function ok(result: ApplyResult) {
  if (!result.ok) throw new Error(result.rejection.message)
  return result
}

function endTurn(state: BattleState) {
  return ok(applyAction(state, { type: 'endTurn' }))
}

function move(state: BattleState, unit: UnitId, to: string): ApplyResult {
  return applyAction(state, { type: 'move', unit, to: tileFromName(to) })
}

/** Units of the side to act that legalActions lets Move. */
const movers = (state: BattleState) =>
  [...new Set(legalActions(state).flatMap((a) => (a.type === 'move' ? [a.unit] : [])))].sort()

describe('Turn and Round (rules §17.3)', () => {
  it('the first Turn after deployment is Round 1, Turn 1 of the side that won initiative', () => {
    const { state } = deployBothSides({ rolls: [15, 10] })
    expect(state).toMatchObject({ phase: 'play', sideToAct: 'A', round: 1, turnNumber: { A: 1, B: 0 } })
  })

  it('End Turn is always a legal action', () => {
    expect(legalActions(scenario1Battle())).toContainEqual({ type: 'endTurn' })
  })

  it('End Turn alternates sides and a Round is one Turn of each side', () => {
    const first = endTurn(scenario1Battle())
    expect(first.state).toMatchObject({ sideToAct: 'B', round: 1, turnNumber: { A: 1, B: 1 } })
    expect(first.events).toEqual([
      { type: 'turnEnded', side: 'A', turn: 1 },
      { type: 'turnStarted', side: 'B', turn: 1, round: 1 },
    ])

    const second = endTurn(first.state)
    expect(second.state).toMatchObject({ sideToAct: 'A', round: 2, turnNumber: { A: 2, B: 1 } })
    expect(second.events).toEqual([
      { type: 'turnEnded', side: 'B', turn: 1 },
      { type: 'turnStarted', side: 'A', turn: 2, round: 2 },
    ])

    const third = endTurn(second.state)
    expect(third.state).toMatchObject({ sideToAct: 'B', round: 2, turnNumber: { A: 2, B: 2 } })
  })

  it('when team B wins initiative, a Round is B then A', () => {
    const { state } = deployBothSides({ rolls: [2, 19] })
    const a1 = endTurn(state)
    expect(a1.events.at(-1)).toEqual({ type: 'turnStarted', side: 'A', turn: 1, round: 1 })
    const b2 = endTurn(a1.state)
    expect(b2.events.at(-1)).toEqual({ type: 'turnStarted', side: 'B', turn: 2, round: 2 })
    expect(b2.state.turnNumber).toEqual({ A: 1, B: 2 })
  })

  it('only the side to act has Moves to choose from', () => {
    const state = scenario1Battle()
    const sides = (s: BattleState) => new Set(movers(s).map((id) => id.charAt(0)))
    expect(sides(state)).toEqual(new Set(['A']))
    expect(sides(endTurn(state).state)).toEqual(new Set(['B']))
  })

  it("a Unit that moved can Move again in its side's next Turn", () => {
    const moved = ok(move(scenario1Battle(), 'A.m1', 'c3'))
    const backToA = endTurn(endTurn(moved.state).state).state
    expect(move(backToA, 'A.m1', 'c4').ok).toBe(true)
  })

  it('End Turn is allowed with Units that did nothing', () => {
    const state = ok(move(endTurn(scenario1Battle()).state, 'B.m2', 'c5')).state
    expect(applyAction(state, { type: 'endTurn' }).ok).toBe(true)
  })
})

describe('first Turn of the side that starts: 2 of 3 Units (rules §17.3, §17.4)', () => {
  it('the side that starts may activate only 2 Units on its first Turn', () => {
    let state = scenario1Battle()
    expect(state.activations).toEqual({ current: null, started: [], limit: 2 })
    state = ok(move(state, 'A.tamer', 'd2')).state
    state = ok(move(state, 'A.m2', 'e3')).state
    expect(state.activations).toEqual({ current: 'A.m2', started: ['A.tamer', 'A.m2'], limit: 2 })
    // The third Unit cannot start an activation: no Moves for it, and a Move is refused.
    expect(movers(state)).toEqual([])
    const before = structuredClone(state)
    const third = move(state, 'A.m1', 'c3')
    expect(third).toMatchObject({ ok: false, rejection: { code: 'activation-limit' } })
    expect(third.state).toBe(state)
    expect(state).toEqual(before)
  })

  it('choosing a Unit does not use one of the 2: only a Move (or Action) starts an activation', () => {
    const state = scenario1Battle()
    expect(movers(state)).toEqual(['A.m1', 'A.m2', 'A.tamer'])
    const rejected = move(state, 'A.m1', 'c7') // out of reach: no activation starts
    expect(rejected.ok).toBe(false)
    expect(rejected.state.activations.started).toEqual([])
  })

  it('the side that starts second plays all 3 Units on its first Turn', () => {
    let state = endTurn(scenario1Battle()).state
    expect(state.activations.limit).toBe(3)
    state = ok(move(state, 'B.tamer', 'd6')).state
    state = ok(move(state, 'B.m1', 'e5')).state
    state = ok(move(state, 'B.m2', 'c5')).state
    expect(state.activations.started).toEqual(['B.tamer', 'B.m1', 'B.m2'])
  })

  it('from its second Turn on, the side that starts plays all 3 Units', () => {
    let state = endTurn(endTurn(scenario1Battle()).state).state
    expect(state.activations.limit).toBe(3)
    for (const [unit, to] of [['A.m1', 'c3'], ['A.tamer', 'd2'], ['A.m2', 'e3']] as const) {
      state = ok(move(state, unit, to)).state
    }
    expect(state.activations.started).toEqual(['A.m1', 'A.tamer', 'A.m2'])
  })

  it('applies to team B when team B wins initiative', () => {
    const { state } = deployBothSides({ rolls: [1, 20] })
    expect(state.activations.limit).toBe(2)
    expect(endTurn(state).state.activations.limit).toBe(3)
  })
})

describe('activations within a Turn (rules §17.4)', () => {
  it('the player picks the Unit order; each Unit gets one Move', () => {
    let state = endTurn(endTurn(scenario1Battle()).state).state
    state = ok(move(state, 'A.m2', 'e3')).state
    expect(move(state, 'A.m2', 'e4')).toMatchObject({ ok: false, rejection: { code: 'already-moved' } })
    state = ok(move(state, 'A.tamer', 'd2')).state
    expect(state.activations).toMatchObject({ current: 'A.tamer', started: ['A.m2', 'A.tamer'] })
  })

  it('once another Unit starts, the previous activation is over for this Turn', () => {
    let state = endTurn(endTurn(scenario1Battle()).state).state
    state = ok(move(state, 'A.m2', 'e3')).state
    state = ok(move(state, 'A.m1', 'c3')).state
    expect(move(state, 'A.m2', 'e4')).toMatchObject({ ok: false, rejection: { code: 'activation-over' } })
  })

  it('a new Turn clears activations, Moves and Actions', () => {
    const moved = ok(move(scenario1Battle(), 'A.m1', 'c3')).state
    const next = endTurn(moved).state
    expect(next.activations).toEqual({ current: null, started: [], limit: 3 })
    expect(next.units.every((u) => !u.hasMoved && !u.hasActed)).toBe(true)
  })

  it('every action legalActions offers in play is accepted', () => {
    const state = ok(move(scenario1Battle(), 'A.m1', 'c3')).state
    for (const action of legalActions(state)) expect(applyAction(state, action).ok).toBe(true)
  })
})
