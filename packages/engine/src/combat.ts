/**
 * Attacks (rules §8, §10, §19.1): who can be targeted, the attack roll,
 * damage, statuses on a hit, Units going down, the Battle ending, and the
 * exact odds a preview shows. Integer arithmetic only; dice come from the
 * Battle's stream in the order of rules §21.4.
 *
 * Line of sight (§7), advantage/disadvantage from element, terrain and Tamer
 * protection (§4, §5, §9, in rollMode.ts), Guarded (§12) and Rallied (§14)
 * are here. Each later rule has its slot: targeting (Hidden, Taunted) in
 * `checkEnemyTarget`, roll mode sources (Marked, Off-balance, Command) in
 * `rollModeSources`, defence bonuses in `defenceOf`, damage adjustments
 * (Weakened) in `damageModifier`, Cover where `loseHp` is called in
 * `attackOnce`, and Counter after the attack in `attackOnce`.
 */
import type { Dice, Skill } from '@mt/shared'
import type { Rejection } from './battle.ts'
import { loseHp } from './damage.ts'
import { derive } from './derived.ts'
import { rollDice } from './dice.ts'
import { unitsOnLine } from './lineOfSight.ts'
import { distance } from './movement.ts'
import { emit, rollD20, type Resolution } from './resolution.ts'
import { combineRollMode, rollModeSources, type RollMode, type RollModeSource } from './rollMode.ts'
import { findUnit, type BattleState, type PendingDecision, type UnitId, type UnitState } from './state.ts'
import {
  attackRollBonuses,
  defenceBonus,
  giveSkillStatuses,
  statusOdds,
  type Chance,
  type StatusBonus,
  type StatusOdds,
} from './statuses.ts'
import { activate, activationBlocker } from './turns.ts'

export const BASIC_ATTACK = 'basic_attack'
export const DEFEND = 'defend'

// ------------------------------------------------------------- targeting

/**
 * Why `unitId` cannot act now, or the Unit (rules §17.4): Battle going on, in
 * play, no decision pending, its side to act, its activation open (or able
 * to start) and the part of its activation it would use (Action or Move) unused.
 */
export function checkActor(state: BattleState, unitId: UnitId, uses: 'action' | 'move' = 'action'): UnitState | Rejection {
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
 * more, in line of sight unless the user is Flying (§7).
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
 * Modifier added once to the damage dice (rules §10.1, §10.3): physical uses
 * POW mod at distance 1 and SEN mod at 2 or more; elemental uses INT mod.
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
  readonly modifier: number
  readonly min: number
  readonly max: number
}

function damageRange(dice: Dice, modifier: number): DamageRange {
  return {
    dice,
    modifier,
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
  /** Net effect of `rollModeSources` after cancelling (rules §5.2). */
  readonly rollMode: RollMode
  /** Every source of advantage or disadvantage on this roll, before cancelling (rules §5.1). */
  readonly rollModeSources: readonly RollModeSource[]
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

export function previewAttack(state: BattleState, plan: AttackPlan): AttackPreview {
  const { attacker, target, skill } = plan
  const sources = rollModeSources(state, attacker, target)
  const mode = combineRollMode(sources)
  const bonuses = attackRollBonuses(state, attacker)
  const attackBonus = derive(attacker).attackBonus + bonuses.reduce((sum, b) => sum + b.bonus, 0)
  const defence = defenceOf(state, skill, target)
  const atDistance = distance(attacker.tile, target.tile)
  const dice = damageDice(skill, attacker)
  const modifier = damageModifier(skill, attacker, atDistance)
  return {
    type: 'attack',
    skill: skill.id,
    attacker: attacker.id,
    target: target.id,
    distance: atDistance,
    rollMode: mode,
    rollModeSources: sources,
    attackBonus,
    statusAttackBonuses: bonuses,
    defence: defence.value,
    defenceKind: defence.kind,
    guardedBonus: defence.bonus,
    hitChance: d20Chance(mode, (face) => isHit(face, attackBonus, defence.value)),
    criticalChance: d20Chance(mode, (face) => face === 20),
    damage: dice === null ? null : damageRange(dice, modifier),
    criticalDamage: dice === null ? null : damageRange({ count: dice.count * 2, sides: dice.sides }, modifier),
    statuses: statusOdds(attacker, target, skill),
  }
}

// ---------------------------------------------------------------- resolve

/**
 * One attack against one target (rules §10.5 steps 1–4, dice order §21.4):
 * attack roll (the attacker's side may reroll it with Inspiration) → on a
 * hit, damage dice (doubled on a critical) + modifier → HP goes down (a Unit
 * at 0 leaves the Board and the Battle may end) → if the target is still up,
 * the skill's statuses (with their saves). Does not book the Action or
 * activation: the caller does.
 */
export function* attackOnce(
  before: BattleState,
  attackerId: UnitId,
  targetId: UnitId,
  skill: Skill,
): Resolution<{ state: BattleState; hit: boolean }> {
  const attacker = findUnit(before, attackerId)
  const target = findUnit(before, targetId)
  if (attacker === undefined || target === undefined) throw new Error(`Attack between Units not on the Board`)
  const preview = previewAttack(before, { attacker, target, skill })

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
  if (!hit) return { state, hit }

  const range = critical ? preview.criticalDamage : preview.damage
  if (range !== null) {
    const damage = rollDice(state.dice, range.dice.count, range.dice.sides)
    const sum = damage.rolls.reduce((total, roll) => total + roll, 0)
    const amount = Math.max(MIN_DAMAGE, sum + range.modifier)
    const loss = loseHp({ ...state, dice: damage.stream }, target.id, amount)
    yield* emit(
      {
        type: 'damageDealt',
        source: attacker.id,
        target: target.id,
        skill: skill.id,
        dice: range.dice,
        rolls: damage.rolls,
        modifier: range.modifier,
        amount,
        hpBefore: loss.hpBefore,
        hpAfter: loss.hpAfter,
      },
      ...loss.after,
    )
    state = loss.state
  }

  // Rules §14.1: statuses stick only if the target is still up after the damage.
  if (state.outcome === null && findUnit(state, target.id) !== undefined) {
    state = yield* giveSkillStatuses(state, attacker, target.id, skill)
  }
  return { state, hit }
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
