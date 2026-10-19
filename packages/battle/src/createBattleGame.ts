import * as Phaser from 'phaser'
import { boardPixels } from './boardGeometry.ts'
import { BattleScene, type BattleSceneData, type BoardDisplayOptions } from './BattleScene.ts'
import { alignInputOnPress, destroyBoard, fitBoard } from './boardFit.ts'
import type { BattleSessionPort } from '@mt/session'
import type { BoardLabels } from './labels.ts'

/**
 * Mount the Board in `parent`. The canvas uses the Battle terrain dimensions and 32 px tiles,
 * scaled with nearest-neighbour sampling (pixelArt) by a whole number of
 * device pixels per Board pixel (`boardZoom`). Call `fitBattleGame` when the
 * parent changes size. Tear down with `destroyBattleGame`.
 */
export function createBattleGame(parent: HTMLElement, session: BattleSessionPort, labels: BoardLabels, display: BoardDisplayOptions = {}): Phaser.Game {
  const pixels = boardPixels(session.getSnapshot().state)
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: pixels,
    height: pixels,
    backgroundColor: '#000000',
    pixelArt: true,
    scale: { mode: Phaser.Scale.NONE, zoom: 1 },
    audio: { noAudio: true },
    banner: false,
  })
  const data: BattleSceneData = { session, labels, display }
  game.scene.add('battle', BattleScene, true, data)
  return game
}

/** Re-size the Board for its parent and the current devicePixelRatio, and refresh its input bounds. */
export function fitBattleGame(game: Phaser.Game, parent: HTMLElement): void {
  if (!game.isBooted || game.canvas === undefined) return
  fitBoard(game, parent, game.scale.gameSize.width, window.devicePixelRatio || 1)
}

/**
 * Keep the Board sized and its input aligned while mounted: on parent resize,
 * window resize (also browser zoom, which changes devicePixelRatio), once the
 * layout has settled (next frame, web fonts loaded), and before every press.
 * Returns the teardown, which also destroys the game.
 */
export function mountBattleGame(parent: HTMLElement, session: BattleSessionPort, labels: BoardLabels, display: BoardDisplayOptions = {}): (() => void) & { setDisplay(options: BoardDisplayOptions): void } {
  const currentDisplay = { ...display }
  const game = createBattleGame(parent, session, labels, currentDisplay)
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
  const teardown = () => {
    mounted = false
    cancelAnimationFrame(frame)
    observer.disconnect()
    window.removeEventListener('resize', fit)
    stopAligning()
    destroyBoard(game)
  }
  return Object.assign(teardown, {
    setDisplay(options: BoardDisplayOptions) {
      Object.assign(currentDisplay, options)
      if (mounted && game.scene.isActive('battle')) {
        (game.scene.getScene('battle') as BattleScene).setDisplay(currentDisplay)
      }
    },
  })
}
