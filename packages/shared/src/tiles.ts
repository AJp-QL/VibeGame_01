/**
 * Board coordinates (rules §2.1).
 *
 * `x` is the column index (a = 0, b = 1, …) and `y` the row index
 * (row 1 = 0, row 2 = 1, …). Data files and the UI use the tile name form
 * "a1" … "g7" on a 7x7 Board; code uses `Tile` objects.
 *
 * The size belongs to each Board (`boardSize(board)`, phase 1.x ticket 13): a
 * Board is a square of 3 to `MAX_BOARD_SIZE` tiles. The helpers here take the
 * size as an optional last argument.
 */

/** The smallest and the largest square Board (columns a to o). */
export const MIN_BOARD_SIZE = 3
export const MAX_BOARD_SIZE = 15

export interface Tile {
  readonly x: number
  readonly y: number
}

const COLUMNS = 'abcdefghijklmno'
const TILE_NAME = /^[a-o](?:[1-9]|1[0-5])$/

export function isTileName(name: string): boolean {
  return TILE_NAME.test(name)
}

/** "d1" → { x: 3, y: 0 }. Throws on a name that is not a column letter and a row number (a1 … o15). Whether it is on a Board is `isOnBoard`. */
export function tileFromName(name: string): Tile {
  if (!isTileName(name)) {
    throw new Error(`Not a tile name: "${name}" (expected a column letter and a row number, like d4)`)
  }
  return { x: COLUMNS.indexOf(name.charAt(0)), y: Number(name.slice(1)) - 1 }
}

/** { x: 3, y: 0 } → "d1". */
export function tileName(tile: Tile): string {
  return `${COLUMNS.charAt(tile.x)}${tile.y + 1}`
}

/**
 * The tile a tile lands on when a Board of `size` turns 180 degrees, e.g. on
 * 7x7 a1 ↔ g7, c2 ↔ e6, d4 ↔ d4. Every Board must look the same after the turn
 * (rules §2.1).
 */
export function rotate180(tile: Tile, size: number): Tile {
  return { x: size - 1 - tile.x, y: size - 1 - tile.y }
}

export function sameTile(a: Tile, b: Tile): boolean {
  return a.x === b.x && a.y === b.y
}

/** Whether `tile` is on a Board of `size` tiles a side. */
export function isOnBoard(tile: Tile, size: number): boolean {
  return Number.isInteger(tile.x) && Number.isInteger(tile.y) && tile.x >= 0 && tile.x < size && tile.y >= 0 && tile.y < size
}
