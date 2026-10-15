/**
 * Placeholder Unit art: one silhouette per species (plus the Tamer), filled
 * with the element colour, with a team marker (base plate + corner pennant).
 * Drawn with integer coordinates around (0, 0) = tile centre, inside 32x32.
 */
import type * as Phaser from 'phaser';
import type { UnitState } from '@mt/engine';
type Graphics = Phaser.GameObjects.Graphics;
export declare function drawUnit(g: Graphics, unit: UnitState): void;
export {};
