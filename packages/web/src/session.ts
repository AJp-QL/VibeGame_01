/**
 * BattleSession: the one store both React and Phaser read. It holds the
 * engine's current state, the events of the last action and the UI-only
 * state (selection, attack target, which Hotseat screen is up), and has no
 * rules of its own: what is legal comes from `legalActions`, odds come from
 * `previewAction`, what happens comes from `applyAction`, and what each side
 * may see comes from `unitsVisibleTo`.
 *
 * Attack flow (no hover anywhere): tap a Unit → its Moves show; press Attack
 * → enemies in range light up (those behind a Unit are marked as blocked,
 * with the reason) → tap one → preview → confirm or cancel. Defend is one
 * button: the selected Unit uses its Action to become Guarded.
 */
import type { Tile } from '@mt/shared'
import {
  applyAction,
  legalActions,
  previewAction,
  unitsVisibleTo,
  type Action,
  type AttackPreview,
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

/** What the selected Unit is about to do: Move (default) or pick an attack target. */
export type SelectionMode = 'move' | 'attack'

/** An enemy in range that the selected Unit cannot attack because Units stand in the way (rules §7). */
export interface BlockedTarget {
  readonly unit: UnitId
  readonly tile: Tile
  /** The Units on the line, from the engine's rejection. */
  readonly blockedBy: readonly UnitId[]
}

export interface SessionSnapshot extends BattleSnapshot {
  /** Why the last attempted action was refused, if it was. */
  readonly rejection: RejectionCode | null
  /** Every event so far, oldest first, for the log. */
  readonly log: readonly BattleEvent[]
  /** Every action the engine accepted, in order: with the Dice Seed, this is the Battle's Replay. */
  readonly actions: readonly Action[]
  readonly screen: HotseatScreen
  readonly mode: SelectionMode
  /** The selected Unit has at least one enemy it can attack now. */
  readonly canAttack: boolean
  /** Enemies in range of the selected Unit that line of sight blocks, from the engine. */
  readonly blocked: readonly BlockedTarget[]
  /** The selected Unit may use Defend now (it is in the legal actions). */
  readonly canDefend: boolean
  /** Odds of the attack on `pendingTarget`, from the engine. */
  readonly preview: AttackPreview | null
}

export interface BattleSession extends BattleSessionPort {
  getSnapshot(): SessionSnapshot
  /** Select a Unit of the side to act (or clear the selection), e.g. from the deployment roster. */
  selectUnit(unit: UnitId | null): void
  confirmDeployment(): void
  /** Close the hand-off or initiative screen. */
  continueHotseat(): void
  endTurn(): void
  /** Show the enemies the selected Unit can attack, and those line of sight blocks. */
  chooseAttack(): void
  /** The selected Unit uses Defend as its Action. */
  defend(): void
  /** Carry out the previewed attack. */
  confirmAttack(): void
  /** Step back: drop the previewed target, then leave attack mode, then the selection. */
  cancel(): void
}

/** Derived from the engine on every change; never stored on its own. */
type Computed =
  | 'units'
  | 'canAct'
  | 'reachable'
  | 'targets'
  | 'blockedTargets'
  | 'canAttack'
  | 'blocked'
  | 'canDefend'
  | 'preview'

/** The tiles the legal actions let `unit` go to: Move destinations, or placements during deployment. */
function moveTiles(actions: readonly Action[], unit: UnitId | null): Tile[] {
  if (unit === null) return []
  return actions.flatMap((action) =>
    (action.type === 'move' || action.type === 'deploy') && action.unit === unit ? [action.to] : [],
  )
}

/** The enemies `unit` may attack now, from the legal actions. */
function attackTargets(actions: readonly Action[], unit: UnitId | null): UnitId[] {
  if (unit === null) return []
  return actions.flatMap((action) => (action.type === 'basicAttack' && action.unit === unit ? [action.target] : []))
}

/**
 * Enemies in range of `unit` that the engine refuses only because of line of
 * sight. The engine checks range before line of sight, so this rejection
 * means the target is in range.
 */
function blockedTargets(state: BattleState, unit: UnitId | null): BlockedTarget[] {
  if (unit === null || state.phase !== 'play') return []
  const side = state.units.find((u) => u.id === unit)?.side
  return state.units.flatMap((target) => {
    if (target.side === side) return []
    const result = previewAction(state, { type: 'basicAttack', unit, target: target.id })
    if (result.ok || result.rejection.code !== 'no-line-of-sight') return []
    return [{ unit: target.id, tile: target.tile, blockedBy: result.rejection.blockedBy ?? [] }]
  })
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

/** No attack in progress. */
const NO_ATTACK = { mode: 'move', pendingTarget: null } as const

export function createBattleSession(initial: BattleState): BattleSession {
  const listeners = new Set<() => void>()

  function snapshotOf(base: Omit<SessionSnapshot, Computed>): SessionSnapshot {
    const { state, selectedUnit, mode, pendingTarget } = base
    const actions = legalActions(state)
    const targets = attackTargets(actions, selectedUnit)
    const blocked = blockedTargets(state, selectedUnit)
    let preview: AttackPreview | null = null
    if (selectedUnit !== null && pendingTarget !== null) {
      const result = previewAction(state, { type: 'basicAttack', unit: selectedUnit, target: pendingTarget })
      preview = result.ok ? result.preview : null
    }
    return {
      ...base,
      // Hotseat: the player holding the device is the side to act.
      units: unitsVisibleTo(state, state.sideToAct),
      canAct: unitsThatCanAct(actions),
      reachable: mode === 'move' ? moveTiles(actions, selectedUnit) : [],
      targets:
        mode === 'attack'
          ? targets.flatMap((id) => {
              const unit = state.units.find((u) => u.id === id)
              return unit ? [unit.tile] : []
            })
          : [],
      blockedTargets: mode === 'attack' ? blocked.map((b) => b.tile) : [],
      canAttack: targets.length > 0,
      blocked,
      canDefend: actions.some((a) => a.type === 'defend' && a.unit === selectedUnit),
      preview,
    }
  }

  let snapshot = snapshotOf({
    state: initial,
    events: [],
    revision: 0,
    selectedUnit: firstUnplaced(initial),
    ...NO_ATTACK,
    rejection: null,
    log: [],
    actions: [],
    screen: 'board',
  })

  function update(next: Partial<Omit<SessionSnapshot, Computed>>): void {
    snapshot = snapshotOf({ ...snapshot, ...next })
    for (const listener of listeners) listener()
  }

  /** Apply an action; `after` adds UI state that depends on the new Battle state. */
  function dispatch(
    action: Action,
    after: (state: BattleState) => Partial<Omit<SessionSnapshot, Computed>> = () => ({}),
  ): void {
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
      ...NO_ATTACK,
      rejection: null,
      log: [...snapshot.log, ...result.events],
      actions: [...snapshot.actions, action],
      ...after(result.state),
    })
  }

  function selectUnit(unit: UnitId | null): void {
    const { state, selectedUnit } = snapshot
    const own = unit !== null && unit.startsWith(`${state.sideToAct}.`) && state.outcome === null
    // In play, choosing the selected Unit again clears the selection.
    const toggleOff = state.phase === 'play' && unit === selectedUnit
    update({ selectedUnit: own && !toggleOff ? unit : null, ...NO_ATTACK, rejection: null })
  }

  function input(boardInput: BoardInput): void {
    const { state, selectedUnit, reachable, mode } = snapshot
    if (boardInput.type === 'tapUnit') {
      if (mode === 'attack' && attackTargets(legalActions(state), selectedUnit).includes(boardInput.unit)) {
        update({ pendingTarget: boardInput.unit, rejection: null })
        return
      }
      if (mode === 'attack' && snapshot.blocked.some((b) => b.unit === boardInput.unit)) {
        // Not selectable: say why instead of dropping the selection.
        update({ pendingTarget: null, rejection: 'no-line-of-sight' })
        return
      }
      selectUnit(boardInput.unit)
      return
    }
    const { tile } = boardInput
    if (selectedUnit !== null && mode === 'move' && reachable.some((t) => t.x === tile.x && t.y === tile.y)) {
      dispatch({ type: state.phase === 'deployment' ? 'deploy' : 'move', unit: selectedUnit, to: tile })
    } else {
      update({ selectedUnit: state.phase === 'deployment' ? selectedUnit : null, ...NO_ATTACK, rejection: null })
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
    chooseAttack() {
      if (snapshot.selectedUnit !== null && (snapshot.canAttack || snapshot.blocked.length > 0)) {
        update({ mode: 'attack', pendingTarget: null, rejection: null })
      }
    },
    defend() {
      const { selectedUnit } = snapshot
      if (selectedUnit !== null) dispatch({ type: 'defend', unit: selectedUnit })
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
      else update({ selectedUnit: null, rejection: null })
    },
  }
}
