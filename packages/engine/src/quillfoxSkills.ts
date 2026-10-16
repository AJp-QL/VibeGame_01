/**
 * Quillfox's loadout (rules §15.1).
 *
 * - Long Shot: Minor, physical 1d8 at range 4 (GENERIC): damage + SEN mod
 *   from distance 2, POW mod at distance 1 (rules §10.1).
 * - Pin: Major, physical 1d6 at range 4, then Pin on a hit with a save VIT
 *   against the SEN Save DC (GENERIC). Pin (`immobile`): movement 0, Hit and
 *   Run's step included, the Action still usable, still pushed.
 * - Mark: Minor, physical attack roll at range 5 without damage (GENERIC,
 *   D-22): a full attack roll, so the attacker's side may reroll it with
 *   Inspiration, it ends the user's Hidden, a Countering target at distance
 *   1 counterattacks, and Tamer protection applies. On a hit the target is
 *   Marked 1 (no save): every attacker gets advantage against it
 *   (`attackersRollMode`, rollMode.ts). Duration as the rules table says
 *   (D-03): the rest of the Turn it was Marked in and the next Turn of its side.
 * - Camouflage: Minor, on the user, usable only while it stands on the
 *   terrain in `effects.requiresTerrain` (forest, D-18). Gives Hidden
 *   (`untargetableFrom` 2, rules §8.2) that lasts while the Unit stays on
 *   that terrain (`UnitStatus.whileOn`, checked after Move, Hit and Run's
 *   step, a skill, a push and at the end of every Turn) and until it makes
 *   an attack roll (statuses.ts). A free skill (`effects.free`, D-28,
 *   ticket 27): it uses neither the Move nor the Action, once per
 *   activation at any point of it (skills.ts), so "act, then hide" works.
 */
import type { Rejection } from './battle.ts'
import { GENERIC, type SkillHandler, type SkillHandlers } from './skillHandler.ts'
import { terrainAt } from './state.ts'

/** A skill usable only on a given terrain (`effects.requiresTerrain`): Camouflage on forest (D-18). */
const ON_REQUIRED_TERRAIN: SkillHandler = {
  check(state, use): Rejection | null {
    const required = use.skill.effects?.requiresTerrain
    if (required === undefined) return null
    const here = terrainAt(state, use.user.tile)
    if (here === required) return null
    return {
      code: 'wrong-terrain',
      message: `${use.skill.name} needs ${use.user.id} on ${required}; it stands on ${here ?? 'no terrain'}`,
    }
  },
}

export const QUILLFOX_SKILLS: SkillHandlers = {
  long_shot: GENERIC,
  pin: GENERIC,
  mark: GENERIC,
  camouflage: ON_REQUIRED_TERRAIN,
}
