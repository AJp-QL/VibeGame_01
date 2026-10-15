/**
 * Tidewall's loadout (rules §15.1): Taunt, Shield Bash, Counter, Pincer Guard.
 * - Taunt: Major, range 3, save SPI against the VIT Save DC, Taunted 1 with
 *   the user as taunter (`tracksSource`). GENERIC; what Taunted forces is in
 *   taunt.ts (rules §14.3, D-05).
 * - Shield Bash: Minor, physical 2d6 + POW mod, then the push (rules §6.4):
 *   damage → the target's counterattack, if Countering (inside attackOnce) →
 *   push, only on a hit and only if both are still up and the Battle goes on.
 * - Counter: Minor, Countering on the user. GENERIC; the counterattack itself
 *   is in combat.ts (`counterattackAfter`) so every attack triggers it.
 * - Pincer Guard: Passive (`effects.counterattackDamage`, 2d8), never used,
 *   no Action, no cooldown; read by `counteringOf` in combat.ts. Passive
 *   skills have no handler (skills.ts never offers them).
 */
import { attackOnce } from './combat.ts'
import { push } from './push.ts'
import { GENERIC, type SkillHandlers, type SkillResolution, type SkillUse } from './skillHandler.ts'
import { findUnit, type BattleState } from './state.ts'

function* resolveShieldBash(before: BattleState, use: SkillUse): SkillResolution {
  const target = use.targets[0]
  if (target === undefined) return before
  const attacked = yield* attackOnce(before, use.user.id, target.id, use.skill)
  const state = attacked.state
  // Rules §6.4, §10.5 step 7: push after the counterattack, on a hit, if both are still up.
  if (!attacked.hit || state.outcome !== null) return state
  if (findUnit(state, use.user.id) === undefined || findUnit(state, target.id) === undefined) return state
  return yield* push(state, use.user.id, target.id, use.skill.effects?.push ?? 1)
}

export const TIDEWALL_SKILLS: SkillHandlers = {
  taunt: GENERIC,
  shield_bash: { resolve: resolveShieldBash },
  counter: GENERIC,
}
