/**
 * AI profiles. Each one is a port of prototype/simulation/sim.py's `AI`
 * (greedy one-activation lookahead on expected values) in one of its three
 * modes, optionally with the in-game heuristics of ticket 15.
 *
 * - `SIM_PROFILES` (sim-parity): the three modes exactly as sim.py scores
 *   them, no extra heuristics. Use these for the simulator (ticket 16).
 * - `GAME_PROFILES` (in-game): the same modes plus "protect our Tamer" and
 *   "focus fire" (spec user story 50). The web game uses these.
 */

/** sim.py's AI modes. */
export type AiMode = 'greedy' | 'tamer_rush' | 'neutral'

/** In-game heuristics on top of sim.py's scoring (ticket 15). All 0 = sim-parity. */
export interface AiHeuristics {
  /**
   * Protect our Tamer: the penalty a Monster's tile gets for the threat on our
   * Tamer is multiplied by (1 + this), and the Tamer values tiles next to an
   * allied Monster (Tamer protection, rules §9) by this × 1.0 more.
   */
  readonly protectTamer: number
  /**
   * Focus fire: an attack's value is multiplied by (1 + this × the share of
   * the target's maximum HP already lost), so the AI finishes what it started.
   */
  readonly focusFire: number
}

export interface AiProfile {
  /** Shown in tests and tools. */
  readonly name: string
  readonly mode: AiMode
  readonly heuristics: AiHeuristics
}

export const NO_HEURISTICS: AiHeuristics = { protectTamer: 0, focusFire: 0 }

/** The in-game heuristics' strength. */
export const GAME_HEURISTICS: AiHeuristics = { protectTamer: 1, focusFire: 0.75 }

export const AI_MODES: readonly AiMode[] = ['greedy', 'tamer_rush', 'neutral']

/** Sim-parity profiles: sim.py's AI as is (ticket 16 compares against sim v4 with these). */
export const SIM_PROFILES: Readonly<Record<AiMode, AiProfile>> = {
  greedy: { name: 'sim:greedy', mode: 'greedy', heuristics: NO_HEURISTICS },
  tamer_rush: { name: 'sim:tamer_rush', mode: 'tamer_rush', heuristics: NO_HEURISTICS },
  neutral: { name: 'sim:neutral', mode: 'neutral', heuristics: NO_HEURISTICS },
}

/** In-game profiles: sim.py's modes plus protecting the Tamer and focusing fire. */
export const GAME_PROFILES: Readonly<Record<AiMode, AiProfile>> = {
  greedy: { name: 'game:greedy', mode: 'greedy', heuristics: GAME_HEURISTICS },
  tamer_rush: { name: 'game:tamer_rush', mode: 'tamer_rush', heuristics: GAME_HEURISTICS },
  neutral: { name: 'game:neutral', mode: 'neutral', heuristics: GAME_HEURISTICS },
}

/** What the web game plays with. */
export const DEFAULT_GAME_PROFILE: AiProfile = GAME_PROFILES.greedy
