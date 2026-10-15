/**
 * @mt/ai: the enemy AI (ticket 15), a port of prototype/simulation/sim.py's
 * greedy one-activation lookahead. It decides through the engine only
 * (legal actions, previews, the AI's own dice stream) and never draws the
 * Battle's dice.
 *
 *   createAi(battle, side, profile)  → AiState (memory, incl. the AI's dice stream)
 *   chooseAction(state, ai)          → { action, ai }: the next legal action when `decidingSide(state)` is the AI's
 *   planDeployment(state, ai)        → the AI's deploy actions + Confirm, before the other side places
 *   SIM_PROFILES / GAME_PROFILES     → sim-parity (ticket 16) / in-game profiles
 */
export { chooseAction, createAi, planDeployment, type AiChoice, type AiState } from './controller.ts'
export {
  AI_MODES,
  DEFAULT_GAME_PROFILE,
  GAME_HEURISTICS,
  GAME_PROFILES,
  NO_HEURISTICS,
  SIM_PROFILES,
  type AiHeuristics,
  type AiMode,
  type AiProfile,
} from './profiles.ts'
