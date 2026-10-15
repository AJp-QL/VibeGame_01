/**
 * Turn, Round and activation (rules §17.3, §17.4).
 *
 * Within a Turn the player picks one Unit at a time. A Unit's activation
 * starts with its first Move (or Action, Blink, Command) and ends when another
 * Unit starts; an ended activation cannot resume. Each Unit gets at most one
 * Move and one Action per Turn. On the first Turn of the side that starts,
 * only 2 of its 3 Units may start an activation.
 */
import type { Side } from '@mt/shared'
import type { Rejection } from './battle.ts'
import type { Activations, BattleState, UnitId, UnitState } from './state.ts'
import { tauntDuty } from './taunt.ts'

/** Units per side: Tamer + 2 Monsters (rules §17.1). */
export const TEAM_SIZE = 3

/** Units that may act on the first Turn of the side that starts (rules §17.3). */
export const FIRST_TURN_ACTIVATIONS = 2

/** No Turn is running (deployment): no Unit may start an activation. */
export const NO_ACTIVATIONS: Activations = { current: null, started: [], limit: 0 }

/**
 * Start Turn `turnNumber[side] + 1` of `side` (rules §17.4 "เริ่ม Turn"):
 * count the Turn, count a Round when `side` plays first, and open a fresh set
 * of activations. Status upkeep and Bleed follow in applyEndTurn (statuses.ts).
 */
export function startTurn(state: BattleState, side: Side, firstSide: Side): BattleState {
  const turn = state.turnNumber[side] + 1
  const isFirstTurnOfStarter = side === firstSide && turn === 1
  return {
    ...state,
    sideToAct: side,
    turnNumber: { ...state.turnNumber, [side]: turn },
    round: side === firstSide ? state.round + 1 : state.round,
    activations: {
      current: null,
      started: [],
      limit: isFirstTurnOfStarter ? FIRST_TURN_ACTIVATIONS : TEAM_SIZE,
    },
  }
}

/**
 * Why `unit` cannot use a Move or Action now as far as activations go, or
 * `null` if it can: it is the Unit playing now, or it may start its activation.
 */
export function activationBlocker(state: BattleState, unit: UnitState): Rejection | null {
  const { current, started, limit } = state.activations
  if (current === unit.id) return null
  if (started.includes(unit.id)) {
    return {
      code: 'activation-over',
      message: `${unit.id} already finished its activation this Turn (another Unit started after it)`,
    }
  }
  if (started.length >= limit) {
    return {
      code: 'activation-limit',
      message: `Only ${limit} Units may act this Turn and ${started.join(', ')} already did`,
    }
  }
  return null
}

/**
 * Make `unitId` the Unit playing now, starting its activation if it has not
 * started. `state` is the state before the Move or Action that starts it: a
 * Taunted Unit's case (rules §14.3) is decided from it and kept for the activation.
 */
export function activate(state: BattleState, unitId: UnitId): BattleState {
  const { current, started, tauntDuty: _previous, ...rest } = state.activations
  if (current === unitId) return state
  const duty = tauntDuty(state, unitId)
  return {
    ...state,
    activations: { ...rest, current: unitId, started: [...started, unitId], ...(duty === undefined ? {} : { tauntDuty: duty }) },
  }
}
