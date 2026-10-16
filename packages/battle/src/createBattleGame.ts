import * as Phaser from 'phaser'
import { BattleScene, BOARD_PIXELS, type BattleSceneData } from './BattleScene.ts'
import { alignInputOnPress, destroyBoard, fitBoard } from './boardFit.ts'
import type { BattleSessionPort, BoardLabels } from './port.ts'

/**
 * Mount the Board in `parent`. The canvas is 224x224 (7 tiles of 32 px),
 * scaled with nearest-neighbour sampling (pixelArt) by a whole number of
 * device pixels per Board pixel (`boardZoom`). Call `fitBattleGame` when the
 * parent changes size. Tear down with `destroyBattleGame`.
 */
export function createBattleGame(parent: HTMLElement, session: BattleSessionPort, labels: BoardLabels): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: BOARD_PIXELS,
    height: BOARD_PIXELS,
    backgroundColor: '#000000',
    pixelArt: true,
    scale: { mode: Phaser.Scale.NONE, zoom: 1 },
    audio: { noAudio: true },
    banner: false,
  })
  const data: BattleSceneData = { session, labels }
  game.scene.add('battle', BattleScene, true, data)
  return game
}

/** Re-size the Board for its parent and the current devicePixelRatio, and refresh its input bounds. */
export function fitBattleGame(game: Phaser.Game, parent: HTMLElement): void {
  if (!game.isBooted || game.canvas === undefined) return
  fitBoard(game, parent, BOARD_PIXELS, window.devicePixelRatio || 1)
}

/**
 * Keep the Board sized and its input aligned while mounted: on parent resize,
 * window resize (also browser zoom, which changes devicePixelRatio), once the
 * layout has settled (next frame, web fonts loaded), and before every press.
 * Returns the teardown, which also destroys the game.
 */
export function mountBattleGame(parent: HTMLElement, session: BattleSessionPort, labels: BoardLabels): () => void {
  const game = createBattleGame(parent, session, labels)
  const fit = () => fitBattleGame(game, parent)
  fit()
  game.events.once(Phaser.Core.Events.READY, fit)
  const frame = requestAnimationFrame(fit)
  let mounted = true
  void document.fonts?.ready.then(() => {
    if (mounted) fit()
  })
  const observer = new ResizeObserver(fit)
  observer.observe(parent)
  window.addEventListener('resize', fit)
  const stopAligning = alignInputOnPress(parent, game)
  return () => {
    mounted = false
    cancelAnimationFrame(frame)
    observer.disconnect()
    window.removeEventListener('resize', fit)
    stopAligning()
    destroyBoard(game)
  }
}
