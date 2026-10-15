/**
 * Line of sight (rules §7, §21.3): integer Bresenham from the user's tile to
 * the target's tile, always in that direction (D-01). Every Unit standing on
 * a tile the line passes blocks; terrain never blocks.
 */
import { sameTile, type Tile } from '@mt/shared'
import type { BattleState, UnitState } from './state.ts'

/**
 * The tiles the line from `from` to `to` passes, in order, without the start
 * and the end tile (rules §7.3 steps 1–5). The line is not symmetric: the
 * tiles from A to B may differ from those from B to A.
 */
export function lineOfSightTiles(from: Tile, to: Tile): Tile[] {
  const dx = Math.abs(to.x - from.x)
  const dy = -Math.abs(to.y - from.y)
  const sx = from.x < to.x ? 1 : -1
  const sy = from.y < to.y ? 1 : -1
  let err = dx + dy
  let x = from.x
  let y = from.y
  const tiles: Tile[] = []
  while (x !== to.x || y !== to.y) {
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
    tiles.push({ x, y })
  }
  // The last tile is the end tile itself (step 5).
  tiles.pop()
  return tiles
}

/**
 * Units standing on the line from `from` to `to` (rules §7.2), in the order
 * the line meets them. Empty when the line is clear.
 */
export function unitsOnLine(state: BattleState, from: Tile, to: Tile): UnitState[] {
  return lineOfSightTiles(from, to).flatMap((tile) => state.units.filter((unit) => sameTile(unit.tile, tile)))
}
