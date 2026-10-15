import * as Phaser from 'phaser'
import { BattleScene, BOARD_PIXELS, type BattleSceneData } from './BattleScene.ts'
import type { BattleSessionPort, BoardLabels } from './port.ts'

/**
 * Mount the Board in `parent`. The canvas is 224x224 (7 tiles of 32 px) and
 * is only ever scaled by a whole number (MAX_ZOOM) with nearest-neighbour
 * sampling (pixelArt). Call `fitBattleGame` when the parent changes size.
 * Destroy with `game.destroy(true)`.
 */
export function createBattleGame(parent: HTMLElement, session: BattleSessionPort, labels: BoardLabels): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: BOARD_PIXELS,
    height: BOARD_PIXELS,
    backgroundColor: '#000000',
    pixelArt: true,
    scale: { mode: Phaser.Scale.NONE, zoom: Phaser.Scale.Zoom.MAX_ZOOM },
    audio: { noAudio: true },
    banner: false,
  })
  const data: BattleSceneData = { session, labels }
  game.scene.add('battle', BattleScene, true, data)
  return game
}

/** Re-pick the largest whole-number zoom that fits the parent. */
export function fitBattleGame(game: Phaser.Game): void {
  // setMaxZoom reads the cached parent size, so refresh that first (Phaser 4.2.1).
  game.scale.getParentBounds()
  game.scale.setMaxZoom()
}
