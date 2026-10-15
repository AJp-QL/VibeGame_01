/**
 * BattleSession: the one store both React and Phaser read. It holds the
 * engine's current state, the events of the last action and the UI-only
 * selection, and has no rules of its own: what is legal comes from
 * `legalActions`, odds come from `previewAction`, what happens comes from
 * `applyAction`.
 *
 * Flow (no hover anywhere): tap a Unit → its Moves show; tap a lit tile to
 * Move, or press Attack → enemies in range light up → tap one → preview →
 * confirm or cancel.
 */
import type { Tile } from '@mt/shared'
import {
  applyAction,
  legalActions,
  previewAction,
  type Action,
  type AttackPreview,
  type BattleEvent,
  type BattleState,
  type RejectionCode,
  type UnitId,
} from '@mt/engine'
import type { BattleSessionPort, BattleSnapshot, BoardInput } from '@mt/battle'

/** What the selected Unit is about to do: Move (default) or pick an attack target. */
export type SelectionMode = 'move' | 'attack'

export interface SessionSnapshot extends BattleSnapshot {
  readonly mode: SelectionMode
  /** The selected Unit has at least one enemy it can attack now. */
  readonly canAttack: boolean
  /** Odds of the attack on `pendingTarget`, from the engine. */
  readonly preview: AttackPreview | null
  /** Why the last attempted action was refused, if it was. */
  readonly rejection: RejectionCode | null
  /** Every event so far, oldest first, for the log. */
  readonly log: readonly BattleEvent[]
}

export interface BattleSession extends BattleSessionPort {
  getSnapshot(): SessionSnapshot
  endTurn(): void
  /** Show the enemies the selected Unit can attack. */
  chooseAttack(): void
  /** Carry out the previewed attack. */
  confirmAttack(): void
  /** Step back: drop the previewed target, then leave attack mode, then the selection. */
  cancel(): void
}

/** Derived from the engine on every change; never stored on its own. */
type Computed = 'reachable' | 'targets' | 'canAttack' | 'preview'

function attacksOf(state: BattleState, unit: UnitId | null): UnitId[] {
  if (unit === null) return []
  return legalActions(state).flatMap((action) =>
    action.type === 'basicAttack' && action.unit === unit ? [action.target] : [],
  )
}

function tileOf(state: BattleState, unit: UnitId): Tile[] {
  const found = state.units.find((u) => u.id === unit)
  return found ? [found.tile] : []
}

function compute(base: Omit<SessionSnapshot, Computed>): SessionSnapshot {
  const { state, selectedUnit, mode, pendingTarget } = base
  const attackTargets = attacksOf(state, selectedUnit)
  const reachable =
    selectedUnit === null || mode !== 'move'
      ? []
      : legalActions(state).flatMap((action) => (action.type === 'move' && action.unit === selectedUnit ? [action.to] : []))
  let preview: AttackPreview | null = null
  if (selectedUnit !== null && pendingTarget !== null) {
    const result = previewAction(state, { type: 'basicAttack', unit: selectedUnit, target: pendingTarget })
    preview = result.ok ? result.preview : null
  }
  return {
    ...base,
    reachable,
    targets: mode === 'attack' ? attackTargets.flatMap((target) => tileOf(state, target)) : [],
    canAttack: attackTargets.length > 0,
    preview,
  }
}

export function createBattleSession(initial: BattleState): BattleSession {
  const listeners = new Set<() => void>()
  let snapshot: SessionSnapshot = compute({
    state: initial,
    events: [],
    revision: 0,
    selectedUnit: null,
    mode: 'move',
    pendingTarget: null,
    rejection: null,
    log: [],
  })

  function update(next: Partial<Omit<SessionSnapshot, Computed>>): void {
    snapshot = compute({ ...snapshot, ...next })
    for (const listener of listeners) listener()
  }

  const NO_SELECTION = { selectedUnit: null, mode: 'move', pendingTarget: null } as const

  function dispatch(action: Action): void {
    const result = applyAction(snapshot.state, action)
    if (!result.ok) {
      update({ rejection: result.rejection.code })
      return
    }
    update({
      ...NO_SELECTION,
      state: result.state,
      events: result.events,
      revision: snapshot.revision + 1,
      rejection: null,
      log: [...snapshot.log, ...result.events],
    })
  }

  function input(boardInput: BoardInput): void {
    const { state, selectedUnit, mode, reachable } = snapshot
    if (boardInput.type === 'tapUnit') {
      const tapped = boardInput.unit
      if (mode === 'attack' && selectedUnit !== null && attacksOf(state, selectedUnit).includes(tapped)) {
        update({ pendingTarget: tapped, rejection: null })
        return
      }
      const unit = state.units.find((u) => u.id === tapped)
      const own = unit !== undefined && unit.side === state.sideToAct && state.outcome === null
      update(own && selectedUnit !== tapped ? { ...NO_SELECTION, selectedUnit: tapped, rejection: null } : { ...NO_SELECTION, rejection: null })
      return
    }
    const { tile } = boardInput
    if (selectedUnit !== null && mode === 'move' && reachable.some((t) => t.x === tile.x && t.y === tile.y)) {
      dispatch({ type: 'move', unit: selectedUnit, to: tile })
    } else {
      update({ ...NO_SELECTION, rejection: null })
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
    chooseAttack() {
      if (snapshot.selectedUnit !== null && snapshot.canAttack) {
        update({ mode: 'attack', pendingTarget: null, rejection: null })
      }
    },
    confirmAttack() {
      const { selectedUnit, pendingTarget } = snapshot
      if (selectedUnit !== null && pendingTarget !== null) {
        dispatch({ type: 'basicAttack', unit: selectedUnit, target: pendingTarget })
      }
    },
    cancel() {
      if (snapshot.pendingTarget !== null) update({ pendingTarget: null, rejection: null })
      else if (snapshot.mode === 'attack') update({ mode: 'move', rejection: null })
      else update({ ...NO_SELECTION, rejection: null })
    },
  }
}
