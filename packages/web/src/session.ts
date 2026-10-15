/**
 * BattleSession: the one store both React and Phaser read. It holds the
 * engine's current state, the events of the last action and the UI-only
 * state (selection, which Hotseat screen is up), and has no rules of its
 * own: what is legal comes from `legalActions`, what happens comes from
 * `applyAction`, and what each side may see comes from `unitsVisibleTo`.
 */
import type { Tile } from '@mt/shared'
import {
  applyAction,
  legalActions,
  unitsVisibleTo,
  type Action,
  type BattleEvent,
  type BattleState,
  type RejectionCode,
  type UnitId,
} from '@mt/engine'
import type { BattleSessionPort, BattleSnapshot, BoardInput } from '@mt/battle'

/**
 * Hotseat screens that cover the Board:
 * - `handoff`: a side confirmed its deployment; pass the device to the other side.
 * - `initiative`: both sides confirmed; placements are revealed and initiative shown.
 */
export type HotseatScreen = 'board' | 'handoff' | 'initiative'

export interface SessionSnapshot extends BattleSnapshot {
  /** Why the last attempted action was refused, if it was. */
  readonly rejection: RejectionCode | null
  /** Every event so far, oldest first, for the log. */
  readonly log: readonly BattleEvent[]
  readonly screen: HotseatScreen
}

export interface BattleSession extends BattleSessionPort {
  getSnapshot(): SessionSnapshot
  /** Select a Unit of the side to act (or clear the selection), e.g. from the deployment roster. */
  selectUnit(unit: UnitId | null): void
  confirmDeployment(): void
  /** Close the hand-off or initiative screen. */
  continueHotseat(): void
  endTurn(): void
}

/** The tiles the legal actions let `unit` go to: Move destinations, or placements during deployment. */
function targetTiles(actions: readonly Action[], unit: UnitId | null): Tile[] {
  if (unit === null) return []
  return actions.flatMap((action) =>
    (action.type === 'move' || action.type === 'deploy') && action.unit === unit ? [action.to] : [],
  )
}

/** Units of the side to act that have at least one legal action. */
function unitsThatCanAct(actions: readonly Action[]): UnitId[] {
  return [...new Set(actions.flatMap((action) => ('unit' in action ? [action.unit] : [])))]
}

/**
 * Units of the side to act that have not started an activation this Turn
 * but still could: End Turn warns about these (spec user story 32).
 */
export function idleUnits(state: BattleState): UnitId[] {
  if (state.phase !== 'play') return []
  return unitsThatCanAct(legalActions(state)).filter((id) => !state.activations.started.includes(id))
}

/** During deployment: the first Unit of the side placing that has no tile yet. */
function firstUnplaced(state: BattleState): UnitId | null {
  const deployment = state.deployment
  if (state.phase !== 'deployment' || deployment === null) return null
  const placed = deployment.placements[state.sideToAct]
  return deployment.roster.find((u) => u.side === state.sideToAct && placed[u.id] === undefined)?.id ?? null
}

export function createBattleSession(initial: BattleState): BattleSession {
  const listeners = new Set<() => void>()

  function snapshotOf(base: Omit<SessionSnapshot, 'units' | 'canAct' | 'reachable'>): SessionSnapshot {
    const actions = legalActions(base.state)
    return {
      ...base,
      // Hotseat: the player holding the device is the side to act.
      units: unitsVisibleTo(base.state, base.state.sideToAct),
      canAct: unitsThatCanAct(actions),
      reachable: targetTiles(actions, base.selectedUnit),
    }
  }

  let snapshot = snapshotOf({
    state: initial,
    events: [],
    revision: 0,
    selectedUnit: firstUnplaced(initial),
    rejection: null,
    log: [],
    screen: 'board',
  })

  function update(next: Partial<SessionSnapshot>): void {
    snapshot = snapshotOf({ ...snapshot, ...next })
    for (const listener of listeners) listener()
  }

  /** Apply an action; `after` adds UI state that depends on the new Battle state. */
  function dispatch(action: Action, after: (state: BattleState) => Partial<SessionSnapshot> = () => ({})): void {
    const result = applyAction(snapshot.state, action)
    if (!result.ok) {
      update({ rejection: result.rejection.code })
      return
    }
    update({
      state: result.state,
      events: result.events,
      revision: snapshot.revision + 1,
      selectedUnit: firstUnplaced(result.state),
      rejection: null,
      log: [...snapshot.log, ...result.events],
      ...after(result.state),
    })
  }

  function selectUnit(unit: UnitId | null): void {
    const { state, selectedUnit } = snapshot
    const own = unit !== null && unit.startsWith(`${state.sideToAct}.`)
    // In play, choosing the selected Unit again clears the selection.
    const toggleOff = state.phase === 'play' && unit === selectedUnit
    update({ selectedUnit: own && !toggleOff ? unit : null, rejection: null })
  }

  function input(boardInput: BoardInput): void {
    const { state, selectedUnit, reachable } = snapshot
    if (boardInput.type === 'tapUnit') {
      selectUnit(boardInput.unit)
      return
    }
    const { tile } = boardInput
    if (selectedUnit !== null && reachable.some((t) => t.x === tile.x && t.y === tile.y)) {
      dispatch({ type: state.phase === 'deployment' ? 'deploy' : 'move', unit: selectedUnit, to: tile })
    } else {
      update({ selectedUnit: state.phase === 'deployment' ? selectedUnit : null, rejection: null })
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    input,
    selectUnit,
    confirmDeployment() {
      // Cover the Board until the next player is ready (hand-off) or has seen initiative.
      dispatch({ type: 'confirmDeployment' }, (state) => ({
        screen: state.phase === 'play' ? 'initiative' : 'handoff',
        selectedUnit: null,
      }))
    },
    continueHotseat() {
      update({ screen: 'board', selectedUnit: firstUnplaced(snapshot.state) })
    },
    endTurn: () => dispatch({ type: 'endTurn' }),
  }
}
