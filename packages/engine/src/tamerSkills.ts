/**
 * The Tamer's basic skills (rules §15.2, §15.4): Cover, Attune, First Aid,
 * Distract. Ticket 11 registers them here (see skillHandler.ts). Until then
 * the engine does not offer them. Command is not a skill (rules §15.3): it is
 * its own action. Status: Off-balance (`nextAttackRollMode`).
 */
import type { SkillHandlers } from './skillHandler.ts'

export const TAMER_SKILLS: SkillHandlers = {}
