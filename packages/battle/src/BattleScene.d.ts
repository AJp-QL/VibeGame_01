/**
 * The Phaser scene that draws the Board and its Units from the session's
 * snapshot, animates Moves from the engine's events and turns taps into
 * BoardInput. It keeps view objects only, never game state.
 */
import * as Phaser from 'phaser';
import type { BattleSessionPort } from './port.ts';
export declare const TILE_SIZE = 32;
export declare const BOARD_PIXELS: number;
export interface BattleSceneData {
    readonly session: BattleSessionPort;
}
export declare class BattleScene extends Phaser.Scene {
    private session;
    private highlights;
    private readonly unitViews;
    private readonly walking;
    private shownRevision;
    constructor();
    init(data: BattleSceneData): void;
    create(): void;
    private drawBoard;
    private render;
    private drawHighlights;
    /** Walk each moved Unit along the path the engine reported. */
    private animateEvents;
    private onTap;
}
