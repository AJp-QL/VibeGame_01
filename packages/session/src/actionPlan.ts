/**
 * Action plan (phase 1.x ticket 23, spec stories 55-61): a Move and an Action
 * of one Unit chosen together and confirmed once. Everything here is worked
 * out by the engine on copies of the Battle, like the Move preview: a Move
 * (or Blink) is applied to a copy and the legal actions of the result are
 * read, so a plan can never offer what real play would refuse. Nothing here
 * changes the Battle or rolls a die. The session sends the existing `move`
 * (or Blink) action and then the existing Action; no engine action is added.
 */
import { sameTile, type Tile } from '@mt/shared'
import {
  applyAction,
  distance,
  drewDice,
  legalActions,
  pathTo,
  previewAction,
  type Action,
  type ActionPreview,
  type BattleState,
  type UnitId,
} from '@mt/engine'

/** How the Unit gets to the tile it acts from: it stays, walks (Move), or jumps (Blink). */
export type PlanVia = 'stay' | 'move' | 'blink'

/** A tile the Unit could act from in this activation. */
export interface PlanOrigin {
  readonly tile: Tile
  readonly via: PlanVia
  /** Steps of the Move (0 when staying); for a Blink, the distance jumped. */
  readonly steps: number
}

/** One thing the Unit can do from an origin, taken from the engine's legal actions there. */
export interface PlanChoice {
  /** Identifies the choice across origins: the same attack on the same target has the same key anywhere. */
  readonly key: string
  /** `attack`: Basic Attack or an attack/save skill on an enemy; `defend`; `other`: any other skill (Pack Howl, Cover, First Aid ...). */
  readonly kind: 'attack' | 'defend' | 'other'
  /** The skill id; `null` for Basic Attack and Defend. */
  readonly skill: string | null
  /** The Unit aimed at, `null` when the choice has none (Defend, Pack Howl). */
  readonly target: UnitId | null
  readonly action: Action
}

/** An enemy the selected Unit can attack in this activation, and where from. */
export interface AttackableEnemy {
  readonly unit: UnitId
  readonly tile: Tile
  /** It can be attacked without moving. */
  readonly fromHere: boolean
  /** The tiles it can be attacked from, best first: the session's suggestion is the first. */
  readonly origins: readonly PlanOrigin[]
}

export interface ActionPlan {
  readonly unit: UnitId
  /** The enemy being attacked; `null` for a plan of a non-attack choice (Defend, support) from a tile. */
  readonly target: UnitId | null
  /** Where the Unit acts from, and how it gets there. */
  readonly origin: PlanOrigin
  /** The other origins that offer the same thing, best first (includes `origin`): shown as choices, tapping one moves the shadow. */
  readonly originChoices: readonly PlanOrigin[]
  /** What the Unit does from `origin`: attacks on `target` first, then everything else it may do from there. */
  readonly choices: readonly PlanChoice[]
  /** The choice that will be sent; `null` if the origin offers none. */
  readonly choice: PlanChoice | null
  /** Odds and damage of `choice` from `origin`, from the engine on a copy; `null` for choices without a preview. */
  readonly preview: ActionPreview | null
  /** The actions `confirmPlan` sends, in order: the Move or Blink (absent when staying), then the choice. */
  readonly steps: readonly Action[]
  /** Dice will be rolled, so Undo cannot go back past this plan once confirmed (rules §17.5). */
  readonly rolls: boolean
  /** The Unit that confirming would stop playing (it has an Action left), or `null`: the UI asks first (ticket 02). */
  readonly abandons: UnitId | null
}

/** Everything the engine allows from one origin, with the Battle as it would be there. */
export interface OriginView {
  readonly origin: PlanOrigin
  /** The Move or Blink that gets there; `null` when staying. */
  readonly via: Action | null
  readonly moved: BattleState
  readonly choices: readonly PlanChoice[]
}

const VIA_RANK: Readonly<Record<PlanVia, number>> = { stay: 0, move: 1, blink: 2 }

/**
 * The order in which origins are suggested (spec: Action plan): stay if the
 * Unit can act from where it is, then fewest steps, then (when given) the
 * lower Threat zone, then tile order (y, then x). A Blink comes after every
 * walk: it spends a skill, so the game never picks it over a Move.
 */
export function compareOrigins(a: PlanOrigin, b: PlanOrigin, threat: (tile: Tile) => number): number {
  if (a.via !== b.via) return VIA_RANK[a.via] - VIA_RANK[b.via]
  if (a.steps !== b.steps) return a.steps - b.steps
  const difference = threat(a.tile) - threat(b.tile)
  if (difference !== 0) return difference
  return a.tile.y - b.tile.y || a.tile.x - b.tile.x
}

export const sameOrigin = (a: PlanOrigin, b: PlanOrigin): boolean => a.via === b.via && sameTile(a.tile, b.tile)

const choiceKey = (action: Action, skill: string | null, target: UnitId | null) => `${action.type}:${skill ?? ''}:${target ?? ''}`

/** What the Unit may do in `actions` (the legal actions of `state`) that a plan can carry: attacks, Defend and skills that are neither free nor a Move. */
export function choicesOf(state: BattleState, actions: readonly Action[], unit: UnitId): PlanChoice[] {
  const side = state.units.find((u) => u.id === unit)?.side
  const isEnemy = (id: UnitId) => state.units.find((u) => u.id === id)?.side !== side
  const found: PlanChoice[] = []
  const add = (kind: PlanChoice['kind'], action: Action, skill: string | null, target: UnitId | null) => {
    const key = choiceKey(action, skill, target)
    if (!found.some((c) => c.key === key)) found.push({ key, kind, skill, target, action })
  }
  for (const action of actions) {
    if (!('unit' in action) || action.unit !== unit) continue
    if (action.type === 'basicAttack') add('attack', action, null, action.target)
    else if (action.type === 'defend') add('defend', action, null, null)
    else if (action.type === 'useSkill') {
      const skill = state.skills[action.skill]
      if (skill === undefined || skill.effects?.free === true || skill.effects?.replacesMove === true) continue
      const attacks = skill.attack !== undefined || skill.dcStat !== undefined
      if (action.target !== undefined) {
        add(attacks && isEnemy(action.target) ? 'attack' : 'other', action, action.skill, action.target)
      } else if (action.targets !== undefined && action.tile !== undefined) {
        // Area (Burst): a plan aims at one enemy; the use that hits only that one.
        const only = action.targets.length === 1 ? action.targets[0] : undefined
        if (only !== undefined && isEnemy(only)) add('attack', action, action.skill, only)
      } else if (action.tile === undefined) {
        add('other', action, action.skill, null)
      }
    }
  }
  return found
}

/** The Battle after `action`, with its legal actions; `null` if the engine refuses it or it leaves a decision pending. */
function simulate(state: BattleState, action: Action): { moved: BattleState; actions: Action[] } | null {
  const result = applyAction(state, action)
  if (!result.ok || result.state.pending !== null) return null
  return { moved: result.state, actions: legalActions(result.state) }
}

const cache = new WeakMap<BattleState, Map<UnitId, readonly OriginView[]>>()

/**
 * Every tile `unit` could act from in this activation, best first: where it
 * stands (if it can act there), each tile its Move reaches and each tile its
 * Blink reaches, with what it may do from each. Worked out once per state.
 */
export function originViews(state: BattleState, unit: UnitId): readonly OriginView[] {
  const perState = cache.get(state) ?? new Map<UnitId, readonly OriginView[]>()
  cache.set(state, perState)
  const known = perState.get(unit)
  if (known !== undefined) return known
  const views = computeViews(state, unit)
  perState.set(unit, views)
  return views
}

function computeViews(state: BattleState, unit: UnitId): OriginView[] {
  const self = state.units.find((u) => u.id === unit)
  if (self === undefined || state.phase !== 'play' || state.pending !== null || state.outcome !== null) return []
  const actions = legalActions(state)
  const views: OriginView[] = []
  const stay = choicesOf(state, actions, unit)
  if (stay.length > 0) views.push({ origin: { tile: self.tile, via: 'stay', steps: 0 }, via: null, moved: state, choices: stay })
  for (const action of actions) {
    if (!('unit' in action) || action.unit !== unit) continue
    let tile: Tile | undefined
    let via: PlanVia
    let steps: number
    if (action.type === 'move') {
      tile = action.to
      via = 'move'
      steps = pathTo(state, self, tile)?.length ?? distance(self.tile, tile)
    } else if (action.type === 'useSkill' && state.skills[action.skill]?.effects?.replacesMove === true) {
      tile = action.tile
      via = 'blink'
      steps = tile === undefined ? 0 : distance(self.tile, tile)
    } else continue
    if (tile === undefined) continue
    const there = tile
    if (views.some((v) => v.origin.via === via && sameTile(v.origin.tile, there))) continue
    const simulated = simulate(state, action)
    if (simulated === null) continue
    const choices = choicesOf(simulated.moved, simulated.actions, unit)
    if (choices.length > 0) views.push({ origin: { tile, via, steps }, via: action, moved: simulated.moved, choices })
  }
  return views.sort((a, b) => compareOrigins(a.origin, b.origin, () => 0))
}

/** Enemies `unit` can attack in this activation, in the order of the Board's units, with the origins that reach each. */
export function attackableEnemies(state: BattleState, unit: UnitId, threat: (tile: Tile) => number): AttackableEnemy[] {
  const views = originViews(state, unit)
  const enemies: AttackableEnemy[] = []
  for (const target of state.units) {
    const reaching = views.filter((v) => v.choices.some((c) => c.kind === 'attack' && c.target === target.id))
    if (reaching.length === 0) continue
    const origins = reaching.map((v) => v.origin).sort((a, b) => compareOrigins(a, b, threat))
    enemies.push({ unit: target.id, tile: target.tile, fromHere: origins.some((o) => o.via === 'stay'), origins })
  }
  return enemies
}

/** What the player has asked for so far (UI state): the plan is worked out from it and from the Battle. */
export interface PlanWish {
  /** The enemy to attack, or `null` for a plan of a non-attack choice. */
  readonly target: UnitId | null
  /** The origin picked, if any; ignored when it no longer offers the wish. */
  readonly origin: Pick<PlanOrigin, 'tile' | 'via'> | null
  /** The choice picked (`PlanChoice.key`), if any. */
  readonly choice: string | null
}

/**
 * The plan for `wish`, or `null` when no origin offers it. The origin is the
 * one picked if it still offers the wish, else the best one (`compareOrigins`).
 * `abandons` is the Unit the UI must warn about (ticket 02), worked out by the caller.
 */
export function buildPlan(
  state: BattleState,
  unit: UnitId,
  wish: PlanWish,
  abandons: UnitId | null,
  threat: (tile: Tile) => number,
): ActionPlan | null {
  const offers = (view: OriginView) =>
    wish.target !== null
      ? view.choices.some((c) => c.kind === 'attack' && c.target === wish.target)
      : wish.choice !== null && view.choices.some((c) => c.key === wish.choice)
  const candidates = originViews(state, unit)
    .filter(offers)
    .sort((a, b) => compareOrigins(a.origin, b.origin, threat))
  const picked = wish.origin
  const view = (picked === null ? undefined : candidates.find((v) => sameOrigin(v.origin, { ...picked, steps: 0 }))) ?? candidates[0]
  if (view === undefined) return null
  const onTarget = (c: PlanChoice) => wish.target !== null && c.kind === 'attack' && c.target === wish.target
  const choices = [...view.choices.filter(onTarget), ...view.choices.filter((c) => !onTarget(c))]
  const choice = choices.find((c) => c.key === wish.choice) ?? choices.find(onTarget) ?? null
  let preview: ActionPreview | null = null
  let rolls = false
  if (choice !== null) {
    const result = previewAction(view.moved, choice.action)
    preview = result.ok ? result.preview : null
    const done = applyAction(view.moved, choice.action)
    rolls = done.ok && drewDice(view.moved, done.state)
  }
  return {
    unit,
    target: wish.target,
    origin: view.origin,
    originChoices: candidates.map((v) => v.origin),
    choices,
    choice,
    preview,
    steps: [...(view.via === null ? [] : [view.via]), ...(choice === null ? [] : [choice.action])],
    rolls,
    abandons,
  }
}
