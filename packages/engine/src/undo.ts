/**
 * Undo (phase 1.x ticket 05, rules §17.5, D-30): which earlier state a player
 * may go back to. The engine decides; the session keeps the history and
 * applies it.
 *
 * The safe point is the later of the start of the current Turn and the last
 * action that rolled dice or answered a roll (an Inspiration decision). Going
 * back to it only withdraws actions that rolled nothing, so the dice stream
 * is the same there and the Battle plays on exactly as before.
 */
import type { Action } from './battle.ts'
import type { BattleState } from './state.ts'

/** Where Undo would go: the start of the Turn, or just after the last roll. */
export type UndoLabel = 'turnStart' | 'lastRoll'

export interface UndoPoint {
  /** How many of the actions stay; the Battle returns to the state after the first `keep` actions (0 = the state the history began with). */
  readonly keep: number
  readonly label: UndoLabel
}

/** Whether anything was drawn from the dice between two states (rules §21.4: actions without dice leave the stream as it was). */
export function drewDice(before: BattleState, after: BattleState): boolean {
  return JSON.stringify(before.dice) !== JSON.stringify(after.dice)
}

/** An Inspiration answer: it settles a roll, so what came before it stays (rules §18, D-10). */
function answersRoll(action: Action): boolean {
  return action.type === 'useInspiration' || action.type === 'declineInspiration'
}

/**
 * The point Undo would return to, or `null` when it is not available: the
 * Battle is not in play or is over, or no action lies after the safe point.
 * `states[0]` is where the history began and `states[k]` the state after
 * `actions[k - 1]`, so `states.length === actions.length + 1`. Who may press
 * Undo (the side whose Turn it is, not during the AI's) is the session's call.
 */
export function undoPoint(states: readonly BattleState[], actions: readonly Action[]): UndoPoint | null {
  const n = actions.length
  const now = states[n]
  if (states.length !== n + 1 || now === undefined || now.phase !== 'play' || now.outcome !== null) return null
  let point: UndoPoint = { keep: 0, label: 'turnStart' }
  for (let k = n; k >= 1; k--) {
    const action = actions[k - 1]!
    const before = states[k - 1]!
    const after = states[k]!
    // An End Turn, or anything done before play began (deployment, initiative), starts the Turn that follows.
    if (action.type === 'endTurn' || before.phase !== 'play') {
      point = { keep: k, label: 'turnStart' }
      break
    }
    if (answersRoll(action) || drewDice(before, after)) {
      point = { keep: k, label: 'lastRoll' }
      break
    }
  }
  return point.keep < n ? point : null
}
