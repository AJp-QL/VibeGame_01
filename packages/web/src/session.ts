/**
 * BattleSession: the one store both React and Phaser read. It holds the
 * engine's current state, the events of the last action and the UI-only
 * selection, and has no rules of its own: what is legal comes from
 * `legalActions`, what happens comes from `applyAction`.
 */
import type { Tile } from '@mt/shared'
import {
  applyAction,
  legalActions,
  type Action,
  type BattleEvent,
  type BattleState,
  type RejectionCode,
  type UnitId,
} from '@mt/engine'
import type { BattleSessionPort, BattleSnapshot, BoardInput } from '@mt/battle'

export interface SessionSnapshot extends BattleSnapshot {
  /** Why the last attempted action was refused, if it was. */
  readonly rejection: RejectionCode | null
  /** Every event so far, oldest first, for the log. */
  readonly log: readonly BattleEvent[]
}

export interface BattleSession extends BattleSessionPort {
  getSnapshot(): SessionSnapshot
  endTurn(): void
}

function reachableTiles(state: BattleState, unit: UnitId | null): Tile[] {
  if (unit === null) return []
  return legalActions(state).flatMap((action) =>
    action.type === 'move' && action.unit === unit ? [action.to] : [],
  )
}

export function createBattleSession(initial: BattleState): BattleSession {
  const listeners = new Set<() => void>()
  let snapshot: SessionSnapshot = {
    state: initial,
    events: [],
    revision: 0,
    selectedUnit: null,
    reachable: [],
    rejection: null,
    log: [],
  }

  function update(next: Partial<SessionSnapshot>): void {
    const merged = { ...snapshot, ...next }
    snapshot = { ...merged, reachable: reachableTiles(merged.state, merged.selectedUnit) }
    for (const listener of listeners) listener()
  }

  function dispatch(action: Action): void {
    const result = applyAction(snapshot.state, action)
    if (!result.ok) {
      update({ rejection: result.rejection.code })
      return
    }
    update({
      state: result.state,
      events: result.events,
      revision: snapshot.revision + 1,
      selectedUnit: null,
      rejection: null,
      log: [...snapshot.log, ...result.events],
    })
  }

  function input(boardInput: BoardInput): void {
    const { state, selectedUnit, reachable } = snapshot
    if (boardInput.type === 'tapUnit') {
      const unit = state.units.find((u) => u.id === boardInput.unit)
      const own = unit !== undefined && unit.side === state.sideToAct
      update({ selectedUnit: own && selectedUnit !== boardInput.unit ? boardInput.unit : null, rejection: null })
      return
    }
    const { tile } = boardInput
    if (selectedUnit !== null && reachable.some((t) => t.x === tile.x && t.y === tile.y)) {
      dispatch({ type: 'move', unit: selectedUnit, to: tile })
    } else {
      update({ selectedUnit: null, rejection: null })
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    input,
    endTurn: () => dispatch({ type: 'endTurn' }),
  }
}
