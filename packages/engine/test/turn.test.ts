import { describe, expect, it } from 'vitest'
import { tileFromName } from '@mt/shared'
import { applyAction, legalActions, type BattleState } from '../src/index.ts'
import { scenario1Battle } from './fixtures.ts'

function endTurn(state: BattleState) {
  const result = applyAction(state, { type: 'endTurn' })
  if (!result.ok) throw new Error(result.rejection.message)
  return result
}

describe('Turn and Round (rules §17.3)', () => {
  it('a new Battle starts on Round 1, Turn 1 of team A', () => {
    const state = scenario1Battle()
    expect(state.sideToAct).toBe('A')
    expect(state.round).toBe(1)
    expect(state.turnNumber).toEqual({ A: 1, B: 0 })
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

  it('only the side to act has Moves to choose from', () => {
    const state = scenario1Battle()
    const movers = (s: BattleState) =>
      new Set(legalActions(s).flatMap((a) => (a.type === 'move' ? [a.unit.charAt(0)] : [])))
    expect(movers(state)).toEqual(new Set(['A']))
    expect(movers(endTurn(state).state)).toEqual(new Set(['B']))
  })

  it("a Unit that moved can Move again in its side's next Turn", () => {
    const moved = applyAction(scenario1Battle(), { type: 'move', unit: 'A.m1', to: tileFromName('c3') })
    if (!moved.ok) throw new Error(moved.rejection.message)
    const backToA = endTurn(endTurn(moved.state).state).state
    const again = applyAction(backToA, { type: 'move', unit: 'A.m1', to: tileFromName('c4') })
    expect(again.ok).toBe(true)
  })
})
