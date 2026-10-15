import * as Phaser from 'phaser';
import type { BattleSessionPort } from './port.ts';
/**
 * Mount the Board in `parent`. The canvas is 224x224 (7 tiles of 32 px) and
 * is only ever scaled by a whole number (MAX_ZOOM) with nearest-neighbour
 * sampling (pixelArt). Call `fitBattleGame` when the parent changes size.
 * Destroy with `game.destroy(true)`.
 */
export declare function createBattleGame(parent: HTMLElement, session: BattleSessionPort): Phaser.Game;
/** Re-pick the largest whole-number zoom that fits the parent. */
export declare function fitBattleGame(game: Phaser.Game): void;
