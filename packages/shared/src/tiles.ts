/**
 * Board coordinates (rules §2.1).
 *
 * `x` is the column index (a = 0 … g = 6) and `y` the row index
 * (row 1 = 0 … row 7 = 6). Data files and the UI use the tile name form
 * "a1" … "g7"; code uses `Tile` objects.
 */

/** The Board is always 7x7 in phase 1 (rules §2.1). */
export const BOARD_SIZE = 7

export interface Tile {
  readonly x: number
  readonly y: number
}

const COLUMNS = 'abcdefg'
const TILE_NAME = /^[a-g][1-7]$/

export function isTileName(name: string): boolean {
  return TILE_NAME.test(name)
}

/** "d1" → { x: 3, y: 0 }. Throws on a name outside a1–g7. */
export function tileFromName(name: string): Tile {
  if (!isTileName(name)) {
    throw new Error(`Not a tile name: "${name}" (expected a1–g7)`)
  }
  return { x: COLUMNS.indexOf(name.charAt(0)), y: Number(name.charAt(1)) - 1 }
}

/** { x: 3, y: 0 } → "d1". */
export function tileName(tile: Tile): string {
  return `${COLUMNS.charAt(tile.x)}${tile.y + 1}`
}

/**
 * The tile a tile lands on when the Board turns 180 degrees, e.g. a1 ↔ g7,
 * c2 ↔ e6, d4 ↔ d4. Every Board must look the same after the turn (rules §2.1).
 */
export function rotate180(tile: Tile): Tile {
  return { x: BOARD_SIZE - 1 - tile.x, y: BOARD_SIZE - 1 - tile.y }
}

export function sameTile(a: Tile, b: Tile): boolean {
  return a.x === b.x && a.y === b.y
}

export function isOnBoard(tile: Tile): boolean {
  return (
    Number.isInteger(tile.x) &&
    Number.isInteger(tile.y) &&
    tile.x >= 0 &&
    tile.x < BOARD_SIZE &&
    tile.y >= 0 &&
    tile.y < BOARD_SIZE
  )
}
