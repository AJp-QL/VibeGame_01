/** Placeholder colours until real art exists (spec "UI และ rendering"). */
import type { Element, Side, Terrain } from '@mt/shared'

/** Board tiles: muted, so Units stand out on them. */
export const TERRAIN_COLOURS: Readonly<Record<Terrain, number>> = {
  normal: 0x8a8775,
  forest: 0x2f5e35,
  water: 0x264f7a,
  mountain: 0x5f4d3d,
  desert: 0xae8d4b,
  light: 0xcbc386,
  dark: 0x30253f,
}

/**
 * A small pixel mark in the top-left corner of each element tile, so tiles
 * of similar colour (desert and light, mountain and dark) stay apart and
 * colour is not the only cue. `#` = a pixel; normal tiles have none.
 */
export const TERRAIN_GLYPHS: Readonly<Record<Terrain, readonly string[]>> = {
  normal: [],
  forest: ['..#..', '.###.', '#####', '..#..'],
  water: ['.#..#.', '#.##.#', '......', '.#..#.', '#.##.#'],
  mountain: ['..#..', '.#.#.', '#...#'],
  desert: ['#...#', '..#..', '#...#'],
  light: ['..#..', '..#..', '#####', '..#..', '..#..'],
  dark: ['.###', '##..', '#...', '##..', '.###'],
}

const GLYPH_ON_BRIGHT = 0x000000
const GLYPH_ON_DARK = 0xffffff
export const GLYPH_ALPHA = 0.45

/** Glyph colour for a terrain: dark on bright tiles, light on dark ones. */
export function glyphColour(terrain: Terrain): number {
  const c = TERRAIN_COLOURS[terrain]
  const brightness = ((c >> 16) & 0xff) * 299 + ((c >> 8) & 0xff) * 587 + (c & 0xff) * 114
  return brightness > 128 * 1000 ? GLYPH_ON_BRIGHT : GLYPH_ON_DARK
}

/** Unit main colour by element: bright versions of the terrain colours. */
export const ELEMENT_COLOURS: Readonly<Record<Element, number>> = {
  forest: 0x5fd068,
  water: 0x4aa3ff,
  mountain: 0xc08a55,
  desert: 0xf2cf5b,
  light: 0xfff6b8,
  dark: 0xa36cf0,
}

/** Tamers have no element. */
export const TAMER_COLOUR = 0xe6e6e6

/** Team marker colours: base plate and pennant. */
export const SIDE_COLOURS: Readonly<Record<Side, number>> = {
  A: 0xe0453a,
  B: 0xf5f5f5,
}

export const OUTLINE = 0x141414
export const GRID_LINE = 0x1e1e1e
export const SELECTED = 0xffe14d
export const REACHABLE = 0xffffff
/** Enemies the selected Unit can attack, and the one picked for the preview. */
export const TARGET = 0xff4a3d
export const PENDING_TARGET = 0xffe14d
/** Enemies in range that line of sight blocks: crossed out, not selectable. */
export const BLOCKED_TARGET = 0xb0b0b0
/** Guarded shield icon on a Unit. */
export const GUARDED = 0x7fc8ff
export const GUARDED_SHIELD: readonly string[] = ['#####', '#####', '#####', '.###.', '..#..']
export const HP_BAR_BACK = 0x141414
export const HP_BAR_FILL = 0x58d26b
/** At a third of max HP or less. */
export const HP_BAR_LOW = 0xff6b5e
