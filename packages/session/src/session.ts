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
 *
 * Against the AI (spec user stories 9, 12, 51): the human plays one team and
 * sees what that team may see; the AI (@mt/ai) works out its deployment
 * before the human places (rules §17.1) and plays every decision of its side
 * through the engine like a player, one action per `aiStep` (the UI calls it
 * with a short delay so each action shows on the Board and in the log; the
 * delay is the UI's: the session has no timers). No
 * hand-over screens; the human can only act when it is the human's decision.
 */
import { sameTile, type Element, type Side, type Tile } from '@mt/shared'
import { chooseAction, createAi, planDeployment, type AiProfile, type AiState } from '@mt/ai'
import {
  applyAction,
  areaTiles,
  boardSizeOf,
  decidingSide,
  legalActions,
  previewAction,
  undoPoint,
  unitSkills,
  unitsVisibleTo,
  type Action,
  type ActionPreview,
  type BattleEvent,
  type BattleState,
  type CommandOption,
  type Rejection,
  type RejectionCode,
  type SkillAvailability,
  type UndoLabel,
  type UnitId,
  type UseSkillAction,
} from '@mt/engine'
import type { BattleSessionPort, BattleSnapshot, BoardInput } from './port.ts'
import {
  attackableEnemies,
  buildPlan,
  choicesOf,
  originViews,
  sameOrigin,
  type ActionPlan,
  type AttackableEnemy,
  type PlanChoice,
  type PlanOrigin,
} from './actionPlan.ts'

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
  /** The Units on the line, from the engine's rejection (empty when Hidden or only terrain blocks). */
  readonly blockedBy: readonly UnitId[]
  /**
   * The tiles on the line whose terrain blocks sight (rules §7.2), from the engine's
   * rejection; empty when none does (also when Hidden). Set together with `blockedBy`
   * when both Units and terrain stand in the way. The session always sets it; the field
   * is optional only so that code that builds a `BlockedTarget` itself keeps compiling.
   */
  readonly blockedByTerrain?: readonly Tile[]
}

/** What one attack option could reach from a previewed tile (Move preview). */
export interface MoveReach {
  /** The skill id; `null` is the Basic Attack. */
  readonly skill: string | null
  /** Enemies the engine would let it target from the tile, in the engine's order. */
  readonly targets: readonly UnitId[]
  /** Enemies in range that line of sight or Hidden rule out from the tile. */
  readonly blocked: readonly BlockedTarget[]
}

/**
 * The selected Unit as if it stood on a tile it has not moved to (spec: Move
 * preview). Worked out by the engine on a copy of the Battle: the Move (or
 * Blink) is applied there and the legal actions read from the result. The
 * Battle itself does not change and no die is rolled.
 */
export interface MovePreview {
  readonly unit: UnitId
  readonly tile: Tile
  /** The skill that gets it there (Blink), or `null` for a plain Move. */
  readonly skill: string | null
  /** The Basic Attack and each ready attack skill, with whom it could reach from `tile`. */
  readonly reach: readonly MoveReach[]
  /**
   * Everything the engine lets the Unit do from `tile` (Action plan, ticket 23): an attack on
   * each enemy it reaches, Defend and the skills that are not attacks. `choosePlanAction(key)` plans one.
   */
  readonly options: readonly PlanChoice[]
}

/**
 * Undo (rules §17.5, D-30): what the button would do. `to` says where it goes
 * back to, `actions` how many actions it withdraws.
 */
export interface UndoOffer {
  /** The start of the Turn, or just after the last dice roll or Inspiration answer, whichever came later. */
  readonly to: UndoLabel
  readonly actions: number
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
  /**
   * Undo: set when the side to act, here at the device, can go back to the safe
   * point of this Turn (there is an action after it); `null` otherwise, and
   * always during the AI's Turn or a hand-over screen (spec stories 14-22).
   */
  readonly undo: UndoOffer | null
  /**
   * Events of each action the last accepted command sent, in order. A command that sends one
   * action (almost all) has one entry equal to `events`; `confirmPlan` sends a Move and an
   * Action, so a view can walk the Unit before it attacks. `events` keeps its meaning (the last action's).
   */
  readonly eventBatches: readonly (readonly BattleEvent[])[]
  /** Action plan: the enemies the selected Unit can attack in this activation, and from where (empty when nothing can be done). */
  readonly attackable: readonly AttackableEnemy[]
  /** Action plan: the enemy picked (UI state), if any. */
  readonly planTarget: UnitId | null
  /** Action plan: the tile and way the player picked to act from, if any (else the session suggests one). */
  readonly planOrigin: Pick<PlanOrigin, 'tile' | 'via'> | null
  /** Action plan: the `PlanChoice.key` the player picked, if any (else the first attack on the target). */
  readonly planChoice: string | null
  /** Action plan: where the selected Unit would act from and what it would do; `null` until a target or choice is picked. */
  readonly plan: ActionPlan | null
  /** Move preview: the reachable tile being looked at (UI state, not game state), or `null`. */
  readonly movePreviewTile: Tile | null
  /**
   * Move preview: what the selected Unit could do from `movePreviewTile`, or from
   * the destination of a Blink being aimed. `null` when there is no preview.
   */
  readonly movePreview: MovePreview | null
  /**
   * The Unit playing now when it can still use its Action: starting another Unit
   * ends its activation and loses that Action (`actionAtStake`), so the UI asks
   * first. `null` when nothing would be lost, e.g. the Unit has no legal Action left.
   */
  readonly actionAtStake: UnitId | null
  /** Units of the side to act that moved this Turn but have not used their Action and still can: End Turn warns about these. */
  readonly movedWithoutAction: readonly UnitId[]
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
  /** Against the AI: the team the AI plays; `null` in Hotseat. */
  readonly aiSide: Side | null
  /** Against the AI: the AI has the next decision and `aiStep` will play it. */
  readonly aiToAct: boolean
}

/** Play against the AI: it plays `side` with `profile`; the human plays the other team. */
export interface AiOpponent {
  readonly side: Side
  readonly profile: AiProfile
}

export interface SessionOptions {
  readonly ai?: AiOpponent
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
  /**
   * Go back to the safe point of this Turn (`snapshot.undo`): the Battle, its
   * activations and the actions list return to that point; the dice are as they
   * were. Does nothing when `snapshot.undo` is `null`.
   */
  undo(): void
  /** Move preview: look at a reachable tile with the selected Unit as if it stood there; another tile replaces it. Nothing moves. */
  previewMove(tile: Tile): void
  /** Move preview: drop the previewed tile. */
  cancelMovePreview(): void
  /** Move preview: carry out the previewed Move, or the Blink being aimed. */
  confirmMove(): void
  /**
   * Action plan (ticket 23): pick an enemy of `snapshot.attackable` to attack. The session chooses
   * where from: the Move preview's tile if it reaches the enemy, else the tile the Unit stands on,
   * else the fewest steps, then tile order. Nothing is sent until `confirmPlan`.
   */
  aimTarget(unit: UnitId): void
  /** Action plan: act from another of `plan.originChoices` (a Move is preferred to a Blink to the same tile). */
  chooseOrigin(tile: Tile, via?: PlanOrigin['via']): void
  /**
   * Action plan: pick what to do, by `PlanChoice.key`, from `plan.choices` or from the Move preview's
   * `options` (a skill, an attack on another enemy, Defend or a support skill from the shadow tile).
   */
  choosePlanAction(key: string): void
  /**
   * Action plan: send the Move (or Blink), then the Action, as the same actions played one by one
   * would be; both or neither (if the engine refused the second, the Move is not made). The
   * caller asks first when `plan.abandons` is set (ticket 02).
   */
  confirmPlan(): void
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
  /** Against the AI: play the AI's next action if it has the decision (`aiToAct`); `true` if it did. */
  aiStep(): boolean
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
  | 'movePreview'
  | 'attackable'
  | 'plan'
  | 'undo'
  | 'canCommand'
  | 'actionAtStake'
  | 'movedWithoutAction'
  | 'aiToAct'

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
    return [blockedTarget(target, reason, result.rejection)]
  })
}

/** One `BlockedTarget` out of the engine's rejection. */
function blockedTarget(target: { readonly id: UnitId; readonly tile: Tile }, reason: BlockedTarget['reason'], rejection: Rejection): BlockedTarget {
  return {
    unit: target.id,
    tile: target.tile,
    reason,
    blockedBy: rejection.blockedBy ?? [],
    blockedByTerrain: rejection.blockedByTerrain ?? [],
  }
}

/**
 * Enemies that an area skill (Burst) around `centre` cannot take as its next
 * target only because they are Hidden (or behind a Unit): the same reasons a
 * single-target skill shows, so they are not silently left out.
 */
function blockedAreaTargets(
  state: BattleState,
  unit: UnitId | null,
  skill: string | null,
  centre: Tile | null,
  chosen: readonly UnitId[],
): BlockedTarget[] {
  if (unit === null || skill === null || centre === null || state.phase !== 'play') return []
  const side = state.units.find((u) => u.id === unit)?.side
  return state.units.flatMap((target) => {
    if (target.side === side || chosen.includes(target.id)) return []
    const result = previewAction(state, { type: 'useSkill', unit, skill, tile: centre, targets: [...chosen, target.id] })
    if (result.ok) return []
    const reason = result.rejection.code
    if (reason !== 'no-line-of-sight' && reason !== 'target-hidden') return []
    return [blockedTarget(target, reason, result.rejection)]
  })
}

/** Distinct enemies of `unit` among the targets of the legal uses of `skill`, Basic Attack when `skill` is null. */
function reachOf(moved: BattleState, actions: readonly Action[], unit: UnitId, skill: string | null): MoveReach {
  const side = moved.units.find((u) => u.id === unit)?.side
  const isEnemy = (id: UnitId) => moved.units.find((u) => u.id === id)?.side !== side
  let targets: UnitId[]
  let blocked: BlockedTarget[]
  if (skill !== null && aimKind(moved, skill) === 'area') {
    const uses = usesOf(actions, unit, skill)
    const centres = useTiles(uses)
    targets = [...new Set(centres.flatMap((centre) => nextAreaTargets(uses, centre, [])))]
    blocked = centres.flatMap((centre) => blockedAreaTargets(moved, unit, skill, centre, []))
    blocked = blocked.filter((b, i) => blocked.findIndex((o) => o.unit === b.unit) === i && !targets.includes(b.unit))
  } else {
    targets = aimTargets(actions, unit, skill)
    blocked = blockedTargets(moved, unit, skill)
  }
  return { skill, targets: targets.filter(isEnemy), blocked }
}

/**
 * What `unit` could attack from where `action` (a Move, or Blink) takes it:
 * the engine applies the action to a copy of `state` and reads the legal
 * actions of the result (spec: Move preview). `null` if the engine refuses.
 */
function movePreviewOf(state: BattleState, unit: UnitId, action: Action): MovePreview | null {
  const result = applyAction(state, action)
  if (!result.ok || result.state.pending !== null) return null
  const moved = result.state
  const destination = action.type === 'move' ? action.to : action.type === 'useSkill' ? action.tile : undefined
  if (destination === undefined) return null
  const used = action.type === 'useSkill' ? action.skill : null
  const actions = legalActions(moved)
  const options: (string | null)[] = [null]
  for (const button of unitSkills(moved, unit)) {
    const skill = moved.skills[button.skill]
    const attacks = skill !== undefined && (skill.attack !== undefined || skill.dcStat !== undefined)
    const ready = button.cooldown === 0 && !button.spent && button.implemented && button.free !== true
    if (attacks && ready && button.skill !== used) options.push(button.skill)
  }
  const reach = options.map((skill) => reachOf(moved, actions, unit, skill))
  return { unit, tile: destination, skill: used, reach, options: choicesOf(moved, actions, unit) }
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

/** `unit` has a legal Action (Basic Attack, Defend or a skill that is not free): a Move or a free skill (Camouflage, D-28) is not one. */
function hasActionLeft(state: BattleState, actions: readonly Action[], unit: UnitId): boolean {
  return actions.some((a) => {
    if (!('unit' in a) || a.unit !== unit) return false
    if (a.type === 'basicAttack' || a.type === 'defend') return true
    return a.type === 'useSkill' && state.skills[a.skill]?.effects?.free !== true
  })
}

/**
 * The Unit playing now when starting another Unit would cost it an Action it
 * can still use (spec user stories 28–31), else `null`.
 */
export function actionAtStake(state: BattleState, actions: readonly Action[] = legalActions(state)): UnitId | null {
  const current = state.activations.current
  if (state.phase !== 'play' || state.outcome !== null || state.pending !== null || current === null) return null
  const unit = state.units.find((u) => u.id === current)
  if (unit === undefined || unit.side !== state.sideToAct || unit.hasActed) return null
  return hasActionLeft(state, actions, current) ? current : null
}

/** Units of the side to act that moved this Turn but have not used their Action and still can (spec user story 30). */
export function movedWithoutAction(state: BattleState, actions: readonly Action[] = legalActions(state)): UnitId[] {
  if (state.phase !== 'play' || state.outcome !== null) return []
  return state.units
    .filter((u) => u.side === state.sideToAct && u.hasMoved && !u.hasActed && hasActionLeft(state, actions, u.id))
    .map((u) => u.id)
}

/** During deployment: the first Unit of the side placing that has no tile yet. */
function firstUnplaced(state: BattleState): UnitId | null {
  const deployment = state.deployment
  if (state.phase !== 'deployment' || deployment === null) return null
  const placed = deployment.placements[state.sideToAct]
  return deployment.roster.find((u) => u.side === state.sideToAct && placed[u.id] === undefined)?.id ?? null
}

/**
 * Who is selected after an accepted action: the Unit owing a step, a Unit to
 * place, the Unit that just acted while it can still do something (a Move
 * then its Action, or the other way round), or nobody.
 */
function selectionAfter(state: BattleState, action: Action): UnitId | null {
  if (state.pending?.kind === 'retreat') return state.pending.unit
  if (state.phase === 'deployment') return firstUnplaced(state)
  const actor = 'unit' in action ? action.unit : null
  if (actor === null || state.outcome !== null) return null
  return legalActions(state).some((a) => 'unit' in a && a.unit === actor) ? actor : null
}

/**
 * The cover after an accepted action in play: hand the device over when the
 * side that must act changed without a Turn ending (an Inspiration decision
 * for the other side, or back after it). Initiative keeps its own screen.
 */
function screenAfter(before: BattleState, after: BattleState, action: Action, vsAi: boolean): HotseatScreen {
  if (before.phase === 'play' && before.firstSide === null) return 'initiative'
  // Against the AI nobody hands a device over.
  if (vsAi) return 'board'
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
  movePreviewTile: null,
  planTarget: null,
  planOrigin: null,
  planChoice: null,
} as const

/** No Action plan in progress (the Move preview, if any, stays). */
const NO_PLAN = { planTarget: null, planOrigin: null, planChoice: null } as const

const otherSide = (side: Side): Side => (side === 'A' ? 'B' : 'A')

export function createBattleSession(initial: BattleState, options: SessionOptions = {}): BattleSession {
  const listeners = new Set<() => void>()
  const opponent = options.ai ?? null
  const human: Side | null = opponent === null ? null : otherSide(opponent.side)
  let ai: AiState | null = opponent === null ? null : createAi(initial, opponent.side, opponent.profile)
  /** The AI's deployment, worked out before the human places (rules §17.1); sent once it is the AI's turn to place. */
  let aiDeployment: readonly Action[] = []
  if (ai !== null && initial.phase === 'deployment') {
    const planned = planDeployment(initial, ai)
    ai = planned.ai
    aiDeployment = planned.actions
  }

  /** The human may act now: always in Hotseat; against the AI, when the decision is the human's. */
  function humanMayAct(state: BattleState): boolean {
    return human === null || (state.outcome === null && decidingSide(state) === human)
  }

  /** Whose view the Board shows: the side to act (Hotseat), or the human's team. */
  function viewer(state: BattleState): Side {
    return human ?? state.sideToAct
  }

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

  /** Undo for `base`: only at the device of the side to act, never during the AI's Turn or a hand-over screen. */
  function undoOffer(base: Omit<SessionSnapshot, Computed>, history: readonly BattleState[]): UndoOffer | null {
    if (base.screen !== 'board' || !humanMayAct(base.state)) return null
    const point = undoPoint(history, base.actions)
    return point === null ? null : { to: point.label, actions: base.actions.length - point.keep }
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
          : kind === 'area'
            ? blockedAreaTargets(state, selectedUnit, aimingSkill, pendingTile, chosenTargets)
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
    const planning = state.phase === 'play' && state.pending === null && selectedUnit !== null && humanMayAct(state)
    const attackable = planning ? attackableEnemies(state, selectedUnit) : []
    let plan: ActionPlan | null = null
    if (planning && (base.planTarget !== null || base.planChoice !== null)) {
      const stake = actionAtStake(state, actions)
      plan = buildPlan(
        state,
        selectedUnit,
        { target: base.planTarget, origin: base.planOrigin, choice: base.planChoice },
        stake !== null && stake !== selectedUnit ? stake : null,
      )
    }
    let movePreview: MovePreview | null = null
    if (state.phase === 'play' && state.pending === null && selectedUnit !== null) {
      const tile = base.movePreviewTile
      const move: Action | null =
        mode === 'move' && tile !== null && moveTiles(actions, selectedUnit).some((t) => sameTile(t, tile))
          ? { type: 'move', unit: selectedUnit, to: tile }
          : null
      const blink =
        ready !== null && ready.type === 'useSkill' && ready.unit === selectedUnit && state.skills[ready.skill]?.effects?.replacesMove === true
          ? ready
          : null
      const action = move ?? blink
      if (action !== null) movePreview = movePreviewOf(state, selectedUnit, action)
    }
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
      // Hotseat: the player holding the device is the side to act. Against the AI: the human's team.
      units: unitsVisibleTo(state, viewer(state)),
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
      area: kind === 'area' && pendingTile !== null && aimedSkill !== undefined ? areaTiles(aimedSkill, pendingTile, boardSizeOf(state)) : [],
      elementChoices,
      movePreview,
      attackable,
      plan,
      undo: undoOffer(base, states),
      canCommand: commandTargets(actions, selectedUnit).length > 0,
      actionAtStake: actionAtStake(state, actions),
      movedWithoutAction: movedWithoutAction(state, actions),
      aiToAct:
        opponent !== null &&
        state.outcome === null &&
        state.phase === 'play' &&
        decidingSide(state) === opponent.side &&
        (base.screen === 'board' || state.pending !== null),
    }
  }

  /** `states[k]` is the Battle after the first `k` accepted actions (`states[0]` is where this session began): what Undo returns to. */
  const states: BattleState[] = [initial]
  /** `logLengths[k]` is the length of the event log after the first `k` actions. */
  const logLengths: number[] = [0]

  let snapshot = snapshotOf({
    state: initial,
    events: [],
    eventBatches: [],
    revision: 0,
    selectedUnit: firstUnplaced(initial),
    ...NO_AIM,
    inspectedUnit: null,
    rejection: null,
    log: [],
    actions: [],
    screen: 'board',
    aiSide: opponent?.side ?? null,
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
    // The history first: the snapshot built by `update` reads it for Undo.
    states.push(result.state)
    logLengths.push(snapshot.log.length + result.events.length)
    update({
      screen: screenAfter(before, result.state, action, opponent !== null),
      state: result.state,
      events: result.events,
      eventBatches: [result.events],
      revision: snapshot.revision + 1,
      selectedUnit: humanMayAct(result.state) ? selectionAfter(result.state, action) : null,
      ...NO_AIM,
      inspectedUnit: null,
      rejection: null,
      log: [...snapshot.log, ...result.events],
      actions: [...snapshot.actions, action],
      ...after(result.state),
    })
  }

  /**
   * Apply `actions` one after the other as one command: all of them or none (the Battle only
   * changes when the engine accepts every one). Each action enters the history and the log like
   * a single dispatch, so Undo, the Replay and the log see the same as when played one by one.
   */
  function dispatchAll(actions: readonly Action[]): void {
    const before = snapshot.state
    let current = before
    const steps: { state: BattleState; events: readonly BattleEvent[] }[] = []
    for (const action of actions) {
      const result = applyAction(current, action)
      if (!result.ok) {
        update({ rejection: result.rejection.code })
        return
      }
      current = result.state
      steps.push({ state: result.state, events: result.events })
    }
    const last = actions[actions.length - 1]
    if (last === undefined) return
    let logLength = snapshot.log.length
    for (const step of steps) {
      logLength += step.events.length
      states.push(step.state)
      logLengths.push(logLength)
    }
    update({
      screen: screenAfter(before, current, last, opponent !== null),
      state: current,
      events: steps[steps.length - 1]!.events,
      eventBatches: steps.map((step) => step.events),
      revision: snapshot.revision + steps.length,
      selectedUnit: humanMayAct(current) ? selectionAfter(current, last) : null,
      ...NO_AIM,
      inspectedUnit: null,
      rejection: null,
      log: [...snapshot.log, ...steps.flatMap((step) => step.events)],
      actions: [...snapshot.actions, ...actions],
    })
  }

  /**
   * Against the AI, its deployment goes in whenever it is the AI's turn to
   * place: at once when it is team A, right after the human confirms when it
   * is team B. It was worked out first either way, from the Board alone.
   */
  function deployAi(): void {
    if (opponent === null) return
    while (snapshot.state.phase === 'deployment' && snapshot.state.sideToAct === opponent.side && aiDeployment.length > 0) {
      const [next, ...rest] = aiDeployment
      aiDeployment = rest
      if (next !== undefined) dispatch(next)
    }
  }

  /** The state now (a function, so TypeScript does not keep a narrowing across calls that change it). */
  const currentState = (): BattleState => snapshot.state

  deployAi()

  function selectUnit(unit: UnitId | null): void {
    const { state, selectedUnit } = snapshot
    // A pending decision (Hit and Run's step, Inspiration) keeps the selection.
    if (state.pending !== null) return
    // Move preview (spec story 3): tapping the selected Unit again drops only the preview. A Move preview
    // keeps the Unit and the lit tiles; a Blink preview keeps aiming Blink, with no destination picked.
    if (state.phase === 'play' && unit !== null && unit === selectedUnit && snapshot.plan !== null && humanMayAct(state)) {
      update({ ...NO_PLAN, rejection: null })
      return
    }
    if (state.phase === 'play' && unit !== null && unit === selectedUnit && snapshot.movePreview !== null && humanMayAct(state)) {
      if (snapshot.movePreviewTile !== null) update({ movePreviewTile: null, rejection: null })
      else update({ pendingTile: null, chosenTargets: [], pendingElement: null, rejection: null })
      return
    }
    const own = unit !== null && unit.startsWith(`${state.sideToAct}.`) && state.outcome === null && humanMayAct(state)
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
    if (!humanMayAct(state)) {
      // The AI's decision: Units can still be looked at, nothing else.
      if (boardInput.type === 'tapUnit') update({ inspectedUnit: boardInput.unit })
      return
    }
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
        const blocked = snapshot.blocked.find((b) => b.unit === boardInput.unit)
        if (blocked !== undefined) {
          // In the area but not selectable: say why, as for single-target skills.
          update({ rejection: blocked.reason })
          return
        }
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
      if (!humanMayAct(snapshot.state)) return
      // Cover the Board until the next player is ready (hand-off) or has seen initiative.
      dispatch({ type: 'confirmDeployment' }, (state) => ({
        screen: state.phase === 'play' ? 'initiative' : opponent !== null ? 'board' : 'handoff',
        selectedUnit: null,
      }))
      // Against the AI there is no hand-off: its hidden placements go in, then the reveal.
      if (opponent !== null && snapshot.state.phase === 'deployment') {
        deployAi()
        if (currentState().phase === 'play') update({ screen: 'initiative', selectedUnit: null })
      }
    },
    continueHotseat() {
      update({ screen: 'board', selectedUnit: firstUnplaced(snapshot.state) })
    },
    endTurn() {
      if (humanMayAct(snapshot.state)) dispatch({ type: 'endTurn' })
    },
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
        update({ mode: 'skill', pendingSkill: skill, pendingTarget: null, pendingTile: null, chosenTargets: [], ...NO_PLAN, rejection: null })
      }
    },
    defend() {
      const { selectedUnit } = snapshot
      if (selectedUnit !== null && humanMayAct(snapshot.state)) dispatch({ type: 'defend', unit: selectedUnit })
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
    undo() {
      const offer = snapshot.undo
      if (offer === null) return
      const point = undoPoint(states, snapshot.actions)
      if (point === null) return
      states.length = point.keep + 1
      logLengths.length = point.keep + 1
      const state = states[point.keep]!
      update({
        state,
        events: [],
        eventBatches: [],
        revision: snapshot.revision + 1,
        selectedUnit: state.pending?.kind === 'retreat' ? state.pending.unit : null,
        ...NO_AIM,
        inspectedUnit: null,
        rejection: null,
        log: snapshot.log.slice(0, logLengths[point.keep]),
        actions: snapshot.actions.slice(0, point.keep),
        screen: 'board',
      })
    },
    previewMove(tile) {
      const { state, selectedUnit, mode, reachable } = snapshot
      if (!humanMayAct(state) || state.phase !== 'play' || state.pending !== null || selectedUnit === null || mode !== 'move') return
      if (reachable.some((t) => sameTile(t, tile))) update({ movePreviewTile: tile, ...NO_PLAN, inspectedUnit: null, rejection: null })
    },
    cancelMovePreview() {
      if (snapshot.movePreviewTile !== null) update({ movePreviewTile: null, ...NO_PLAN, rejection: null })
    },
    confirmMove() {
      const { movePreview, ready, selectedUnit } = snapshot
      if (movePreview === null || selectedUnit === null || !humanMayAct(snapshot.state)) return
      if (movePreview.skill !== null) {
        if (ready !== null) dispatch(ready)
      } else {
        dispatch({ type: 'move', unit: selectedUnit, to: movePreview.tile })
      }
    },
    aimTarget(unit) {
      const { state, selectedUnit, attackable, movePreview } = snapshot
      if (!humanMayAct(state) || state.phase !== 'play' || state.pending !== null || selectedUnit === null) return
      if (!attackable.some((enemy) => enemy.unit === unit)) return
      // Tile-first: the shadow's tile is the place to attack from when it reaches the enemy (else the plan falls back to the rule).
      const ghost = movePreview === null ? null : { tile: movePreview.tile, via: movePreview.skill === null ? ('move' as const) : ('blink' as const) }
      update({ ...NO_AIM, movePreviewTile: snapshot.movePreviewTile, planTarget: unit, planOrigin: ghost, rejection: null })
    },
    chooseOrigin(tile, via) {
      const origin = snapshot.plan?.originChoices.find((o) => sameTile(o.tile, tile) && (via === undefined || o.via === via))
      if (origin !== undefined) update({ planOrigin: { tile: origin.tile, via: origin.via }, rejection: null })
    },
    choosePlanAction(key) {
      const { state, selectedUnit, plan, movePreview } = snapshot
      if (!humanMayAct(state) || state.phase !== 'play' || state.pending !== null || selectedUnit === null) return
      if (plan !== null) {
        const choice = plan.choices.find((c) => c.key === key)
        if (choice === undefined) return
        update({ planChoice: key, planTarget: choice.kind === 'attack' ? choice.target : plan.target, rejection: null })
        return
      }
      // No plan yet: from the shadow of the Move preview, or from where the Unit stands.
      const self = state.units.find((u) => u.id === selectedUnit)
      const origin =
        movePreview !== null
          ? { tile: movePreview.tile, via: movePreview.skill === null ? ('move' as const) : ('blink' as const) }
          : self === undefined
            ? null
            : { tile: self.tile, via: 'stay' as const }
      if (origin === null) return
      const view = originViews(state, selectedUnit).find((v) => sameOrigin(v.origin, { ...origin, steps: 0 }))
      const choice = view?.choices.find((c) => c.key === key)
      if (choice === undefined) return
      update({
        ...NO_AIM,
        movePreviewTile: snapshot.movePreviewTile,
        planTarget: choice.kind === 'attack' ? choice.target : null,
        planOrigin: origin,
        planChoice: key,
        rejection: null,
      })
    },
    confirmPlan() {
      const { plan, state } = snapshot
      if (plan === null || plan.choice === null || !humanMayAct(state)) return
      dispatchAll(plan.steps)
    },
    confirmAttack() {
      if (snapshot.ready !== null && humanMayAct(snapshot.state)) dispatch(snapshot.ready)
    },
    stayInPlace() {
      const pending = snapshot.state.pending
      if (pending?.kind === 'retreat' && humanMayAct(snapshot.state)) dispatch({ type: 'retreat', unit: pending.unit, to: null })
    },
    useInspiration() {
      const pending = snapshot.state.pending
      if (pending?.kind === 'inspiration' && humanMayAct(snapshot.state)) dispatch({ type: 'useInspiration', side: pending.side })
    },
    declineInspiration() {
      const pending = snapshot.state.pending
      if (pending?.kind === 'inspiration' && humanMayAct(snapshot.state)) dispatch({ type: 'declineInspiration', side: pending.side })
    },
    aiStep() {
      if (ai === null || !snapshot.aiToAct) return false
      const choice = chooseAction(snapshot.state, ai)
      ai = choice.ai
      dispatch(choice.action)
      return true
    },
    cancel() {
      if (snapshot.state.pending !== null) return
      if (snapshot.plan !== null) update({ ...NO_PLAN, rejection: null })
      else if (snapshot.movePreviewTile !== null) update({ movePreviewTile: null, rejection: null })
      else if (snapshot.chosenTargets.length > 0) update({ chosenTargets: snapshot.chosenTargets.slice(0, -1), rejection: null })
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
