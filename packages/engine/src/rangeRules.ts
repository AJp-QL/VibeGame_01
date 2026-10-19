/**
 * The two range rules of playtest v0.1.5 (phase 1.x tickets 08 and 09, rules
 * §5.1, §7, D-31): attack rolls from a distance get disadvantage, and mountain
 * blocks line of sight. A Battle plays with `GAME_RANGE_RULES` unless its setup
 * says otherwise; the simulator and the sim-v4 parity check give `NO_RANGE_RULES`
 * to play the rules as they were before.
 */
import type { Terrain, Tile } from '@mt/shared'
import type { DistanceMetric } from './movement.ts'
import { lineOfSightTiles } from './lineOfSight.ts'
import type { BattleState } from './state.ts'

/** The rules of the game (rules §5.1, §7.2, D-31). */
export const GAME_RANGE_RULES: RangeRules = { longRangeDisadvantageFrom: 4, sightBlockedBy: ['mountain'] }

/** Neither rule: how Battles were played before ticket 09 (sim-equivalent conditions, ticket 08 baseline). */
export const NO_RANGE_RULES: RangeRules = {}

/**
 * The name `RangeRules` had in the experiments of phase 1.x ticket 08.
 * @deprecated Use `RangeRules`.
 */
export type VariantRules = RangeRules

export interface RangeRules {
  /** Attack rolls from this distance or more get disadvantage (it cancels advantage, rules §5.2). Not for saves, which have no attack roll. */
  readonly longRangeDisadvantageFrom?: number
  /** A line of sight (rules §7.2) that passes through a tile of one of these terrains is blocked, like one that passes a Unit. A Flying user still sees over everything. */
  readonly sightBlockedBy?: readonly Terrain[]
  /** Experiment only (phase 1.x ticket 20): how distance and Move are counted; absent = Chebyshev, the game. */
  readonly distanceMetric?: DistanceMetric
}

/** The distance from which attack rolls get the long-range disadvantage, or `undefined` when the Battle has none (`NO_RANGE_RULES`; the game has 4). */
export function longRangeFrom(state: BattleState): number | undefined {
  return state.rangeRules?.longRangeDisadvantageFrom
}

/** Tiles on the line from `from` to `to` (ends excluded) whose terrain blocks sight; none unless the Battle has `sightBlockedBy`. */
export function sightBlockingTiles(state: BattleState, from: Tile, to: Tile): Tile[] {
  const blocking = state.rangeRules?.sightBlockedBy
  if (blocking === undefined || blocking.length === 0) return []
  return lineOfSightTiles(from, to).filter((tile) => {
    const terrain = state.terrain[tile.y]?.[tile.x]
    return terrain !== undefined && blocking.includes(terrain)
  })
}
