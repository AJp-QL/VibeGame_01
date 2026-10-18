/**
 * Experiment switches for the range question of playtest v0.1.5 (phase 1.x
 * ticket 08). Both are OFF in the game: a Battle only has them when the
 * setup gives them, and the simulator does that to measure each change
 * before ticket 09 turns the chosen ones into rules.
 */
import type { Terrain, Tile } from '@mt/shared'
import { lineOfSightTiles } from './lineOfSight.ts'
import type { BattleState } from './state.ts'

export interface VariantRules {
  /** Attack rolls from this distance or more get disadvantage (it cancels advantage, rules §5.2). Not for saves, which have no attack roll. */
  readonly longRangeDisadvantageFrom?: number
  /** A line of sight (rules §7.3) that passes through a tile of one of these terrains is blocked, like one that passes a Unit. A Flying user still sees over everything. */
  readonly sightBlockedBy?: readonly Terrain[]
}

/** The distance from which attack rolls get the long-range disadvantage, or `undefined` (the game). */
export function longRangeFrom(state: BattleState): number | undefined {
  return state.variantRules?.longRangeDisadvantageFrom
}

/** Tiles on the line from `from` to `to` (ends excluded) whose terrain blocks sight; none unless the Battle has `sightBlockedBy`. */
export function sightBlockingTiles(state: BattleState, from: Tile, to: Tile): Tile[] {
  const blocking = state.variantRules?.sightBlockedBy
  if (blocking === undefined || blocking.length === 0) return []
  return lineOfSightTiles(from, to).filter((tile) => {
    const terrain = state.terrain[tile.y]?.[tile.x]
    return terrain !== undefined && blocking.includes(terrain)
  })
}
