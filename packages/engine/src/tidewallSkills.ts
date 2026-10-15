/**
 * Tidewall's loadout (rules §15.1): Taunt, Shield Bash, Counter, Pincer Guard.
 * Ticket 08 registers them here (see skillHandler.ts). Until then the engine
 * does not offer them. Statuses: Taunted (`forcedToAttackSource`), Countering
 * (`counterattack`); Pincer Guard is Passive (`effects.counterattackDamage`).
 */
import type { SkillHandlers } from './skillHandler.ts'

export const TIDEWALL_SKILLS: SkillHandlers = {}
