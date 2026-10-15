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
import type { BattleEvent, Rejection } from './battle.ts'
import type { Activations, BattleState, StatusId, UnitId, UnitState } from './state.ts'

/** Units per side: Tamer + 2 Monsters (rules §17.1). */
export const TEAM_SIZE = 3

/** Units that may act on the first Turn of the side that starts (rules §17.3). */
export const FIRST_TURN_ACTIVATIONS = 2

/** No Turn is running (deployment): no Unit may start an activation. */
export const NO_ACTIVATIONS: Activations = { current: null, started: [], limit: 0 }

/**
 * Start Turn `turnNumber[side] + 1` of `side` (rules §17.4 "เริ่ม Turn"):
 * count the Turn, count a Round when `side` plays first, and open a fresh set
 * of activations. Bleed and status upkeep join here in later tickets.
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

/** Statuses that last "until the next Turn of the Unit's side" (rules §14.1): Countering and Cover join later. */
const ENDS_AT_OWN_TURN_START: readonly StatusId[] = ['guarded']

/**
 * Start-of-Turn step 2 (rules §17.4): Guarded (later also Countering and
 * Cover) leaves the Units of `side`, in Unit order. Bleed ticks after this
 * (ticket 07).
 */
export function endStartOfTurnStatuses(state: BattleState, side: Side): { state: BattleState; events: BattleEvent[] } {
  const events: BattleEvent[] = []
  const units = state.units.map((unit) => {
    if (unit.side !== side) return unit
    const ending = unit.statuses.filter((s) => ENDS_AT_OWN_TURN_START.includes(s.id))
    if (ending.length === 0) return unit
    for (const status of ending) events.push({ type: 'statusEnded', unit: unit.id, status: status.id })
    return { ...unit, statuses: unit.statuses.filter((s) => !ENDS_AT_OWN_TURN_START.includes(s.id)) }
  })
  return { state: events.length === 0 ? state : { ...state, units }, events }
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

/** Make `unitId` the Unit playing now, starting its activation if it has not started. */
export function activate(state: BattleState, unitId: UnitId): BattleState {
  const { current, started } = state.activations
  if (current === unitId) return state
  return { ...state, activations: { ...state.activations, current: unitId, started: [...started, unitId] } }
}
