/**
 * Loadout skills (rules §13, §15): the `useSkill` action, tiers and
 * cooldowns, which uses are legal, the generic resolution and preview, and
 * Hit and Run's step (the `retreat` decision).
 *
 * See skillHandler.ts for how a skill plugs in. The handlers registered in
 * the per-owner files are the skills the engine can resolve; a loadout skill
 * without one is shown but never offered.
 */
import { isOnBoard, sameTile, type Element, type Skill, type SkillTier, type Tile } from '@mt/shared'
import type { ActionPreview, ApplyResult, Rejection } from './battle.ts'
import { attackOnce, checkActor, checkEnemyTarget, isRejection, previewAttack, type AttackPreview } from './combat.ts'
import { FANGREL_SKILLS } from './fangrelSkills.ts'
import { emit } from './resolution.ts'
import { distance } from './movement.ts'
import { QUILLFOX_SKILLS } from './quillfoxSkills.ts'
import type { SkillHandler, SkillHandlers, SkillResolution, SkillUse } from './skillHandler.ts'
import { findUnit, type BattleState, type StatusId, type UnitId, type UnitState } from './state.ts'
import { giveSkillStatuses, isImmobile, statusOdds, type StatusOdds } from './statuses.ts'
import { TAMER_SKILLS } from './tamerSkills.ts'
import { TIDEWALL_SKILLS } from './tidewallSkills.ts'
import { activate } from './turns.ts'
import { WISPLING_SKILLS } from './wisplingSkills.ts'

/** Use a loadout skill (rules §15). Which fields it needs depends on the skill's target kind. */
export type UseSkillAction = {
  readonly type: 'useSkill'
  readonly unit: UnitId
  readonly skill: string
  /** One Unit: the enemy of an `enemy` skill, the ally of an `ally`/`allyMonster` skill. */
  readonly target?: UnitId
  /** Several Units in the order chosen (Burst). */
  readonly targets?: readonly UnitId[]
  /** A tile: Blink's destination, Attune's tile, Burst's centre. */
  readonly tile?: Tile
  /** Attune: the element chosen. */
  readonly element?: Element
}

/** Hit and Run's step (rules §15.1, D-12): to an empty tile within reach, or `null` to stay. */
export type RetreatAction = {
  readonly type: 'retreat'
  readonly unit: UnitId
  readonly to: Tile | null
}

const HANDLERS: SkillHandlers = {
  ...FANGREL_SKILLS,
  ...TIDEWALL_SKILLS,
  ...WISPLING_SKILLS,
  ...QUILLFOX_SKILLS,
  ...TAMER_SKILLS,
}

/** The handler of a skill the engine can resolve, or `undefined` (not yet implemented, or Passive). */
function handlerOf(skill: Skill): SkillHandler | undefined {
  return skill.tier === 'passive' ? undefined : HANDLERS[skill.id]
}

// --------------------------------------------------------------- cooldown

/** Major skills: used on Turn N of the side, usable again from Turn N + 2 (rules §13.2, D-16). */
export const MAJOR_COOLDOWN_TURNS = 2

/**
 * Cooldown as the UI shows it (rules §13.2): the side's Turn the skill is
 * usable again minus the side's current Turn, at least 0. After use on Turn
 * N it shows 2, and 1 on Turn N + 1. Only Major skills have one.
 */
export function cooldownOf(state: BattleState, unit: UnitState, skill: Skill): number {
  const used = unit.skillsUsed[skill.id]
  if (skill.tier !== 'major' || used === undefined) return 0
  return Math.max(0, used + MAJOR_COOLDOWN_TURNS - state.turnNumber[unit.side])
}

/** A Signature skill already used this Battle (rules §13.1). */
function isSpent(unit: UnitState, skill: Skill): boolean {
  return skill.tier === 'signature' && unit.skillsUsed[skill.id] !== undefined
}

/** One loadout skill of a Unit, as the UI shows it. */
export interface SkillAvailability {
  readonly skill: string
  readonly tier: SkillTier
  /** Turns until usable again (rules §13.2); 0 = no cooldown running. */
  readonly cooldown: number
  /** A Signature skill already used this Battle. */
  readonly spent: boolean
  /** The engine can resolve it (its ticket has landed); Passive skills are never used. */
  readonly implemented: boolean
}

/** The loadout of a Unit on the Board or fallen, in loadout order. */
export function loadoutOf(state: BattleState, unit: UnitState): SkillAvailability[] {
  return unit.skills.flatMap((id) => {
    const skill = state.skills[id]
    if (skill === undefined) return []
    return [
      {
        skill: id,
        tier: skill.tier,
        cooldown: cooldownOf(state, unit, skill),
        spent: isSpent(unit, skill),
        implemented: handlerOf(skill) !== undefined,
      },
    ]
  })
}

// ---------------------------------------------------------------- checks

function rejection(code: Rejection['code'], message: string): Rejection {
  return { code, message }
}

/** Target fields an action may carry for each target kind; anything else is `invalid-target`. */
function unexpectedFields(skill: Skill, action: UseSkillAction): boolean {
  const single = skill.target === 'enemy' || skill.target === 'ally' || skill.target === 'allyMonster'
  if (action.targets !== undefined || action.tile !== undefined || action.element !== undefined) return true
  return single ? action.target === undefined : action.target !== undefined
}

/** Generic targeting by `skill.target` (rules §8.1, §15). */
function genericTargets(state: BattleState, user: UnitState, skill: Skill, action: UseSkillAction): readonly UnitState[] | Rejection {
  if (skill.target === 'tile' || skill.target === 'area' || skill.target === 'none') {
    return rejection('skill-not-available', `${skill.name} needs its own targeting (${skill.target})`)
  }
  if (unexpectedFields(skill, action)) {
    return rejection('invalid-target', `${skill.name} (${skill.target}) does not take these target fields`)
  }
  switch (skill.target) {
    case 'self':
      return [user]
    case 'selfAndAllies':
      // Unit order (rules §21.4): the user is among them.
      return state.units.filter((u) => u.side === user.side && distance(u.tile, user.tile) <= skill.range)
    case 'enemy': {
      const target = checkEnemyTarget(state, user, skill, action.target ?? '')
      return isRejection(target) ? target : [target]
    }
    case 'ally':
    case 'allyMonster': {
      const target = findUnit(state, action.target ?? '')
      if (target === undefined) return rejection('unknown-unit', `No Unit "${action.target}" on the Board`)
      if (target.side !== user.side) return rejection('not-an-ally', `${target.id} is not on ${user.id}'s side`)
      if (skill.target === 'allyMonster' && (target.kind !== 'monster' || target.id === user.id)) {
        return rejection('invalid-target', `${skill.name} needs another allied Monster`)
      }
      const d = distance(user.tile, target.tile)
      if (d > skill.range) return rejection('out-of-range', `${target.id} is ${d} tiles away; ${skill.name} reaches ${skill.range}`)
      return [target]
    }
  }
}

/**
 * Whether the action is a legal skill use now: the generic actor checks
 * (phase, side, activation, Action or Move unused), the skill in the Unit's
 * loadout, implemented, not Passive, not on cooldown or spent, then its
 * targets and the handler's own check. Shared by legalActions, applyAction
 * and previewAction so all three agree.
 */
export function checkSkillUse(state: BattleState, action: UseSkillAction): SkillUse | Rejection {
  const skill: Skill | undefined = state.skills[action.skill]
  const user = checkActor(state, action.unit, skill?.effects?.replacesMove ? 'move' : 'action')
  if (isRejection(user)) return user
  if (skill === undefined) return rejection('unknown-skill', `No skill "${action.skill}"`)
  if (!user.skills.includes(skill.id)) return rejection('not-in-loadout', `${skill.name} is not in ${user.id}'s loadout`)
  const handler = handlerOf(skill)
  if (handler === undefined) {
    return rejection(
      'skill-not-available',
      skill.tier === 'passive' ? `${skill.name} is Passive: it is always on and never used` : `${skill.name} is not in the game yet`,
    )
  }
  const cooldown = cooldownOf(state, user, skill)
  if (cooldown > 0) return rejection('on-cooldown', `${skill.name} is on cooldown for ${cooldown} more Turn(s)`)
  if (isSpent(user, skill)) return rejection('on-cooldown', `${skill.name} was already used this Battle`)
  const targets = (handler.targets ?? genericTargets)(state, user, skill, action)
  if (isRejection(targets)) return targets
  const use: SkillUse = { action, user, skill, targets }
  return handler.check?.(state, use) ?? use
}

/** Every legal skill use of the side to act, Unit by Unit, loadout order, then target in Unit order. */
export function legalSkillUses(state: BattleState): UseSkillAction[] {
  if (state.phase !== 'play' || state.pending !== null || state.outcome !== null) return []
  const uses: UseSkillAction[] = []
  for (const user of state.units) {
    if (user.side !== state.sideToAct) continue
    for (const id of user.skills) {
      const skill = state.skills[id]
      const handler = skill === undefined ? undefined : handlerOf(skill)
      if (skill === undefined || handler === undefined) continue
      const candidates = handler.uses?.(state, user, skill) ?? genericCandidates(state, user, skill)
      for (const action of candidates) if (!isRejection(checkSkillUse(state, action))) uses.push(action)
    }
  }
  return uses
}

function genericCandidates(state: BattleState, user: UnitState, skill: Skill): UseSkillAction[] {
  const base = { type: 'useSkill', unit: user.id, skill: skill.id } as const
  switch (skill.target) {
    case 'self':
    case 'selfAndAllies':
      return [base]
    case 'enemy':
    case 'ally':
    case 'allyMonster':
      return state.units.map((u) => ({ ...base, target: u.id }))
    default:
      return []
  }
}

// --------------------------------------------------------------- resolve

/** Book the use (rules §13.2, §17.4): start the activation, use the Action (or the Move), start the cooldown. */
function book(state: BattleState, use: SkillUse): BattleState {
  const active = activate(state, use.user.id)
  const turn = state.turnNumber[use.user.side]
  const replacesMove = use.skill.effects?.replacesMove === true
  return {
    ...active,
    units: active.units.map((u) =>
      u.id === use.user.id
        ? {
            ...u,
            ...(replacesMove ? { hasMoved: true } : { hasActed: true }),
            skillsUsed: { ...u.skillsUsed, [use.skill.id]: turn },
          }
        : u,
    ),
  }
}

/**
 * Generic resolution: an attack roll per target in order (rules §10.5,
 * stopping once the user is down or the Battle is over), or the skill's
 * statuses on each target (saves where the data asks for one).
 */
function* resolveGeneric(before: BattleState, use: SkillUse): SkillResolution {
  let state = before
  for (const target of use.targets) {
    if (state.outcome !== null || findUnit(state, use.user.id) === undefined) break
    if (findUnit(state, target.id) === undefined) continue
    if (use.skill.attack !== undefined) {
      state = (yield* attackOnce(state, use.user.id, target.id, use.skill)).state
    } else {
      const user = findUnit(state, use.user.id) ?? use.user
      state = yield* giveSkillStatuses(state, user, target.id, use.skill)
    }
  }
  return state
}

/**
 * Use a skill: the resolution of a legal `useSkill` (book it, `skillUsed`,
 * resolve, then offer Hit and Run's step if the skill has one), or why it is
 * not legal. Inspiration decisions on its d20s come first; the step is
 * offered only once the skill has resolved completely.
 */
export function skillResolution(state: BattleState, action: UseSkillAction): SkillResolution | Rejection {
  const use = checkSkillUse(state, action)
  if (isRejection(use)) return use
  return resolveSkill(state, use)
}

function* resolveSkill(state: BattleState, use: SkillUse): SkillResolution {
  const handler = handlerOf(use.skill) ?? {}
  const booked = book(state, use)
  yield* emit({ type: 'skillUsed', unit: use.user.id, skill: use.skill.id, targets: use.targets.map((t) => t.id) })
  const resolved = yield* (handler.resolve ?? resolveGeneric)(booked, use)
  return offerRetreat(resolved, use)
}

// --------------------------------------------------------------- preview

/** A skill that rolls only saves (Taunt, Hex, Distract): the chance each status sticks. */
export interface SavePreview {
  readonly type: 'save'
  readonly skill: string
  readonly user: UnitId
  readonly target: UnitId
  readonly statuses: readonly StatusOdds[]
}

/**
 * A skill that attacks several chosen targets one after another (Burst,
 * rules §15.1): one attack preview per target, in the order they resolve.
 * Each is computed on the state before the skill; ticket 11 drops Command
 * advantage from all but the first (D-04, see wisplingSkills.ts).
 */
export interface AreaPreview {
  readonly type: 'area'
  readonly skill: string
  readonly user: UnitId
  /** The centre of the area. */
  readonly centre: Tile
  /** The tiles of the area (centre and its neighbours on the Board), reading order. */
  readonly area: readonly Tile[]
  readonly attacks: readonly AttackPreview[]
}

/** A skill with nothing to roll (Pack Howl): who gets which statuses. */
export interface EffectPreview {
  readonly type: 'effect'
  readonly skill: string
  readonly user: UnitId
  /** Units it lands on, in Unit order. */
  readonly units: readonly UnitId[]
  readonly statuses: readonly StatusId[]
}

export function previewSkill(state: BattleState, action: UseSkillAction): { ok: true; preview: ActionPreview } | { ok: false; rejection: Rejection } {
  const use = checkSkillUse(state, action)
  if (isRejection(use)) return { ok: false, rejection: use }
  const handler = handlerOf(use.skill)
  if (handler?.preview !== undefined) return { ok: true, preview: handler.preview(state, use) }
  const first = use.targets[0]
  if (use.skill.attack !== undefined && first !== undefined) {
    return { ok: true, preview: previewAttack(state, { attacker: use.user, target: first, skill: use.skill }) }
  }
  const saves = (use.skill.applies ?? []).some((a) => a.save !== undefined)
  if (saves && first !== undefined) {
    return {
      ok: true,
      preview: { type: 'save', skill: use.skill.id, user: use.user.id, target: first.id, statuses: statusOdds(use.user, first, use.skill) },
    }
  }
  return {
    ok: true,
    preview: {
      type: 'effect',
      skill: use.skill.id,
      user: use.user.id,
      units: use.targets.map((t) => t.id),
      statuses: (use.skill.applies ?? []).map((a) => a.status),
    },
  }
}

// --------------------------------------------------------------- retreat

/** Empty tiles within `steps` steps of the Unit, each step to an adjacent empty tile (rules §15.1). */
export function retreatTiles(state: BattleState, unit: UnitState, steps: number): Tile[] {
  const empty = (tile: Tile) => isOnBoard(tile) && !state.units.some((u) => sameTile(u.tile, tile))
  const seen: Tile[] = [unit.tile]
  let frontier: Tile[] = [unit.tile]
  const found: Tile[] = []
  for (let step = 0; step < steps; step++) {
    const next: Tile[] = []
    for (const from of frontier) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const to = { x: from.x + dx, y: from.y + dy }
          if (seen.some((t) => sameTile(t, to)) || !empty(to)) continue
          seen.push(to)
          found.push(to)
          next.push(to)
        }
      }
    }
    frontier = next
  }
  // Reading order, so legalActions lists them the same way every time.
  return found.sort((a, b) => a.y - b.y || a.x - b.x)
}

/**
 * After a skill with `effects.retreat` (Hit and Run) resolves completely,
 * counterattack included: if the Battle goes on, the user is still up and
 * not Pinned, and an empty tile is within reach, the user must decide to
 * step or stay before anything else (rules §15.1, D-12).
 */
function offerRetreat(state: BattleState, use: SkillUse): BattleState {
  const steps = use.skill.effects?.retreat
  if (steps === undefined || state.outcome !== null) return state
  const user = findUnit(state, use.user.id)
  if (user === undefined || isImmobile(state, user) || retreatTiles(state, user, steps).length === 0) return state
  return { ...state, pending: { kind: 'retreat', side: user.side, unit: user.id, skill: use.skill.id, steps } }
}

/** Every legal answer to the pending step: each tile in reading order, then staying. */
export function legalRetreats(state: BattleState): RetreatAction[] {
  const pending = state.pending
  if (pending?.kind !== 'retreat' || state.outcome !== null) return []
  const unit = findUnit(state, pending.unit)
  if (unit === undefined) return []
  return [
    ...retreatTiles(state, unit, pending.steps).map((to) => ({ type: 'retreat', unit: unit.id, to }) as const),
    { type: 'retreat', unit: unit.id, to: null },
  ]
}

/**
 * Hit and Run's step: not a Move (the Unit's Move stays available if unused)
 * and uses no dice. Ticket 10 checks Hidden after it (rules §8.2).
 */
export function applyRetreat(state: BattleState, action: RetreatAction): ApplyResult {
  const reject = (code: Rejection['code'], message: string): ApplyResult => ({ ok: false, state, rejection: { code, message } })
  if (state.phase !== 'play') return reject('wrong-phase', 'No step during deployment')
  const pending = state.pending
  if (pending?.kind === 'inspiration') {
    return reject('decision-pending', `Side ${pending.side} must first decide whether to use Inspiration`)
  }
  if (pending === null) return reject('no-decision', 'There is no step to choose now')
  if (action.unit !== pending.unit) return reject('no-decision', `${pending.unit} chooses the step, not ${action.unit}`)
  const unit = findUnit(state, pending.unit)
  if (unit === undefined) return reject('unknown-unit', `No Unit "${pending.unit}" on the Board`)
  const resolved: BattleState = { ...state, pending: null }
  if (action.to === null) return { ok: true, state: resolved, events: [{ type: 'retreatDeclined', unit: unit.id }] }
  const to = action.to
  if (!isOnBoard(to)) return reject('off-board', `(${to.x}, ${to.y}) is not on the Board`)
  if (state.units.some((u) => sameTile(u.tile, to))) return reject('tile-occupied', 'That tile is occupied')
  if (!retreatTiles(state, unit, pending.steps).some((t) => sameTile(t, to))) {
    return reject('out-of-reach', `${unit.id} can step only ${pending.steps} tile(s)`)
  }
  return {
    ok: true,
    state: { ...resolved, units: resolved.units.map((u) => (u.id === unit.id ? { ...u, tile: to } : u)) },
    events: [{ type: 'unitRetreated', unit: unit.id, from: unit.tile, to }],
  }
}
