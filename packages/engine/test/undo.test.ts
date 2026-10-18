import { describe, expect, it } from 'vitest'
import { tileFromName } from '@mt/shared'
import { applyAction, drewDice, legalActions, undoPoint, type Action, type BattleState } from '../src/index.ts'
import { NEUTRAL_ELEMENTS, scenario1Battle, scenario1Deployment } from './fixtures.ts'

// Undo (phase 1.x ticket 05, rules §17.5, D-30): the safe point is the later of the
// start of the Turn and the last action that rolled dice or answered a roll.

/** Play `actions` one after the other, keeping every state: `states[k]` is the state after `actions[k - 1]`. */
function play(start: BattleState, actions: readonly Action[]) {
  const states: BattleState[] = [start]
  for (const action of actions) {
    const result = applyAction(states.at(-1)!, action)
    if (!result.ok) throw new Error(`${JSON.stringify(action)}: ${result.rejection.message}`)
    states.push(result.state)
  }
  return { states, actions }
}

// Fangrel (A.m1) d4 next to Tidewall (B.m1) d5, every Monster forest (neutral).
const TILES = { A: ['a1', 'd4', 'g1'], B: ['a7', 'd5', 'g7'] } as const
const battle = (dice: number[], inspiration = false) =>
  scenario1Battle({ tiles: TILES, elements: NEUTRAL_ELEMENTS, dice: { rolls: dice }, ...(inspiration ? { inspiration: { A: true, B: true } } : {}) })

const move = (unit: string, to: string): Action => ({ type: 'move', unit, to: tileFromName(to) })
const attack = (unit: string, target: string): Action => ({ type: 'basicAttack', unit, target })
const endTurn: Action = { type: 'endTurn' }

describe('undoPoint', () => {
  it('nothing to undo at the start of a Turn', () => {
    const { states, actions } = play(battle([]), [])
    expect(undoPoint(states, actions)).toBeNull()
  })

  it('moves and Defend go back to the start of the Turn', () => {
    const { states, actions } = play(battle([]), [move('A.m2', 'f2'), { type: 'defend', unit: 'A.m1' }])
    expect(undoPoint(states, actions)).toEqual({ keep: 0, label: 'turnStart' })
  })

  it('an action that rolled dice is the safe point: nothing after it, nothing to undo', () => {
    const { states, actions } = play(battle([15, 3]), [attack('A.m1', 'B.m1')])
    expect(drewDice(states[0]!, states[1]!)).toBe(true)
    expect(undoPoint(states, actions)).toBeNull()
  })

  it('what follows a roll can be undone, back to just after the roll', () => {
    const { states, actions } = play(battle([15, 3]), [attack('A.m1', 'B.m1'), move('A.m2', 'f2'), { type: 'defend', unit: 'A.m2' }])
    expect(undoPoint(states, actions)).toEqual({ keep: 1, label: 'lastRoll' })
  })

  it('a move rolls nothing', () => {
    const { states } = play(battle([]), [move('A.m1', 'd3')])
    expect(drewDice(states[0]!, states[1]!)).toBe(false)
  })

  it('an Inspiration answer is a safe point too, even when it draws no die', () => {
    // A misses (3), declines Inspiration, then moves: Undo goes back to just after the decision.
    const { states, actions } = play(battle([3], true), [attack('A.m1', 'B.m1'), { type: 'declineInspiration', side: 'A' }, move('A.m2', 'f2')])
    expect(states[1]!.pending).toMatchObject({ kind: 'inspiration' })
    expect(undoPoint(states, actions)).toEqual({ keep: 2, label: 'lastRoll' })
    expect(undoPoint(states.slice(0, 3), actions.slice(0, 2))).toBeNull()
  })

  it('using Inspiration (a reroll) is a safe point', () => {
    const { states, actions } = play(battle([3, 15, 4], true), [attack('A.m1', 'B.m1'), { type: 'useInspiration', side: 'A' }, move('A.m2', 'f2')])
    expect(undoPoint(states, actions)).toEqual({ keep: 2, label: 'lastRoll' })
  })

  it('End Turn starts a new Turn: the other side can undo only what it did since', () => {
    const played = play(battle([]), [move('A.m1', 'd3'), endTurn])
    expect(undoPoint(played.states, played.actions)).toBeNull()
    const next = play(played.states[2]!, [move('B.m1', 'd6')])
    // History of the whole Battle: B moved once after A ended its Turn.
    const states = [...played.states, ...next.states.slice(1)]
    const actions = [...played.actions, ...next.actions]
    expect(undoPoint(states, actions)).toEqual({ keep: 2, label: 'turnStart' })
  })

  it('never crosses a Turn boundary: team A cannot undo its Turn once team B is playing', () => {
    const played = play(battle([]), [move('A.m1', 'd3'), endTurn, move('B.m1', 'd6'), move('B.m2', 'f6')])
    expect(undoPoint(played.states, played.actions)).toEqual({ keep: 2, label: 'turnStart' })
  })

  it('is not available outside play', () => {
    const deployment = scenario1Deployment({ rolls: [] })
    const placed = play(deployment, [{ type: 'deploy', unit: 'A.tamer', to: tileFromName('d1') }])
    expect(undoPoint(placed.states, placed.actions)).toBeNull()
  })

  it('needs one state per action', () => {
    const { states, actions } = play(battle([]), [move('A.m1', 'd3')])
    expect(undoPoint(states.slice(1), actions)).toBeNull()
  })
})

describe('undo is safe: going back to the point never crosses dice, a Turn or a decision', () => {
  /** A small deterministic chooser: not clever, just varied. */
  function chooser(seed: number) {
    let x = seed
    return (n: number) => {
      x = (Math.imul(x, 1664525) + 1013904223) >>> 0
      return x % n
    }
  }

  for (const seed of [1, 2, 3, 4, 5]) {
    it(`random legal play, seed ${seed}`, () => {
      const pick = chooser(seed)
      const start = scenario1Battle({ tiles: TILES, dice: { seed: seed.toString(16).padStart(16, '0') }, inspiration: { A: true, B: true } })
      const states: BattleState[] = [start]
      const actions: Action[] = []
      let checked = 0
      for (let step = 0; step < 160 && states.at(-1)!.outcome === null; step++) {
        const state = states.at(-1)!
        const legal = legalActions(state)
        if (legal.length === 0) break
        // Prefer ending the Turn from time to time so the history crosses Turns.
        const chosen = legal.find((a) => a.type === 'endTurn' && pick(4) === 0) ?? legal[pick(legal.length)]!
        const result = applyAction(state, chosen)
        if (!result.ok) throw new Error(result.rejection.message)
        states.push(result.state)
        actions.push(chosen)
        const point = undoPoint(states, actions)
        if (point === null) continue
        checked++
        const back = states[point.keep]!
        const now = states.at(-1)!
        // Same dice, same side, same Round and Turn: the Battle plays on as if the withdrawn actions never happened.
        expect(JSON.stringify(back.dice)).toBe(JSON.stringify(now.dice))
        expect(back.sideToAct).toBe(now.sideToAct)
        expect(back.round).toBe(now.round)
        expect(back.phase).toBe('play')
        expect(back.inspiration).toEqual(now.inspiration)
        // Everything withdrawn rolled nothing, ended no Turn and answered no roll.
        for (let k = point.keep + 1; k <= actions.length; k++) {
          expect(drewDice(states[k - 1]!, states[k]!)).toBe(false)
          expect(['endTurn', 'useInspiration', 'declineInspiration']).not.toContain(actions[k - 1]!.type)
        }
      }
      expect(checked).toBeGreaterThan(5)
    })
  }
})
