/**
 * Attacks (rules §8, §10, §19.1): who can be targeted, the attack roll,
 * damage, Units going down, the Battle ending, and the exact odds a preview
 * shows. Integer arithmetic only; dice come from the Battle's stream in the
 * order of rules §21.4.
 *
 * Line of sight (§7), advantage/disadvantage from element, terrain and
 * Tamer protection (§4, §5, §9, in rollMode.ts) and Guarded (§12) are here.
 * Not yet (ticket 07 and later): Hidden, Taunted, Marked, Off-balance,
 * Command, Weakened, Cover, Counter, Inspiration. Each has its slot below:
 * targeting in `checkAttack`, roll mode sources in `rollModeSources`,
 * defence bonuses in `defenceOf`, damage adjustments in `damageModifier`.
 */
import type { Dice, Side, Skill } from '@mt/shared'
import type { BattleEvent, Rejection } from './battle.ts'
import { derive } from './derived.ts'
import { rollDie, type DiceStream } from './dice.ts'
import { unitsOnLine } from './lineOfSight.ts'
import { distance } from './movement.ts'
import { combineRollMode, rollModeSources, type RollMode, type RollModeSource } from './rollMode.ts'
import {
  findUnit,
  guardedBonus,
  type BattleOutcome,
  type BattleState,
  type UnitId,
  type UnitState,
} from './state.ts'
import { activate, activationBlocker } from './turns.ts'

export const BASIC_ATTACK = 'basic_attack'

// ------------------------------------------------------------- targeting

export interface AttackPlan {
  readonly attacker: UnitState
  readonly target: UnitState
  readonly skill: Skill
}

/**
 * Whether `attackerId` may use `skillId` on `targetId` now (rules §8.1, §17.4):
 * in play, the attacker's side to act, its activation open (or able to start)
 * and its Action unused, the target an enemy on the Board within range and,
 * at distance 2 or more, in line of sight unless the attacker is Flying (§7).
 * Returns the plan, or why not. Shared by legalActions, applyAction and
 * previewAction so all three always agree.
 */
export function checkAttack(
  state: BattleState,
  attackerId: UnitId,
  skillId: string,
  targetId: UnitId,
): AttackPlan | Rejection {
  if (state.outcome !== null) return { code: 'battle-over', message: 'The Battle is over' }
  if (state.phase !== 'play') return { code: 'wrong-phase', message: 'No attack during deployment' }
  const attacker = findUnit(state, attackerId)
  if (attacker === undefined) return { code: 'unknown-unit', message: `No Unit "${attackerId}" on the Board` }
  if (attacker.side !== state.sideToAct) {
    return {
      code: 'not-your-turn',
      message: `${attackerId} belongs to side ${attacker.side}; side ${state.sideToAct} is to act`,
    }
  }
  const blocker = activationBlocker(state, attacker)
  if (blocker !== null) return blocker
  if (attacker.hasActed) return { code: 'already-acted', message: `${attackerId} already used its Action this Turn` }
  const skill = state.skills[skillId]
  if (skill === undefined) return { code: 'unknown-skill', message: `No skill "${skillId}"` }
  const target = findUnit(state, targetId)
  if (target === undefined) return { code: 'unknown-unit', message: `No Unit "${targetId}" on the Board` }
  if (target.side === attacker.side) {
    return { code: 'not-an-enemy', message: `${targetId} is on the same side as ${attackerId}` }
  }
  const d = distance(attacker.tile, target.tile)
  if (d < 1 || d > skill.range) {
    return { code: 'out-of-range', message: `${targetId} is ${d} tiles away; ${skill.name} reaches ${skill.range}` }
  }
  // Rules §7.1: checked from distance 2; a Flying attacker sees over Units (a Flying target can still be blocked).
  if (d >= 2 && !isFlying(attacker)) {
    const blockers = unitsOnLine(state, attacker.tile, target.tile)
    if (blockers.length > 0) {
      const ids = blockers.map((u) => u.id)
      return {
        code: 'no-line-of-sight',
        message: `${ids.join(', ')} ${ids.length === 1 ? 'stands' : 'stand'} between ${attackerId} and ${targetId}`,
        blockedBy: ids,
      }
    }
  }
  return { attacker, target, skill }
}

export function isRejection(value: AttackPlan | Rejection): value is Rejection {
  return 'code' in value
}

function isFlying(unit: UnitState): boolean {
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
function defenceOf(skill: Skill, target: UnitState): { kind: 'guard' | 'ward'; value: number; bonus: number } {
  const values = derive(target)
  const bonus = guardedBonus(target)
  return skill.attack === 'physical'
    ? { kind: 'guard', value: values.guard + bonus, bonus }
    : { kind: 'ward', value: values.ward + bonus, bonus }
}

// ----------------------------------------------------------------- damage

/** The dice this attacker rolls for this skill, before a critical doubles them. */
function damageDice(skill: Skill, attacker: UnitState): Dice {
  return attacker.kind === 'tamer' && skill.tamerDamage !== undefined ? skill.tamerDamage : skill.damage
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

/** An exact probability: numerator / denominator (rules §21.1). */
export interface Chance {
  readonly numerator: number
  readonly denominator: number
}

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
  readonly attackBonus: number
  /** Guard or Ward of the target, Guarded bonus included. */
  readonly defence: number
  readonly defenceKind: 'guard' | 'ward'
  /** The part of `defence` that comes from Guarded (rules §12); 0 when not Guarded. */
  readonly guardedBonus: number
  /** Chance the attack hits, criticals included: over 20 faces, or 400 pairs with advantage/disadvantage. */
  readonly hitChance: Chance
  /** Chance of a natural 20 on the d20 that counts. */
  readonly criticalChance: Chance
  /** Damage range on an ordinary hit. */
  readonly damage: DamageRange
  /** Damage range on a critical (dice doubled). */
  readonly criticalDamage: DamageRange
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
  const attackBonus = derive(attacker).attackBonus
  const defence = defenceOf(skill, target)
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
    defence: defence.value,
    defenceKind: defence.kind,
    guardedBonus: defence.bonus,
    hitChance: d20Chance(mode, (face) => isHit(face, attackBonus, defence.value)),
    criticalChance: d20Chance(mode, (face) => face === 20),
    damage: damageRange(dice, modifier),
    criticalDamage: damageRange({ count: dice.count * 2, sides: dice.sides }, modifier),
  }
}

// ---------------------------------------------------------------- resolve

function rollDice(stream: DiceStream, count: number, sides: number): { rolls: number[]; stream: DiceStream } {
  const rolls: number[] = []
  let next = stream
  for (let i = 0; i < count; i++) {
    const roll = rollDie(next, sides)
    rolls.push(roll.value)
    next = roll.stream
  }
  return { rolls, stream: next }
}

function otherSide(side: Side): Side {
  return side === 'A' ? 'B' : 'A'
}

/** Rules §19.1, checked every time a Unit goes down. */
function outcomeAfterDown(state: BattleState, down: UnitState): BattleOutcome | null {
  const winner = otherSide(down.side)
  if (down.kind === 'tamer') return { winner, cause: 'tamerDown' }
  const monstersLeft = state.units.some((u) => u.side === down.side && u.kind === 'monster')
  return monstersLeft ? null : { winner, cause: 'monstersDown' }
}

/**
 * Resolve one attack against one target (rules §10.5, dice order §21.4):
 * attack roll → on a hit, damage dice (doubled on a critical) + modifier →
 * HP goes down → a Unit at 0 HP leaves the Board → the Battle may end.
 * The attacker's Action is used whether it hits or misses, and the attack
 * starts (or continues) its activation (rules §17.4).
 */
export function resolveAttack(before: BattleState, plan: AttackPlan): { state: BattleState; events: BattleEvent[] } {
  const { attacker, target, skill } = plan
  const state = activate(before, attacker.id)
  const preview = previewAttack(state, plan)
  const events: BattleEvent[] = []

  const d20 = rollDice(state.dice, preview.rollMode === 'normal' ? 1 : 2, 20)
  let dice = d20.stream
  const face = keptFace(preview.rollMode, d20.rolls[0] ?? 0, d20.rolls[1] ?? 0)
  const hit = isHit(face, preview.attackBonus, preview.defence)
  const critical = face === 20
  events.push({
    type: 'attackRolled',
    attacker: attacker.id,
    target: target.id,
    skill: skill.id,
    rollMode: preview.rollMode,
    rolls: d20.rolls,
    natural: face,
    attackBonus: preview.attackBonus,
    total: face + preview.attackBonus,
    defence: preview.defence,
    defenceKind: preview.defenceKind,
    hit,
    critical,
  })

  let units = state.units.map((u) => (u.id === attacker.id ? { ...u, hasActed: true } : u))
  let fallen = state.fallen
  let outcome: BattleOutcome | null = null

  if (hit) {
    const range = critical ? preview.criticalDamage : preview.damage
    const damage = rollDice(dice, range.dice.count, range.dice.sides)
    dice = damage.stream
    const sum = damage.rolls.reduce((total, roll) => total + roll, 0)
    const amount = Math.max(MIN_DAMAGE, sum + range.modifier)
    const hpAfter = Math.max(0, target.hp - amount)
    events.push({
      type: 'damageDealt',
      source: attacker.id,
      target: target.id,
      skill: skill.id,
      dice: range.dice,
      rolls: damage.rolls,
      modifier: range.modifier,
      amount,
      hpBefore: target.hp,
      hpAfter,
    })

    if (hpAfter > 0) {
      units = units.map((u) => (u.id === target.id ? { ...u, hp: hpAfter } : u))
    } else {
      // Rules §10.4: HP set to 0, off the Board at once, every status gone; then check §19.1.
      const down = { ...target, hp: 0, statuses: [] }
      units = units.filter((u) => u.id !== target.id)
      fallen = [...fallen, down]
      events.push({ type: 'unitDown', unit: target.id, tile: target.tile })
      outcome = outcomeAfterDown({ ...state, units, fallen }, down)
      if (outcome !== null) {
        events.push({ type: 'battleEnded', winner: outcome.winner, cause: outcome.cause, round: state.round })
      }
    }
  }

  return { state: { ...state, units, fallen, dice, outcome }, events }
}
