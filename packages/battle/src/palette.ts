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
