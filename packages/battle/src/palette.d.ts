/** Placeholder colours until real art exists (spec "UI และ rendering"). */
import type { Element, Side, Terrain } from '@mt/shared';
/** Board tiles: muted, so Units stand out on them. */
export declare const TERRAIN_COLOURS: Readonly<Record<Terrain, number>>;
/** Unit main colour by element: bright versions of the terrain colours. */
export declare const ELEMENT_COLOURS: Readonly<Record<Element, number>>;
/** Tamers have no element. */
export declare const TAMER_COLOUR = 15132390;
/** Team marker colours: base plate and pennant. */
export declare const SIDE_COLOURS: Readonly<Record<Side, number>>;
export declare const OUTLINE = 1315860;
export declare const GRID_LINE = 1973790;
export declare const SELECTED = 16769357;
export declare const REACHABLE = 16777215;
