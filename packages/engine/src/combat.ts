/**
 * Attacks (rules §8, §10, §19.1): who can be targeted, the attack roll,
 * damage, statuses on a hit, Units going down, the Battle ending, and the
 * exact odds a preview shows. Integer arithmetic only; dice come from the
 * Battle's stream in the order of rules §21.4.
 *
 * Line of sight (§7), Hidden (§8.2), advantage/disadvantage from element,
 * terrain, Marked and Tamer protection (§4, §5, §9, in rollMode.ts), Guarded
 * (§12) and Rallied (§14) are here. Each later rule has its slot: targeting
 * (Taunted) in `checkEnemyTarget`, roll mode sources (Off-balance, Command) in
 * `rollModeSources`, defence bonuses in `defenceOf`, damage adjustments
 * (Weakened, `damageDealtModifiers`) in `previewAttack`, Cover where `loseHp` is called in
 * `attackOnce`, what an attack roll spends (Off-balance, Command, Hidden) in
 * `spendAttackRoll`, and Counter after the attack in `attackOnce` (ticket 08:
 * `counterattackAfter`).
 */
import type { Dice, Skill, Tile } from '@mt/shared'
import type { BattleEvent, Rejection } from './battle.ts'
import { loseHp } from './damage.ts'
import { derive } from './derived.ts'
import { rollDice } from './dice.ts'
import { unitsOnLine } from './lineOfSight.ts'
import { longRangeFrom, sightBlockingTiles } from './rangeRules.ts'
import { distance } from './movement.ts'
import { emit, rollD20, type Resolution } from './resolution.ts'
import { combineRollMode, commandSources, rollModeSources, type RollMode, type RollModeSource } from './rollMode.ts'
import { findUnit, replaceUnit, type BattleState, type PendingDecision, type UnitId, type UnitState } from './state.ts'
import {
  attackRollBonuses,
  damageDealtModifiers,
  defenceBonus,
  endAfterAttackRoll,
  giveSkillStatuses,
  statusOdds,
  statusType,
  untargetableFrom,
  type Chance,
  type StatusBonus,
  type StatusOdds,
} from './statuses.ts'
import { activate, activationBlocker } from './turns.ts'

export const BASIC_ATTACK = 'basic_attack'
export const DEFEND = 'defend'
/**
 * The `skill` of a counterattack's `attackRolled` and `damageDealt` events
 * (rules §14.2). Not a skill in data: Countering (or Pincer Guard) gives its dice.
 */
export const COUNTERATTACK = 'counterattack'

// ------------------------------------------------------------- targeting

/**
 * Why `unitId` cannot act now, or the Unit (rules §17.4): Battle going on, in
 * play, no decision pending, its side to act, its activation open (or able
 * to start) and the part of its activation it would use (Action or Move)
 * unused. `neither`: uses no Action or Move (Command, rules §16.1).
 */
export function checkActor(state: BattleState, unitId: UnitId, uses: 'action' | 'move' | 'neither' = 'action'): UnitState | Rejection {
  if (state.outcome !== null) return { code: 'battle-over', message: 'The Battle is over' }
  if (state.phase !== 'play') return { code: 'wrong-phase', message: 'Not during deployment' }
  if (state.pending !== null) return pendingRejection(state.pending)
  const unit = findUnit(state, unitId)
  if (unit === undefined) return { code: 'unknown-unit', message: `No Unit "${unitId}" on the Board` }
  if (unit.side !== state.sideToAct) {
    return { code: 'not-your-turn', message: `${unitId} belongs to side ${unit.side}; side ${state.sideToAct} is to act` }
  }
  const blocker = activationBlocker(state, unit)
  if (blocker !== null) return blocker
  if (uses === 'action' && unit.hasActed) {
    return { code: 'already-acted', message: `${unitId} already used its Action this Turn` }
  }
  if (uses === 'move' && unit.hasMoved) return { code: 'already-moved', message: `${unitId} already moved this Turn` }
  return unit
}

/**
 * Whether `user` may aim `skill` at the enemy `targetId` (rules §8.1): an
 * enemy on the Board at distance 1 to the skill's range and, at distance 2 or
 * more, not Hidden (§8.2) and in line of sight unless the user is Flying (§7).
 */
export function checkEnemyTarget(state: BattleState, user: UnitState, skill: Skill, targetId: UnitId): UnitState | Rejection {
  const target = findUnit(state, targetId)
  if (target === undefined) return { code: 'unknown-unit', message: `No Unit "${targetId}" on the Board` }
  if (target.side === user.side) {
    return { code: 'not-an-enemy', message: `${targetId} is on the same side as ${user.id}` }
  }
  const d = distance(user.tile, target.tile)
  if (d < 1 || d > skill.range) {
    return { code: 'out-of-range', message: `${targetId} is ${d} tiles away; ${skill.name} reaches ${skill.range}` }
  }
  // Rules §8.1 condition 2, §8.2: a Hidden enemy only from distance 1 (attacks, saves and Mark alike).
  const hiddenFrom = untargetableFrom(state, target)
  if (hiddenFrom !== null && d >= hiddenFrom) {
    return { code: 'target-hidden', message: `${targetId} is Hidden and ${d} tiles from ${user.id}` }
  }
  // Rules §7.1: checked from distance 2; a Flying user sees over Units (a Flying target can still be blocked).
  if (d >= 2 && !isFlying(user)) {
    const blockers = unitsOnLine(state, user.tile, target.tile)
    if (blockers.length > 0) {
      const ids = blockers.map((u) => u.id)
      return {
        code: 'no-line-of-sight',
        message: `${ids.join(', ')} ${ids.length === 1 ? 'stands' : 'stand'} between ${user.id} and ${targetId}`,
        blockedBy: ids,
      }
    }
    // Variant rules (ticket 08): terrain on the line blocks it too; no Unit to name.
    if (sightBlockingTiles(state, user.tile, target.tile).length > 0) {
      return { code: 'no-line-of-sight', message: `Terrain blocks the line between ${user.id} and ${targetId}`, blockedBy: [] }
    }
  }
  return target
}

export interface AttackPlan {
  readonly attacker: UnitState
  readonly target: UnitState
  readonly skill: Skill
}

/**
 * Whether `attackerId` may use the attack `skillId` (Basic Attack) on
 * `targetId` now. Returns the plan, or why not. Shared by legalActions,
 * applyAction and previewAction so all three always agree.
 */
export function checkAttack(
  state: BattleState,
  attackerId: UnitId,
  skillId: string,
  targetId: UnitId,
): AttackPlan | Rejection {
  const attacker = checkActor(state, attackerId)
  if (isRejection(attacker)) return attacker
  const skill = state.skills[skillId]
  if (skill === undefined) return { code: 'unknown-skill', message: `No skill "${skillId}"` }
  const target = checkEnemyTarget(state, attacker, skill, targetId)
  if (isRejection(target)) return target
  return { attacker, target, skill }
}

/** Any other action while a decision is pending (rules §15.1, §18). */
export function pendingRejection(pending: PendingDecision): Rejection {
  return {
    code: 'decision-pending',
    message:
      pending.kind === 'retreat'
        ? `${pending.unit} must first choose where to step (${pending.skill})`
        : `Side ${pending.side} must first decide whether to use Inspiration`,
  }
}

export function isRejection(value: object): value is Rejection {
  return 'code' in value
}

export function isFlying(unit: UnitState): boolean {
  return unit.kind === 'monster' && unit.movement === 'flying'
}

// ------------------------------------------------------------ attack roll

/** The d20 face that counts: the only one, or the higher/lower of two (rules §5.2). */
function keptFace(mode: RollMode, first: number, second: number): number {
  if (mode === 'advantage') return Math.max(first, second)
  if (mode === 'disadvantage') return Math.min(first, second)
  return first
}

/** Natural 20 always hits and is a critical; natural 1 always misses (rules §10.2). */
function isHit(face: number, attackBonus: number, defence: number): boolean {
  if (face === 20) return true
  if (face === 1) return false
  return face + attackBonus >= defence
}

/** Guard for physical attacks, Ward for elemental ones (rules §10.1), plus Guarded (§10.2, §12). */
function defenceOf(state: BattleState, skill: Skill, target: UnitState): { kind: 'guard' | 'ward'; value: number; bonus: number } {
  const values = derive(target)
  const bonus = defenceBonus(state, target)
  return skill.attack === 'elemental'
    ? { kind: 'ward', value: values.ward + bonus, bonus }
    : { kind: 'guard', value: values.guard + bonus, bonus }
}

// ----------------------------------------------------------------- damage

/** The dice this attacker rolls for this skill before a critical doubles them; `null` when it deals no damage (Mark). */
function damageDice(skill: Skill, attacker: UnitState): Dice | null {
  if (attacker.kind === 'tamer' && skill.tamerDamage !== undefined) return skill.tamerDamage
  return skill.damage ?? null
}

/**
 * Damage mod added once to the damage dice (rules §10.1, §10.3 step 2):
 * physical uses POW mod at distance 1 and SEN mod at 2 or more; elemental
 * uses INT mod. Statuses (Weakened) come on top (`damageDealtModifiers`).
 */
function damageModifier(skill: Skill, attacker: UnitState, atDistance: number): number {
  const mods = derive(attacker).damageMod
  if (skill.attack === 'elemental') return mods.elemental
  return atDistance <= 1 ? mods.melee : mods.ranged
}

/** Damage is at least 1 when an attack that deals damage hits (rules §10.3 step 4). */
const MIN_DAMAGE = 1

export interface DamageRange {
  /** Dice rolled, already doubled for a critical. */
  readonly dice: Dice
  /** Everything added once to the dice: the damage mod plus `statusModifiers` (Weakened −2, rules §10.3). */
  readonly modifier: number
  /** The part of `modifier` that statuses give (Weakened); absent when none. */
  readonly statusModifiers?: readonly StatusBonus[]
  readonly min: number
  readonly max: number
}

function damageRange(dice: Dice, modifier: number, statusModifiers: readonly StatusBonus[]): DamageRange {
  return {
    dice,
    modifier,
    ...(statusModifiers.length > 0 ? { statusModifiers } : {}),
    min: Math.max(MIN_DAMAGE, dice.count + modifier),
    max: Math.max(MIN_DAMAGE, dice.count * dice.sides + modifier),
  }
}

// ---------------------------------------------------------------- preview

export type { Chance } from './statuses.ts'

/** What one attack would do, computed without rolling (rules §21.1). */
export interface AttackPreview {
  readonly type: 'attack'
  readonly skill: string
  readonly attacker: UnitId
  readonly target: UnitId
  readonly distance: number
  /**
   * Net effect of every source after cancelling (rules §5.2): `rollModeSources` and, when
   * `longRangeDisadvantage` is set, that disadvantage as well.
   */
  readonly rollMode: RollMode
  /**
   * The sources of advantage or disadvantage on this roll, before cancelling (rules §5.1),
   * except the long-range disadvantage, which is not a `RollModeSource` (the type is
   * matched exhaustively by the UI) and is in `longRangeDisadvantage`. Read both to explain `rollMode`.
   */
  readonly rollModeSources: readonly RollModeSource[]
  /** Present when the long-range disadvantage applies to this roll (rules §5.1, D-31): a roll from the distance in `RangeRules.longRangeDisadvantageFrom` or more; part of `rollMode`, not of `rollModeSources`. */
  readonly longRangeDisadvantage?: true
  /** Everything added to the d20: SEN mod + proficiency, plus `statusAttackBonuses`. */
  readonly attackBonus: number
  /** The part of `attackBonus` that statuses give (Rallied +1, rules §10.2). */
  readonly statusAttackBonuses: readonly StatusBonus[]
  /** Guard or Ward of the target, Guarded bonus included. */
  readonly defence: number
  readonly defenceKind: 'guard' | 'ward'
  /** The part of `defence` that comes from Guarded (rules §12); 0 when not Guarded. */
  readonly guardedBonus: number
  /** Chance the attack hits, criticals included: over 20 faces, or 400 pairs with advantage/disadvantage. */
  readonly hitChance: Chance
  /** Chance of a natural 20 on the d20 that counts. */
  readonly criticalChance: Chance
  /** Damage range on an ordinary hit; `null` for an attack without damage (Mark). */
  readonly damage: DamageRange | null
  /** Damage range on a critical (dice doubled); `null` without damage. */
  readonly criticalDamage: DamageRange | null
  /** Statuses a hit gives (if the target is still up), each with the chance the target fails its save. */
  readonly statuses: readonly StatusOdds[]
  /**
   * Present when the target is Countering at distance 1 (rules §14.2): the
   * counterattack that follows, hit or miss, as long as both are still up.
   */
  readonly counterattack?: AttackPreview
}

/** Count the d20 outcomes (1 die, or every ordered pair of 2) whose kept face passes `test`. */
function d20Chance(mode: RollMode, test: (face: number) => boolean): Chance {
  if (mode === 'normal') {
    let count = 0
    for (let face = 1; face <= 20; face++) if (test(face)) count++
    return { numerator: count, denominator: 20 }
  }
  let count = 0
  for (let first = 1; first <= 20; first++) {
    for (let second = 1; second <= 20; second++) if (test(keptFace(mode, first, second))) count++
  }
  return { numerator: count, denominator: 400 }
}

// The same few chances come up again and again (the AI previews thousands of attacks per
// Battle): remember each one. Pure functions of their arguments, so nothing else changes.
const hitChances = new Map<string, Chance>()
const criticalChances = new Map<RollMode, Chance>()

function hitChanceOf(mode: RollMode, attackBonus: number, defence: number): Chance {
  const key = `${mode}:${attackBonus}:${defence}`
  let chance = hitChances.get(key)
  if (chance === undefined) {
    chance = d20Chance(mode, (face) => isHit(face, attackBonus, defence))
    hitChances.set(key, chance)
  }
  return chance
}

function criticalChanceOf(mode: RollMode): Chance {
  let chance = criticalChances.get(mode)
  if (chance === undefined) {
    chance = d20Chance(mode, (face) => face === 20)
    criticalChances.set(mode, chance)
  }
  return chance
}

/** `isCounterattack`: this attack is itself a counterattack, which never triggers another (rules §14.2). */
export function previewAttack(state: BattleState, plan: AttackPlan, isCounterattack = false): AttackPreview {
  const { attacker, target, skill } = plan
  const sources = rollModeSources(state, attacker, target, isCounterattack)
  const atDistance = distance(attacker.tile, target.tile)
  const farFrom = longRangeFrom(state)
  const longRange = farFrom !== undefined && atDistance >= farFrom
  const mode = combineRollMode(sources, longRange)
  const bonuses = attackRollBonuses(state, attacker)
  const attackBonus = derive(attacker).attackBonus + bonuses.reduce((sum, b) => sum + b.bonus, 0)
  const defence = defenceOf(state, skill, target)
  const dice = damageDice(skill, attacker)
  const statusModifiers = damageDealtModifiers(state, attacker)
  const modifier = damageModifier(skill, attacker, atDistance) + statusModifiers.reduce((sum, m) => sum + m.bonus, 0)
  return {
    type: 'attack',
    skill: skill.id,
    attacker: attacker.id,
    target: target.id,
    distance: atDistance,
    rollMode: mode,
    rollModeSources: sources,
    ...(longRange ? { longRangeDisadvantage: true as const } : {}),
    attackBonus,
    statusAttackBonuses: bonuses,
    defence: defence.value,
    defenceKind: defence.kind,
    guardedBonus: defence.bonus,
    hitChance: hitChanceOf(mode, attackBonus, defence.value),
    criticalChance: criticalChanceOf(mode),
    damage: dice === null ? null : damageRange(dice, modifier, statusModifiers),
    criticalDamage: dice === null ? null : damageRange({ count: dice.count * 2, sides: dice.sides }, modifier, statusModifiers),
    statuses: statusOdds(attacker, target, skill),
    ...counterattackPreview(state, attacker, target, atDistance, isCounterattack),
  }
}

function counterattackPreview(
  state: BattleState,
  attacker: UnitState,
  target: UnitState,
  atDistance: number,
  isCounterattack: boolean,
): { counterattack?: AttackPreview } {
  const countering = isCounterattack || atDistance !== 1 ? null : counteringOf(state, target)
  if (countering === null) return {}
  return { counterattack: previewAttack(state, { attacker: target, target: attacker, skill: countering.skill }, true) }
}

// ----------------------------------------------------------- counterattack

/**
 * A Unit's Countering (rules §14.2), or `null`: the status, and the attack it
 * makes: physical, distance 1, the status's dice (1d8) unless a Passive in
 * the Unit's loadout replaces them (Pincer Guard: 2d8, rules §15.1).
 */
export function counteringOf(state: BattleState, unit: UnitState): { status: string; skill: Skill } | null {
  for (const status of unit.statuses) {
    const dice = statusType(state, status.id).effects.counterattack
    if (dice === undefined) continue
    const passive = unit.skills
      .map((id) => state.skills[id])
      .find((s) => s?.tier === 'passive' && s.effects?.counterattackDamage !== undefined)
    const damage = passive?.effects?.counterattackDamage ?? dice
    return {
      status: status.id,
      skill: { id: COUNTERATTACK, name: 'Counterattack', tier: 'minor', target: 'enemy', range: 1, attack: 'physical', damage },
    }
  }
  return null
}

/**
 * Rules §10.5 step 6: after `attackerId`'s attack roll against `targetId`
 * (hit or miss, D-23), if the target is Countering, the attacker is an enemy
 * at distance 1, both are still up and the Battle goes on, the target
 * counterattacks at once (its side may reroll that attack roll with
 * Inspiration, rules §18), then Countering ends. Uses no Action.
 */
function* counterattackAfter(before: BattleState, attackerId: UnitId, targetId: UnitId): Resolution<BattleState> {
  if (before.outcome !== null) return before
  const attacker = findUnit(before, attackerId)
  const target = findUnit(before, targetId)
  if (attacker === undefined || target === undefined || attacker.side === target.side) return before
  if (distance(attacker.tile, target.tile) !== 1) return before
  const countering = counteringOf(before, target)
  if (countering === null) return before
  const dice = countering.skill.damage ?? { count: 1, sides: 8 }
  yield* emit({ type: 'counterattack', unit: target.id, target: attacker.id, dice })
  const state = (yield* attackOnce(before, target.id, attacker.id, countering.skill, { counterattack: true })).state
  // Countering lasts for one counterattack (rules §14.2); nothing more happens once the Battle is over.
  const holder = findUnit(state, target.id)
  if (state.outcome !== null || holder === undefined) return state
  yield* emit({ type: 'statusEnded', unit: holder.id, status: countering.status })
  return replaceUnit(state, { ...holder, statuses: holder.statuses.filter((s) => s.id !== countering.status) })
}

// ---------------------------------------------------------------- resolve

/**
 * One attack against one target (rules §10.5 steps 1–4, dice order §21.4):
 * attack roll (the attacker's side may reroll it with Inspiration) → on a
 * hit, damage dice (doubled on a critical) + modifier → HP goes down (a Unit
 * at 0 leaves the Board and the Battle may end) → if the target is still up,
 * the skill's statuses (with their saves) → hit or miss, the attacker's
 * Hidden ends (step 5, rules §8.2) → the target's counterattack if
 * it is Countering (step 6; never for a counterattack). Does not book the
 * Action or activation: the caller does. `hit` is this attack's own result.
 */
export function* attackOnce(
  before: BattleState,
  attackerId: UnitId,
  targetId: UnitId,
  skill: Skill,
  options: { readonly counterattack?: boolean } = {},
): Resolution<{ state: BattleState; hit: boolean }> {
  const attacker = findUnit(before, attackerId)
  const target = findUnit(before, targetId)
  if (attacker === undefined || target === undefined) throw new Error(`Attack between Units not on the Board`)
  const isCounterattack = options.counterattack === true
  const preview = previewAttack(before, { attacker, target, skill }, isCounterattack)

  const rolled = yield* rollD20(before, attacker.side, preview.rollMode === 'normal' ? 1 : 2, (rolls) => {
    const face = keptFace(preview.rollMode, rolls[0] ?? 0, rolls[1] ?? 0)
    return {
      type: 'attackRolled' as const,
      attacker: attacker.id,
      target: target.id,
      skill: skill.id,
      rollMode: preview.rollMode,
      rolls,
      natural: face,
      attackBonus: preview.attackBonus,
      total: face + preview.attackBonus,
      defence: preview.defence,
      defenceKind: preview.defenceKind,
      hit: isHit(face, preview.attackBonus, preview.defence),
      critical: face === 20,
    }
  })
  let state = rolled.state
  const { hit, critical } = rolled.roll
  const range = !hit ? null : critical ? preview.criticalDamage : preview.damage
  if (range !== null) {
    const damage = rollDice(state.dice, range.dice.count, range.dice.sides)
    const sum = damage.rolls.reduce((total, roll) => total + roll, 0)
    const amount = Math.max(MIN_DAMAGE, sum + range.modifier)
    // Cover (rules §10.3 step 5, §15.4): the damage, worked out in full, comes off the covering Tamer instead.
    const cover = coverOf(state, target.id)
    const loss = loseHp({ ...state, dice: damage.stream }, cover ?? target.id, amount)
    yield* emit(
      {
        type: 'damageDealt',
        source: attacker.id,
        target: target.id,
        skill: skill.id,
        dice: range.dice,
        rolls: damage.rolls,
        modifier: range.modifier,
        ...(range.statusModifiers !== undefined ? { statusModifiers: range.statusModifiers } : {}),
        amount,
        ...(cover !== undefined ? { coveredBy: cover } : {}),
        hpBefore: loss.hpBefore,
        hpAfter: loss.hpAfter,
      },
      ...loss.after,
    )
    state = loss.state
  }

  // Rules §14.1: statuses stick only if the target is still up after the damage.
  if (hit && state.outcome === null && findUnit(state, target.id) !== undefined) {
    state = yield* giveSkillStatuses(state, attacker, target.id, skill)
  }
  // Rules §10.5 step 5, hit or miss, counterattacks included: the attacker's statuses that last
  // until it attacks end (Hidden §8.2, Off-balance §14.2) and Command's advantage is spent (§16.3).
  if (state.outcome === null) {
    const spent = spendAttackRoll(state, attacker.id, isCounterattack)
    yield* emit(...spent.events)
    state = spent.state
  }
  if (!isCounterattack) state = yield* counterattackAfter(state, attacker.id, target.id)
  return { state, hit }
}

/**
 * The covering Tamer still on the Board when `unitId` is under Cover (rules
 * §15.4, D-21), or `undefined`.
 */
export function coverOf(state: BattleState, unitId: UnitId): UnitId | undefined {
  const tamer = findUnit(state, unitId)?.coveredBy
  return tamer !== undefined && findUnit(state, tamer) !== undefined ? tamer : undefined
}

/**
 * Rules §10.5 step 5, after an attack roll by `attackerId` (hit or miss, any
 * attack roll, counterattacks included): statuses that last until the
 * holder attacks end (Hidden, Off-balance: `endAfterAttackRoll`), and
 * Command's advantage on it is spent (even when Tamer protection left it out,
 * D-04; never by a counterattack, §14.2). Pure: also used to preview Burst's
 * later targets (D-04).
 */
export function spendAttackRoll(
  state: BattleState,
  attackerId: UnitId,
  isCounterattack: boolean,
): { state: BattleState; events: BattleEvent[] } {
  const attacker = findUnit(state, attackerId)
  if (attacker === undefined) return { state, events: [] }
  const ended = endAfterAttackRoll(state, attackerId)
  const events: BattleEvent[] = [...ended.events]
  let next = ended.state
  const command = next.command
  if (command !== null && commandSources(state, attacker, isCounterattack).length > 0) {
    next = { ...next, command: { ...command, spent: true } }
    events.push({ type: 'commandSpent', unit: attacker.id, tamer: command.tamer })
  }
  return { state: next, events }
}

/**
 * Basic Attack (rules §10.5): the attacker's Action is used whether it hits
 * or misses, and the attack starts (or continues) its activation (rules §17.4).
 */
export function* resolveAttack(before: BattleState, plan: AttackPlan): Resolution<BattleState> {
  const { attacker, target, skill } = plan
  const active = activate(before, attacker.id)
  const booked = { ...active, units: active.units.map((u) => (u.id === attacker.id ? { ...u, hasActed: true } : u)) }
  return (yield* attackOnce(booked, attacker.id, target.id, skill)).state
}

/**
 * A what-if attack preview for the AI (ticket 15): `attackerId` attacking
 * `targetId` with `skillId` as the rules of the roll stand in `state`
 * (roll mode sources, Guard/Ward and Guarded, attack bonus, damage dice and
 * mod by distance, statuses' save odds, counterattack), with the attacker on
 * `attackerTile` and the target on `targetTile` when given. Whose Turn it is,
 * range, line of sight, Hidden and cooldowns are NOT checked: legality is
 * `legalActions`' job. Pure; draws no dice. Throws for a Unit not on the
 * Board or an unknown skill (a programming error).
 */
export function previewAttackWhatIf(
  state: BattleState,
  attackerId: UnitId,
  targetId: UnitId,
  skillId: string,
  tiles: { readonly attackerTile?: Tile; readonly targetTile?: Tile } = {},
): AttackPreview {
  const skill = state.skills[skillId]
  if (skill === undefined) throw new Error(`No skill "${skillId}"`)
  let moved = state
  for (const [id, tile] of [
    [attackerId, tiles.attackerTile],
    [targetId, tiles.targetTile],
  ] as const) {
    const unit = findUnit(moved, id)
    if (unit === undefined) throw new Error(`No Unit "${id}" on the Board`)
    if (tile !== undefined && (unit.tile.x !== tile.x || unit.tile.y !== tile.y)) moved = replaceUnit(moved, { ...unit, tile })
  }
  const attacker = findUnit(moved, attackerId)
  const target = findUnit(moved, targetId)
  if (attacker === undefined || target === undefined) throw new Error('Units left the Board')
  return previewAttack(moved, { attacker, target, skill })
}
