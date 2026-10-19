/**
 * The "safe / threatened tiles" metric of phase 1.x ticket 20, from the Threat
 * zone of CONTEXT.md: a tile is threatened when some Unit of the side about to
 * play could attack it this Turn, i.e. it is within the reach of a damaging
 * skill (area skills: range + area radius) from a tile the Unit can end its Move
 * on, or from where it stands.
 *
 * Exact in the Move (the engine's own reachable tiles under the distance metric
 * in play, other Units blocking) and in the skill range; it ignores line of
 * sight, cooldowns, Hidden and what the enemy stands on. The metric is the one in the
 * Battle's range rules (`RangeRules.distanceMetric`).
 */
import { boardSizeOf, distanceIn, reachableTiles, type BattleState } from '@mt/engine'
import type { Side, Tile } from '@mt/shared'

const boardTiles = (size: number): Tile[] => Array.from({ length: size * size }, (_, i) => ({ x: i % size, y: Math.floor(i / size) }))

/** What a Battle's Turn starts saw: per Turn start, the threatened share of the Board. */
export interface ThreatSample {
  /** 1-based count of Turn starts in the Battle (either side). */
  readonly turn: number
  readonly side: Side
  readonly threatened: number
  readonly tiles: number
}

/** Longest reach of a damaging skill of `unitId`, Basic Attack included. */
function reachOf(state: BattleState, unitId: string): number {
  const unit = state.units.find((u) => u.id === unitId)
  if (unit === undefined) return 0
  let reach = 0
  for (const id of ['basic_attack', ...unit.skills]) {
    const skill = state.skills[id]
    if (skill === undefined || skill.tier === 'passive' || skill.attack === undefined || skill.damage === undefined) continue
    reach = Math.max(reach, skill.range + (skill.target === 'area' ? (skill.area?.radius ?? 0) : 0))
  }
  return reach
}

/** The tiles the Units of `side` could attack on their coming Turn. */
export function threatenedTiles(state: BattleState, side: Side): ReadonlySet<number> {
  const size = boardSizeOf(state)
  const all = boardTiles(size)
  const threatened = new Set<number>()
  for (const unit of state.units) {
    if (unit.side !== side) continue
    const reach = reachOf(state, unit.id)
    if (reach === 0) continue
    const stands = [unit.tile, ...[...reachableTiles(state, unit).values()].map((path) => path[path.length - 1]!)]
    for (const tile of all) {
      const key = tile.y * 100 + tile.x
      if (threatened.has(key)) continue
      if (stands.some((from) => distanceIn(state, from, tile) <= reach)) threatened.add(key)
    }
  }
  return threatened
}

/** One sample at the start of `side`'s Turn. */
export function sampleThreat(state: BattleState, side: Side, turn: number): ThreatSample {
  const tiles = boardSizeOf(state) ** 2
  return { turn, side, threatened: threatenedTiles(state, side).size, tiles }
}
