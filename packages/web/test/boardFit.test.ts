import { describe, expect, it, vi } from 'vitest'
import { alignInputOnPress, boardZoom, destroyBoard, fitBoard, snapOffset, type BoardGame } from '@mt/battle/boardFit'

const BASE = 224

/** The 7×7 Board's box (styles.css `.board`): full width, height max(224px, min(100vw - 32px, 75vh)). */
function boardBox(viewportWidth: number, viewportHeight: number) {
  const width = viewportWidth - 32
  return { width, height: Math.max(224, Math.min(viewportWidth - 32, 0.75 * viewportHeight)) }
}

describe('Board zoom: whole device pixels per Board pixel', () => {
  for (const [label, viewport] of [
    ['360 px phone', [360, 640]],
    ['desktop', [1280, 800]],
  ] as const) {
    for (const dpr of [1, 1.25, 1.5, 1.5625, 2, 2.625, 3]) {
      it(`${label} at devicePixelRatio ${dpr}: crisp, fits, and readable`, () => {
        const box = boardBox(viewport[0], viewport[1])
        const zoom = boardZoom(box.width, box.height, dpr, BASE)
        const devicePerBoardPixel = zoom * dpr
        expect(Math.abs(devicePerBoardPixel - Math.round(devicePerBoardPixel))).toBeLessThan(1e-9)
        expect(BASE * zoom).toBeLessThanOrEqual(Math.min(box.width, box.height) + 1e-6)
        // A 32 px tile stays at least ~20 CSS px on a phone (in practice 32+ at common ratios).
        expect(BASE * zoom).toBeGreaterThanOrEqual(label === 'desktop' ? 448 : 224 * 0.6)
      })
    }
  }

  it('picks the largest fit and never less than 1 device pixel per Board pixel', () => {
    expect(boardZoom(328, 328, 1, BASE)).toBe(1)
    expect(boardZoom(328, 328, 1.5625, BASE)).toBe(2 / 1.5625)
    expect(boardZoom(328, 328, 3, BASE)).toBe(4 / 3)
    expect(boardZoom(100, 100, 1, BASE)).toBe(1)
    expect(boardZoom(500, 500, Number.NaN, BASE)).toBe(2)
  })

  it('snaps an edge onto a whole device pixel', () => {
    expect(snapOffset(10, 1)).toBe(0)
    expect(snapOffset(10.5, 2)).toBe(0)
    const shift = snapOffset(10.3, 1.5625)
    expect(Math.abs((10.3 + shift) * 1.5625 - Math.round((10.3 + shift) * 1.5625))).toBeLessThan(1e-9)
    expect(Math.abs(shift)).toBeLessThanOrEqual(0.5 / 1.5625)
  })
})

function fakeGame(canvas: BoardGame['canvas'] = null) {
  return {
    canvas,
    scale: { setZoom: vi.fn(), updateBounds: vi.fn() },
    destroy: vi.fn(),
  } satisfies BoardGame
}

describe('Board input and teardown', () => {
  it('re-reads the canvas position before every press reaches Phaser, until stopped', () => {
    const parent = new EventTarget()
    const game = fakeGame()
    const stop = alignInputOnPress(parent, game)
    for (const type of ['pointerdown', 'mousedown', 'touchstart']) parent.dispatchEvent(new Event(type))
    expect(game.scale.updateBounds).toHaveBeenCalledTimes(3)
    stop()
    parent.dispatchEvent(new Event('pointerdown'))
    expect(game.scale.updateBounds).toHaveBeenCalledTimes(3)
  })

  it('fitting sets the zoom, snaps the canvas and refreshes the input bounds', () => {
    const style = { translate: 'old' }
    const canvas = { style, getBoundingClientRect: () => ({ left: 10.3, top: 32 }) } as unknown as HTMLCanvasElement
    const game = fakeGame(canvas)
    fitBoard(game, { clientWidth: 328, clientHeight: 328 } as HTMLElement, BASE, 1.5625)
    expect(game.scale.setZoom).toHaveBeenCalledWith(2 / 1.5625)
    expect(style.translate).toMatch(/^-?[\d.e-]+px 0px$/)
    expect(game.scale.updateBounds).toHaveBeenCalledTimes(1)
  })

  it('destroying removes the canvas at once (a double mount leaves one canvas, even with no frames running)', () => {
    const remove = vi.fn()
    const game = fakeGame({ remove } as unknown as HTMLCanvasElement)
    destroyBoard(game)
    expect(game.destroy).toHaveBeenCalledWith(true)
    expect(remove).toHaveBeenCalledTimes(1)
    expect(() => destroyBoard(fakeGame(undefined))).not.toThrow()
  })
})
