/**
 * Values computed from stats, species, Star and Level (rules §3.2). Data never
 * stores these. Integer arithmetic only (ADR 0002, rules §21.2).
 */
import type { UnitState } from './state.ts'

/** Integer division rounded down (toward −∞). */
export function floorDiv(a: number, b: number): number {
  return (a - (((a % b) + b) % b)) / b
}

/** Integer division rounded toward zero. */
export function truncDiv(a: number, b: number): number {
  return (a - (a % b)) / b
}

/** stat mod = floor((stat − 10) / 2), e.g. 9 → −1 (rules §3.1). */
export function statMod(stat: number): number {
  return floorDiv(stat - 10, 2)
}

const MIN_BASE_MOVE = 2

/** The parts of a Unit its derived values come from (everything but where it is and what it did). */
export type UnitData = UnitState extends infer U
  ? U extends UnitState
    ? Omit<U, 'tile' | 'hp' | 'hasMoved' | 'hasActed' | 'statuses' | 'skillsUsed'>
    : never
  : never

/**
 * Base movement range (rules §3.2): 3 + trunc(AGI mod / 4), light +1,
 * heavy −1, Tamer 0, then at least 2. Situational bonuses (Aquatic, Command)
 * are added on top by the Move itself.
 */
export function baseMoveRange(unit: UnitData): number {
  const buildAdjustment = unit.kind === 'tamer' ? 0 : unit.build === 'light' ? 1 : -1
  return Math.max(MIN_BASE_MOVE, 3 + truncDiv(statMod(unit.stats.agi), 4) + buildAdjustment)
}

/**
 * Maximum HP (rules §3.2, §21.2): Monster floor((10 + VIT) × 12 / 10) heavy or
 * × 8 / 10 light, plus 3 × Star; Tamer 25 + 4 × (Level − 1).
 */
function maxHp(unit: UnitData): number {
  if (unit.kind === 'tamer') return 25 + 4 * (unit.level - 1)
  const buildFactor = unit.build === 'heavy' ? 12 : 8
  return floorDiv((10 + unit.stats.vit) * buildFactor, 10) + 3 * unit.star
}

/** Monster: ceil(Star / 2); Tamer: Level 1–4 +2, 5–8 +3, 9–10 +4 (rules §3.2). */
function proficiency(unit: UnitData): number {
  if (unit.kind === 'monster') return floorDiv(unit.star + 1, 2)
  return unit.level <= 4 ? 2 : unit.level <= 8 ? 3 : 4
}

/** Derived values the UI and tests can read through the engine's interface. */
export interface DerivedValues {
  /** Base movement range (rules §3.2), before Aquatic or Command bonuses. */
  readonly move: number
  readonly maxHp: number
  /** Defence against physical attacks: 10 + AGI mod + species Guard bonus (D-06). */
  readonly guard: number
  /** Defence against elemental attacks: 10 + SPI mod. */
  readonly ward: number
  readonly proficiency: number
  /** SEN mod + proficiency, added to every attack roll (rules §10.2). */
  readonly attackBonus: number
  /** Modifier added to damage dice (rules §10.1). */
  readonly damageMod: {
    /** Physical at distance 1: POW mod. */
    readonly melee: number
    /** Physical at distance 2 or more: SEN mod. */
    readonly ranged: number
    /** Elemental: INT mod. */
    readonly elemental: number
  }
}

export function derive(unit: UnitData): DerivedValues {
  const prof = proficiency(unit)
  const guardBonus = unit.kind === 'monster' ? unit.guardBonus : 0
  return {
    move: baseMoveRange(unit),
    maxHp: maxHp(unit),
    guard: 10 + statMod(unit.stats.agi) + guardBonus,
    ward: 10 + statMod(unit.stats.spi),
    proficiency: prof,
    attackBonus: statMod(unit.stats.sen) + prof,
    damageMod: {
      melee: statMod(unit.stats.pow),
      ranged: statMod(unit.stats.sen),
      elemental: statMod(unit.stats.int),
    },
  }
}
