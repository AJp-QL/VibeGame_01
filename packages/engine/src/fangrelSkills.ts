/**
 * Fangrel's loadout (rules §15.1): data says it all, so every handler is
 * GENERIC.
 * - Heavy Blow: Major, physical 2d8.
 * - Rend: Major, physical 1d6, Bleed on a hit (save VIT against the POW Save DC).
 * - Hit and Run: Minor, physical 1d8, then a free 1-tile step, hit or miss
 *   (`effects.retreat`, D-12), separate from Move.
 * - Pack Howl: Major, Rallied 2 on the user and every ally within 1, Tamer included (D-19).
 */
import { GENERIC, type SkillHandlers } from './skillHandler.ts'

export const FANGREL_SKILLS: SkillHandlers = {
  heavy_blow: GENERIC,
  rend: GENERIC,
  hit_and_run: GENERIC,
  pack_howl: GENERIC,
}
