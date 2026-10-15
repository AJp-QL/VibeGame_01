/**
 * BattleSession: the one store both React and Phaser read. It holds the
 * engine's current state, the events of the last action and the UI-only
 * state (selection, attack target, which Hotseat screen is up), and has no
 * rules of its own: what is legal comes from `legalActions`, odds come from
 * `previewAction`, what happens comes from `applyAction`, cooldowns come
 * from `unitSkills`, and what each side may see comes from `unitsVisibleTo`.
 *
 * Attack flow (no hover anywhere): tap a Unit → its Moves show; press Attack
 * (or a skill button) → the targets the engine allows light up (enemies
 * behind a Unit are marked as blocked, with the reason) → tap one → preview →
 * confirm or cancel. A skill without a target (Pack Howl) previews as soon as
 * it is chosen. A tile skill (Blink) lights up its destinations: tap one →
 * preview → confirm. An area skill (Burst) lights up its centres: tap one (a
 * tile or the Unit on it) → its 3x3 area shows and the enemies it may hit
 * light up → tap up to 2 in the order they should be attacked (tap a chosen
 * one again to drop it) → preview per target → confirm; Cancel steps back one
 * choice at a time. Defend is one button. After Hit and Run the tiles of its free
 * step light up: tap one, or stay. Tapping any other Unit shows its card
 * (statuses with their remaining duration).
 *
 * Tamer (rules §15.4, §16): Cover and First Aid light up the allies they may
 * be aimed at (First Aid: the Tamer too); Attune lights up the tiles next to
 * the Tamer (a tile or the Unit on it), then one of the 6 elements is chosen.
 * Command has its own button: the allied Monsters it may order light up →
 * tap one → choose advantage or +1 move → confirm.
 *
 * Inspiration (rules §18): after a d20 the deciding side may reroll, the
 * engine pauses with a pending decision and the UI shows the roll with "use"
 * and "keep" buttons. When the side that must decide is not the one holding
 * the device (a save on the other side's Turn), a hand-over screen covers
 * the Board first, and again when the device must go back.
 */
import { sameTile, type Element, type Tile } from '@mt/shared'
import {
  applyAction,
  areaTiles,
  decidingSide,
  legalActions,
  previewAction,
  unitSkills,
  unitsVisibleTo,
  type Action,
  type ActionPreview,
  type BattleEvent,
  type BattleState,
  type CommandOption,
  type RejectionCode,
  type SkillAvailability,
  type UnitId,
  type UseSkillAction,
} from '@mt/engine'
import type { BattleSessionPort, BattleSnapshot, BoardInput } from '@mt/battle'

/**
 * Hotseat screens that cover the Board:
 * - `handoff`: a side confirmed its deployment; pass the device to the other side.
 * - `initiative`: both sides confirmed; placements are revealed and initiative shown
 *   (with the Inspiration decisions on initiative, rules §17.2).
 * - `decisionHandoff`: the side that must act now changed in the middle of a Turn
 *   (a save's Inspiration decision for the other side, then back): pass the device.
 */
export type HotseatScreen = 'board' | 'handoff' | 'initiative' | 'decisionHandoff'

/** What the selected Unit is about to do: Move (default), pick a Basic Attack target, use a skill, or Command (Tamer). */
export type SelectionMode = 'move' | 'attack' | 'skill' | 'command'

/**
 * An enemy in range that the selected Unit cannot target: Units stand in the
 * way (rules §7), or it is Hidden and 2 or more tiles away (rules §8.2).
 */
export interface BlockedTarget {
  readonly unit: UnitId
  readonly tile: Tile
  /** Why, from the engine's rejection. */
  readonly reason: 'no-line-of-sight' | 'target-hidden'
  /** The Units on the line, from the engine's rejection (empty when Hidden). */
  readonly blockedBy: readonly UnitId[]
}

/** A loadout skill button of the selected Unit. */
export interface SkillButton extends SkillAvailability {
  /** The engine has at least one legal use of it right now. */
  readonly usable: boolean
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
  /** The skill being aimed in `skill` mode. */
  readonly pendingSkill: string | null
  /** Attune: the element chosen for `pendingTile`. */
  readonly pendingElement: Element | null
  /** Attune: the elements the legal actions allow on `pendingTile`, in the engine's order. */
  readonly elementChoices: readonly Element[]
  /** `command` mode: the option chosen for `pendingTarget`. */
  readonly pendingOption: CommandOption | null
  /** The selected Unit is a Tamer that may issue a Command now (rules §16). */
  readonly canCommand: boolean
  /** A Unit tapped to read its card (any side), when it is not the selected one. */
  readonly inspectedUnit: UnitId | null
  /** The selected Unit has at least one enemy it can Basic Attack now. */
  readonly canAttack: boolean
  /** Enemies in range of the selected Unit's attack (or skill) that line of sight or Hidden rule out, from the engine. */
  readonly blocked: readonly BlockedTarget[]
  /** The selected Unit may use Defend now (it is in the legal actions). */
  readonly canDefend: boolean
  /** The selected Unit's loadout with cooldowns, in loadout order (empty during deployment). */
  readonly skills: readonly SkillButton[]
  /** Odds of the action about to be confirmed, from the engine. */
  readonly preview: ActionPreview | null
  /** The action the Confirm button would send, if there is one. */
  readonly ready: Action | null
}

export interface BattleSession extends BattleSessionPort {
  getSnapshot(): SessionSnapshot
  /** Select a Unit of the side to act (or clear the selection), e.g. from the deployment roster. */
  selectUnit(unit: UnitId | null): void
  confirmDeployment(): void
  /** Close the hand-off or initiative screen. */
  continueHotseat(): void
  endTurn(): void
  /** Show the enemies the selected Unit can Basic Attack, and those line of sight blocks. */
  chooseAttack(): void
  /** Aim a loadout skill of the selected Unit: its targets light up, or it previews at once if it needs none. */
  chooseSkill(skill: string): void
  /** The selected Unit uses Defend as its Action. */
  defend(): void
  /** The selected Tamer starts a Command: the Monsters it may order light up (rules §16). */
  chooseCommand(): void
  /** Command: advantage or +1 move for the Monster picked. */
  chooseCommandOption(option: CommandOption): void
  /** Attune: the element for the tile picked. */
  chooseElement(element: Element): void
  /** Carry out the previewed attack or skill. */
  confirmAttack(): void
  /** After Hit and Run: stay instead of stepping. */
  stayInPlace(): void
  /** Answer the pending Inspiration decision: reroll the d20 just seen (rules §18). */
  useInspiration(): void
  /** Answer the pending Inspiration decision: keep the roll. */
  declineInspiration(): void
  /** Step back: drop the previewed target, then leave attack/skill mode, then the selection. */
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
  | 'skills'
  | 'preview'
  | 'ready'
  | 'tileChoices'
  | 'area'
  | 'elementChoices'
  | 'canCommand'

/** The tiles the legal actions let `unit` go to: Move destinations, placements, or Hit and Run's step. */
function moveTiles(actions: readonly Action[], unit: UnitId | null): Tile[] {
  if (unit === null) return []
  return actions.flatMap((action) => {
    if ((action.type === 'move' || action.type === 'deploy') && action.unit === unit) return [action.to]
    if (action.type === 'retreat' && action.unit === unit && action.to !== null) return [action.to]
    return []
  })
}

/** How a skill is aimed in the UI: at a Unit (or nothing), at a tile (Blink), or at a centre then targets (Burst). */
type AimKind = 'unit' | 'tile' | 'area'

function aimKind(state: BattleState, skill: string | null): AimKind {
  const target = skill === null ? undefined : state.skills[skill]?.target
  return target === 'tile' || target === 'area' ? target : 'unit'
}

/** The legal uses of `skill` by `unit`. */
function usesOf(actions: readonly Action[], unit: UnitId | null, skill: string | null): UseSkillAction[] {
  if (unit === null || skill === null) return []
  return actions.flatMap((a) => (a.type === 'useSkill' && a.unit === unit && a.skill === skill ? [a] : []))
}

/** Distinct tiles of the legal uses (Blink's destinations, Burst's centres), in the engine's order. */
function useTiles(uses: readonly UseSkillAction[]): Tile[] {
  const tiles: Tile[] = []
  for (const use of uses) {
    const tile = use.tile
    if (tile !== undefined && !tiles.some((t) => sameTile(t, tile))) tiles.push(tile)
  }
  return tiles
}

const sameTargets = (a: readonly UnitId[] | undefined, b: readonly UnitId[]) =>
  a !== undefined && a.length === b.length && a.every((id, i) => id === b[i])

/** Enemies that may be added next to an area skill's chosen targets around `centre`. */
function nextAreaTargets(uses: readonly UseSkillAction[], centre: Tile | null, chosen: readonly UnitId[]): UnitId[] {
  if (centre === null) return []
  return uses.flatMap((use) => {
    const targets = use.targets
    if (use.tile === undefined || !sameTile(use.tile, centre) || targets === undefined) return []
    if (targets.length !== chosen.length + 1 || !sameTargets(targets.slice(0, chosen.length), chosen)) return []
    const next = targets[chosen.length]
    return next === undefined ? [] : [next]
  })
}

/** The allied Monsters the Tamer `unit` may Command now. */
function commandTargets(actions: readonly Action[], unit: UnitId | null): UnitId[] {
  if (unit === null) return []
  return [...new Set(actions.flatMap((a) => (a.type === 'command' && a.unit === unit ? [a.target] : [])))]
}

/** The Units `unit` may aim at now: Basic Attack targets, or the targets of `skill`. */
function aimTargets(actions: readonly Action[], unit: UnitId | null, skill: string | null): UnitId[] {
  if (unit === null) return []
  return actions.flatMap((action) => {
    if (!('unit' in action) || action.unit !== unit) return []
    if (skill === null && action.type === 'basicAttack') return [action.target]
    if (skill !== null && action.type === 'useSkill' && action.skill === skill && action.target !== undefined) {
      return [action.target]
    }
    return []
  })
}

/**
 * Enemies of `unit` that the engine refuses only because of line of sight or
 * Hidden, for a Basic Attack or `skill`. The engine checks range before
 * both, so these rejections mean the target is in range.
 */
function blockedTargets(state: BattleState, unit: UnitId | null, skill: string | null): BlockedTarget[] {
  if (unit === null || state.phase !== 'play') return []
  const side = state.units.find((u) => u.id === unit)?.side
  return state.units.flatMap((target) => {
    if (target.side === side) return []
    const action: Action =
      skill === null
        ? { type: 'basicAttack', unit, target: target.id }
        : { type: 'useSkill', unit, skill, target: target.id }
    const result = previewAction(state, action)
    if (result.ok) return []
    const reason = result.rejection.code
    if (reason !== 'no-line-of-sight' && reason !== 'target-hidden') return []
    return [{ unit: target.id, tile: target.tile, reason, blockedBy: result.rejection.blockedBy ?? [] }]
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

/** Who is selected after an accepted action: the Unit owing a step, a Unit to place, or nobody. */
function selectionAfter(state: BattleState): UnitId | null {
  return state.pending?.kind === 'retreat' ? state.pending.unit : firstUnplaced(state)
}

/**
 * The cover after an accepted action in play: hand the device over when the
 * side that must act changed without a Turn ending (an Inspiration decision
 * for the other side, or back after it). Initiative keeps its own screen.
 */
function screenAfter(before: BattleState, after: BattleState, action: Action): HotseatScreen {
  if (before.phase === 'play' && before.firstSide === null) return 'initiative'
  if (action.type === 'endTurn' || after.outcome !== null || after.phase !== 'play') return 'board'
  return decidingSide(after) === decidingSide(before) ? 'board' : 'decisionHandoff'
}

/** No attack or skill in progress. */
const NO_AIM = {
  mode: 'move',
  pendingTarget: null,
  pendingSkill: null,
  pendingTile: null,
  chosenTargets: [],
  pendingElement: null,
  pendingOption: null,
} as const

export function createBattleSession(initial: BattleState): BattleSession {
  const listeners = new Set<() => void>()

  /** The action Confirm would send now, from the legal actions only. */
  function readyAction(base: Omit<SessionSnapshot, Computed>, actions: readonly Action[]): Action | null {
    const { selectedUnit, mode, pendingTarget, pendingSkill, pendingTile, chosenTargets, pendingElement, pendingOption } = base
    if (selectedUnit === null) return null
    const legal = (match: (a: Action) => boolean) => actions.find(match) ?? null
    if (mode === 'attack' && pendingTarget !== null) {
      return legal((a) => a.type === 'basicAttack' && a.unit === selectedUnit && a.target === pendingTarget)
    }
    if (mode === 'command') {
      if (pendingTarget === null || pendingOption === null) return null
      return legal((a) => a.type === 'command' && a.unit === selectedUnit && a.target === pendingTarget && a.option === pendingOption)
    }
    const kind = aimKind(base.state, pendingSkill)
    if (mode === 'skill' && kind !== 'unit') {
      if (pendingTile === null || (kind === 'area' && chosenTargets.length === 0)) return null
      const tile = pendingTile
      return (
        usesOf(actions, selectedUnit, pendingSkill).find(
          (a) =>
            a.tile !== undefined &&
            sameTile(a.tile, tile) &&
            // Attune: also the element chosen.
            (a.element === undefined || a.element === pendingElement) &&
            (kind === 'tile' || sameTargets(a.targets, chosenTargets)),
        ) ?? null
      )
    }
    if (mode === 'skill' && pendingSkill !== null) {
      return legal(
        (a) =>
          a.type === 'useSkill' &&
          a.unit === selectedUnit &&
          a.skill === pendingSkill &&
          (a.target === undefined ? a.targets === undefined && a.tile === undefined : a.target === pendingTarget),
      )
    }
    return null
  }

  function snapshotOf(base: Omit<SessionSnapshot, Computed>): SessionSnapshot {
    const { state, selectedUnit, mode, pendingSkill, pendingTile, chosenTargets } = base
    const actions = legalActions(state)
    const aimingSkill = mode === 'skill' ? pendingSkill : null
    const kind = aimKind(state, aimingSkill)
    const uses = kind === 'unit' ? [] : usesOf(actions, selectedUnit, aimingSkill)
    const targets =
      mode === 'command'
        ? commandTargets(actions, selectedUnit)
        : kind === 'area'
          ? nextAreaTargets(uses, pendingTile, chosenTargets)
          : kind === 'tile'
            ? []
            : aimTargets(actions, selectedUnit, aimingSkill)
    const basicTargets = aimingSkill === null ? targets : aimTargets(actions, selectedUnit, null)
    const blocked =
      mode === 'move'
        ? blockedTargets(state, selectedUnit, null)
        : mode === 'command'
          ? []
          : kind === 'unit'
          ? blockedTargets(state, selectedUnit, aimingSkill)
          : []
    const aimedSkill = aimingSkill === null ? undefined : state.skills[aimingSkill]
    const ready = readyAction(base, actions)
    let preview: ActionPreview | null = null
    if (ready !== null) {
      const result = previewAction(state, ready)
      preview = result.ok ? result.preview : null
    }
    const selected = selectedUnit === null ? undefined : state.units.find((u) => u.id === selectedUnit)
    const skills: SkillButton[] =
      selected === undefined || state.phase !== 'play'
        ? []
        : unitSkills(state, selected.id).map((skill) => ({
            ...skill,
            usable: actions.some((a) => a.type === 'useSkill' && a.unit === selected.id && a.skill === skill.skill),
          }))
    const tilesOf = (ids: readonly UnitId[]) =>
      ids.flatMap((id) => {
        const unit = state.units.find((u) => u.id === id)
        return unit ? [unit.tile] : []
      })
    const aiming = mode !== 'move'
    const elementChoices: Element[] = []
    if (kind === 'tile' && pendingTile !== null) {
      for (const use of uses) {
        if (use.element !== undefined && use.tile !== undefined && sameTile(use.tile, pendingTile) && !elementChoices.includes(use.element)) {
          elementChoices.push(use.element)
        }
      }
    }
    return {
      ...base,
      // Hotseat: the player holding the device is the side to act.
      units: unitsVisibleTo(state, state.sideToAct),
      canAct: unitsThatCanAct(actions),
      reachable: mode === 'move' || state.pending !== null ? moveTiles(actions, selectedUnit) : [],
      targets: aiming ? tilesOf(targets) : [],
      blockedTargets: aiming ? blocked.map((b) => b.tile) : [],
      canAttack: basicTargets.length > 0,
      blocked,
      canDefend: actions.some((a) => a.type === 'defend' && a.unit === selectedUnit),
      skills,
      preview,
      ready,
      // Burst's centres until one is picked; Blink's destinations all along (tap another to change).
      tileChoices: kind === 'tile' || (kind === 'area' && pendingTile === null) ? useTiles(uses) : [],
      area: kind === 'area' && pendingTile !== null && aimedSkill !== undefined ? areaTiles(aimedSkill, pendingTile) : [],
      elementChoices,
      canCommand: commandTargets(actions, selectedUnit).length > 0,
    }
  }

  let snapshot = snapshotOf({
    state: initial,
    events: [],
    revision: 0,
    selectedUnit: firstUnplaced(initial),
    ...NO_AIM,
    inspectedUnit: null,
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
    const before = snapshot.state
    const result = applyAction(before, action)
    if (!result.ok) {
      update({ rejection: result.rejection.code })
      return
    }
    update({
      screen: screenAfter(before, result.state, action),
      state: result.state,
      events: result.events,
      revision: snapshot.revision + 1,
      selectedUnit: selectionAfter(result.state),
      ...NO_AIM,
      inspectedUnit: null,
      rejection: null,
      log: [...snapshot.log, ...result.events],
      actions: [...snapshot.actions, action],
      ...after(result.state),
    })
  }

  function selectUnit(unit: UnitId | null): void {
    const { state, selectedUnit } = snapshot
    // A pending decision (Hit and Run's step, Inspiration) keeps the selection.
    if (state.pending !== null) return
    const own = unit !== null && unit.startsWith(`${state.sideToAct}.`) && state.outcome === null
    // In play, choosing the selected Unit again clears the selection.
    const toggleOff = state.phase === 'play' && unit === selectedUnit
    // Any other Unit on the Board is shown, not selected (its card, statuses included).
    const inspect = state.phase === 'play' && unit !== null && !own && state.units.some((u) => u.id === unit) ? unit : null
    update({ selectedUnit: own && !toggleOff ? unit : null, ...NO_AIM, inspectedUnit: inspect, rejection: null })
  }

  /** Whether `tile` is a centre the selected Unit may give the area skill being aimed. */
  function isCentre(tile: Tile): boolean {
    if (snapshot.mode !== 'skill' || aimKind(snapshot.state, snapshot.pendingSkill) !== 'area') return false
    const uses = usesOf(legalActions(snapshot.state), snapshot.selectedUnit, snapshot.pendingSkill)
    return useTiles(uses).some((t) => sameTile(t, tile))
  }

  /**
   * A tap on a Unit while aiming an area skill: add it as the next target,
   * drop it (and those chosen after it) if already chosen, or take its tile
   * as the centre. `false` when the tap means none of these.
   */
  function aimArea(unit: UnitId): boolean {
    const { state, pendingTile, chosenTargets, targets } = snapshot
    const tapped = state.units.find((u) => u.id === unit)
    if (tapped === undefined) return false
    const index = chosenTargets.indexOf(unit)
    if (index >= 0) {
      update({ chosenTargets: chosenTargets.slice(0, index), rejection: null })
      return true
    }
    if (pendingTile !== null && targets.some((t) => sameTile(t, tapped.tile))) {
      update({ chosenTargets: [...chosenTargets, unit], rejection: null })
      return true
    }
    if (isCentre(tapped.tile)) {
      update({ pendingTile: tapped.tile, chosenTargets: [], rejection: null })
      return true
    }
    return false
  }

  function input(boardInput: BoardInput): void {
    const { state, selectedUnit, reachable, mode } = snapshot
    if (boardInput.type === 'tapUnit') {
      if (state.pending !== null) {
        const owing = state.pending.kind === 'retreat' ? state.pending.unit : null
        update({ inspectedUnit: boardInput.unit === owing ? null : boardInput.unit })
        return
      }
      if (mode === 'command') {
        if (commandTargets(legalActions(state), selectedUnit).includes(boardInput.unit)) {
          update({ pendingTarget: boardInput.unit, pendingOption: null, rejection: null })
          return
        }
      } else if (mode === 'skill' && aimKind(state, snapshot.pendingSkill) === 'area') {
        if (aimArea(boardInput.unit)) return
      } else if (mode === 'skill' && aimKind(state, snapshot.pendingSkill) === 'tile') {
        // Attune may change the tile a Unit stands on: a tap on that Unit picks its tile.
        const tapped = state.units.find((u) => u.id === boardInput.unit)
        if (tapped !== undefined && snapshot.tileChoices.some((t) => sameTile(t, tapped.tile))) {
          update({ pendingTile: tapped.tile, pendingElement: null, rejection: null })
          return
        }
      } else if (mode !== 'move') {
        const skill = mode === 'skill' ? snapshot.pendingSkill : null
        if (aimTargets(legalActions(state), selectedUnit, skill).includes(boardInput.unit)) {
          update({ pendingTarget: boardInput.unit, rejection: null })
          return
        }
        const blocked = snapshot.blocked.find((b) => b.unit === boardInput.unit)
        if (blocked !== undefined) {
          // Not selectable: say why instead of dropping the selection.
          update({ pendingTarget: null, rejection: blocked.reason })
          return
        }
      }
      selectUnit(boardInput.unit)
      return
    }
    const { tile } = boardInput
    if (mode === 'skill' && (snapshot.tileChoices.some((t) => sameTile(t, tile)) || isCentre(tile))) {
      // A destination or centre (another centre after one was picked starts over from it).
      update({ pendingTile: tile, chosenTargets: [], pendingElement: null, rejection: null })
      return
    }
    const onReachable = reachable.some((t) => t.x === tile.x && t.y === tile.y)
    if (state.pending !== null) {
      if (onReachable && state.pending.kind === 'retreat') dispatch({ type: 'retreat', unit: state.pending.unit, to: tile })
      return
    }
    if (selectedUnit !== null && mode === 'move' && onReachable) {
      dispatch({ type: state.phase === 'deployment' ? 'deploy' : 'move', unit: selectedUnit, to: tile })
    } else {
      update({
        selectedUnit: state.phase === 'deployment' ? selectedUnit : null,
        ...NO_AIM,
        inspectedUnit: null,
        rejection: null,
      })
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
        update({ ...NO_AIM, mode: 'attack', rejection: null })
      }
    },
    chooseSkill(skill) {
      const button = snapshot.skills.find((s) => s.skill === skill)
      if (snapshot.selectedUnit === null || button === undefined) return
      const blocked = blockedTargets(snapshot.state, snapshot.selectedUnit, skill)
      if (button.usable || blocked.length > 0) {
        update({ mode: 'skill', pendingSkill: skill, pendingTarget: null, pendingTile: null, chosenTargets: [], rejection: null })
      }
    },
    defend() {
      const { selectedUnit } = snapshot
      if (selectedUnit !== null) dispatch({ type: 'defend', unit: selectedUnit })
    },
    chooseCommand() {
      if (snapshot.selectedUnit !== null && snapshot.canCommand) update({ ...NO_AIM, mode: 'command', rejection: null })
    },
    chooseCommandOption(option) {
      if (snapshot.mode === 'command' && snapshot.pendingTarget !== null) update({ pendingOption: option, rejection: null })
    },
    chooseElement(element) {
      if (snapshot.elementChoices.includes(element)) update({ pendingElement: element, rejection: null })
    },
    confirmAttack() {
      if (snapshot.ready !== null) dispatch(snapshot.ready)
    },
    stayInPlace() {
      const pending = snapshot.state.pending
      if (pending?.kind === 'retreat') dispatch({ type: 'retreat', unit: pending.unit, to: null })
    },
    useInspiration() {
      const pending = snapshot.state.pending
      if (pending?.kind === 'inspiration') dispatch({ type: 'useInspiration', side: pending.side })
    },
    declineInspiration() {
      const pending = snapshot.state.pending
      if (pending?.kind === 'inspiration') dispatch({ type: 'declineInspiration', side: pending.side })
    },
    cancel() {
      if (snapshot.state.pending !== null) return
      if (snapshot.chosenTargets.length > 0) update({ chosenTargets: snapshot.chosenTargets.slice(0, -1), rejection: null })
      else if (snapshot.pendingElement !== null) update({ pendingElement: null, rejection: null })
      else if (snapshot.pendingOption !== null) update({ pendingOption: null, rejection: null })
      else if (snapshot.pendingTile !== null) {
        update({ pendingTile: null, rejection: null })
      } else if (snapshot.pendingTarget !== null) update({ pendingTarget: null, rejection: null })
      else if (snapshot.mode !== 'move') update({ ...NO_AIM, rejection: null })
      else update({ selectedUnit: null, inspectedUnit: null, rejection: null })
    },
  }
}
