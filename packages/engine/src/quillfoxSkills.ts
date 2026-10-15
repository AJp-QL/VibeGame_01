/**
 * Quillfox's loadout (rules §15.1): Long Shot, Pin, Mark, Camouflage.
 * Ticket 10 registers them here (see skillHandler.ts). Until then the engine
 * does not offer them. Statuses: Pin (`immobile`, already in effect),
 * Marked (`attackersRollMode`), Hidden (`untargetableFrom`); Camouflage needs
 * `effects.requiresTerrain` checked in a `check` hook.
 */
import type { SkillHandlers } from './skillHandler.ts'

export const QUILLFOX_SKILLS: SkillHandlers = {}
