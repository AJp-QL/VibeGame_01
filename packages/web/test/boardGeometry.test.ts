import { describe, expect, it } from 'vitest'
import { boardPixels, tileAtPoint, tileCentre, TILE_SIZE } from '@mt/battle/boardGeometry'
import { boardZoom } from '@mt/battle/boardFit'

for (const size of [3, 7, 9, 15]) {
  describe(`${size}×${size} Board geometry`, () => {
    it('sizes from terrain and maps every cell centre back to that cell', () => {
      const board = { terrain: Array.from({ length: size }, () => Array.from({ length: size }, () => 'normal' as const)) }
      expect(boardPixels(board)).toBe(size * TILE_SIZE)
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const centre = tileCentre({ x, y })
        expect(tileAtPoint(centre.x, centre.y, size)).toEqual({ x, y })
      }
      expect(tileAtPoint(size * TILE_SIZE - 0.01, size * TILE_SIZE - 0.01, size)).toEqual({ x: size - 1, y: size - 1 })
    })
    it('rejects all outside edges and invalid coordinates', () => {
      const pixels = size * TILE_SIZE
      for (const [x, y] of [[-0.01, 0], [0, -0.01], [pixels, 0], [0, pixels], [Infinity, 0], [0, NaN]]) {
        expect(tileAtPoint(x!, y!, size)).toBeNull()
      }
    })
  })
}

it('9×9 fits desktop and 360 px phones at the existing display ratios', () => {
  const ratios = [1, 1.25, 1.5, 1.5625, 2, 2.625, 3]
  // Independently specified largest whole device-pixel scales for a 288 px Board.
  for (const [width, expectedScales] of [
    [328, [1, 1, 1, 1, 2, 2, 3]],
    [688, [2, 2, 3, 3, 4, 6, 7]],
  ] as const) for (const [index, dpr] of ratios.entries()) {
    const base = 9 * TILE_SIZE
    const zoom = boardZoom(width, width, dpr, base)
    expect(base * zoom).toBeLessThanOrEqual(width + 1e-6)
    expect(zoom * dpr).toBeCloseTo(Math.round(zoom * dpr))
    expect(zoom).toBeCloseTo(expectedScales[index]! / dpr)
    // One more device pixel per Board pixel must no longer fit.
    expect(base * (expectedScales[index]! + 1) / dpr).toBeGreaterThan(width)
  }
})
