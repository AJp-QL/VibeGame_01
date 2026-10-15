/**
 * Losing HP (rules §10.3 step 5, §10.4, §19.1): HP goes down; a Unit at 0 HP
 * leaves the Board at once with every status gone, and the Battle may end.
 * Used by attacks and by start-of-Turn damage such as Bleed.
 */
import type { BattleEvent } from './battle.ts'
import { findUnit, otherSide, type BattleOutcome, type BattleState, type UnitId, type UnitState } from './state.ts'

/** Rules §19.1, checked every time a Unit goes down. */
function outcomeAfterDown(state: BattleState, down: UnitState): BattleOutcome | null {
  const winner = otherSide(down.side)
  if (down.kind === 'tamer') return { winner, cause: 'tamerDown' }
  const monstersLeft = state.units.some((u) => u.side === down.side && u.kind === 'monster')
  return monstersLeft ? null : { winner, cause: 'monstersDown' }
}

export interface HpLoss {
  readonly state: BattleState
  readonly hpBefore: number
  readonly hpAfter: number
  /** `unitDown` and `battleEnded` when they happen; the caller puts them after its own damage event. */
  readonly after: BattleEvent[]
}

/**
 * Take `amount` HP off a Unit on the Board. The full amount counts even past
 * the HP left (D-11); HP stops at 0.
 */
export function loseHp(state: BattleState, unitId: UnitId, amount: number): HpLoss {
  const unit = findUnit(state, unitId)
  if (unit === undefined) throw new Error(`No Unit "${unitId}" on the Board`)
  const hpAfter = Math.max(0, unit.hp - amount)
  if (hpAfter > 0) {
    return {
      state: { ...state, units: state.units.map((u) => (u.id === unitId ? { ...u, hp: hpAfter } : u)) },
      hpBefore: unit.hp,
      hpAfter,
      after: [],
    }
  }
  const down: UnitState = { ...unit, hp: 0, statuses: [] }
  const units = state.units.filter((u) => u.id !== unitId)
  const fallen = [...state.fallen, down]
  const after: BattleEvent[] = [{ type: 'unitDown', unit: unitId, tile: unit.tile }]
  const outcome = outcomeAfterDown({ ...state, units, fallen }, down)
  if (outcome !== null) after.push({ type: 'battleEnded', winner: outcome.winner, cause: outcome.cause, round: state.round })
  // A Unit that went down cannot owe a decision any more.
  const pending = state.pending?.unit === unitId || outcome !== null ? null : state.pending
  return { state: { ...state, units, fallen, outcome, pending }, hpBefore: unit.hp, hpAfter: 0, after }
}
