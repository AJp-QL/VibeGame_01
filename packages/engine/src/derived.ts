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

/**
 * Base movement range (rules §3.2): 3 + trunc(AGI mod / 4), light +1,
 * heavy −1, Tamer 0, then at least 2. Situational bonuses (Aquatic, Command)
 * are added on top by the Move itself.
 */
export function baseMoveRange(unit: UnitState): number {
  const buildAdjustment = unit.kind === 'tamer' ? 0 : unit.build === 'light' ? 1 : -1
  return Math.max(MIN_BASE_MOVE, 3 + truncDiv(statMod(unit.stats.agi), 4) + buildAdjustment)
}

/** Derived values the UI and tests can read through the engine's interface. */
export interface DerivedValues {
  /** Base movement range (rules §3.2), before Aquatic or Command bonuses. */
  readonly move: number
}

export function derive(unit: UnitState): DerivedValues {
  return { move: baseMoveRange(unit) }
}
