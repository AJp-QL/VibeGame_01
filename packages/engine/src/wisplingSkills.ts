/**
 * Wispling's loadout (rules §15.1): Element Bolt, Burst, Hex, Blink.
 * Ticket 09 registers them here (see skillHandler.ts). Until then the engine
 * does not offer them. Burst is an `area` skill (needs `targets`/`uses`:
 * centre tile + up to 2 chosen enemies, in the chosen order); Blink is a
 * `tile` skill with `effects.replacesMove` (the generic path already books
 * the Move instead of the Action for it). Status: Weakened (`damageDealt`).
 */
import type { SkillHandlers } from './skillHandler.ts'

export const WISPLING_SKILLS: SkillHandlers = {}
