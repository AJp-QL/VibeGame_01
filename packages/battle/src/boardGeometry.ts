import type { Tile } from '@mt/shared'
import type { BattleState } from '@mt/session'

export const TILE_SIZE = 32

/** Battle and Board both expose the square terrain rows. */
export function boardPixels(board: Pick<BattleState, 'terrain'>): number {
  return board.terrain.length * TILE_SIZE
}

export function tileCentre(tile: Tile): { x: number; y: number } {
  return { x: tile.x * TILE_SIZE + TILE_SIZE / 2, y: tile.y * TILE_SIZE + TILE_SIZE / 2 }
}

/** Logical canvas coordinates, after Phaser has accounted for display zoom. */
export function tileAtPoint(x: number, y: number, size: number): Tile | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  const tile = { x: Math.floor(x / TILE_SIZE), y: Math.floor(y / TILE_SIZE) }
  return tile.x < 0 || tile.y < 0 || tile.x >= size || tile.y >= size ? null : tile
}
