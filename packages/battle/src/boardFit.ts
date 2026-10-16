/**
 * Sizing, input alignment and teardown of the Board's Phaser game, kept free
 * of Phaser itself (only the few members used are typed here) so it can be
 * unit-tested in Node.
 */

/** The parts of a Phaser.Game (4.x) this module uses. */
export interface BoardGame {
  readonly canvas: HTMLCanvasElement | null | undefined
  readonly scale: {
    setZoom(zoom: number): unknown
    /** Re-read the canvas position on the page; pointer → Board coordinates use it. */
    updateBounds(): void
  }
  destroy(removeCanvas: boolean, noReturn?: boolean): void
}

/**
 * The CSS zoom for a `base`-pixel Board in a `width` x `height` CSS-pixel box
 * on a screen with `dpr` device pixels per CSS pixel: the largest whole number
 * of *device* pixels per Board pixel that fits (at least 1), in CSS pixels.
 * Every Board pixel then covers the same whole number of screen pixels, so
 * nearest-neighbour scaling stays crisp even at a devicePixelRatio such as
 * 1.5625, where a whole-number CSS zoom would not.
 */
export function boardZoom(width: number, height: number, dpr: number, base: number): number {
  const ratio = Number.isFinite(dpr) && dpr > 0 ? dpr : 1
  // The small epsilon absorbs float noise such as 1.5625 * 286.72.
  const devicePixels = Math.min(width, height) * ratio + 1e-6
  const scale = Math.max(1, Math.floor(devicePixels / base))
  return scale / ratio
}

/**
 * The CSS shift that moves an edge at `position` (CSS pixels) onto a whole
 * device pixel, in (-0.5/dpr, 0.5/dpr].
 */
export function snapOffset(position: number, dpr: number): number {
  const ratio = Number.isFinite(dpr) && dpr > 0 ? dpr : 1
  const device = position * ratio
  const shift = (Math.round(device) - device) / ratio
  return Math.abs(shift) < 1e-6 ? 0 : shift
}

/** Size the Board for its parent box and the screen, snap it to device pixels, and refresh its input bounds. */
export function fitBoard(game: BoardGame, parent: HTMLElement, base: number, dpr: number): void {
  game.scale.setZoom(boardZoom(parent.clientWidth, parent.clientHeight, dpr, base))
  const canvas = game.canvas
  if (canvas) {
    canvas.style.translate = ''
    const rect = canvas.getBoundingClientRect()
    const dx = snapOffset(rect.left, dpr)
    const dy = snapOffset(rect.top, dpr)
    if (dx !== 0 || dy !== 0) canvas.style.translate = `${dx}px ${dy}px`
  }
  game.scale.updateBounds()
}

/**
 * Re-read the canvas position just before every press reaches Phaser. Phaser
 * caches the canvas position and only re-reads it when the window or the
 * parent's size changes, so a layout shift above the Board (a panel opening,
 * fonts loading on first visit) made taps land on the wrong tile. Listening in
 * the capture phase on the parent runs before Phaser's own listeners on the
 * canvas. Returns the function that stops listening.
 */
export function alignInputOnPress(target: EventTarget, game: Pick<BoardGame, 'scale'>): () => void {
  const refresh = () => game.scale.updateBounds()
  const events = ['pointerdown', 'mousedown', 'touchstart'] as const
  for (const type of events) target.addEventListener(type, refresh, { capture: true, passive: true })
  return () => {
    for (const type of events) target.removeEventListener(type, refresh, { capture: true })
  }
}

/**
 * Destroy the game and take its canvas out of the page now. Phaser only tears
 * down on its next frame; when frames are not running (a hidden tab, or a
 * development double mount before the first frame) the old canvas stayed
 * next to the new one.
 */
export function destroyBoard(game: BoardGame): void {
  // removeCanvas: true; never noReturn, or a new Game could not be created.
  game.destroy(true)
  game.canvas?.remove()
}
