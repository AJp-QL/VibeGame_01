/**
 * @mt/engine: the rules of a Battle as pure functions (docs/rules/rules.md).
 * No UI, network or real time; integer arithmetic only (ADR 0002).
 *
 * Seam A — the interface every other package and every rules test goes through:
 *   createBattle(setup)           → BattleState
 *   legalActions(state)           → Action[] for the side to act ([] once the Battle is over)
 *   previewAction(state, action)  → exact odds and damage ranges, without rolling or changing state
 *   applyAction(state, action)    → { ok, state, events } | { ok: false, state, rejection }
 *   derivedValues(state, unitId)  → values computed from the Unit's data
 *   unitsVisibleTo(state, side)   → the Units a side may see (deployment is hidden)
 *   lineOfSightTiles(from, to)    → the tiles a line of sight passes (rules §7.3), for tests, AI and UI
 */
export {
  applyAction,
  createBattle,
  DEFEND_GUARDED_BONUS,
  derivedValues,
  legalActions,
  previewAction,
  type Action,
  type ActionPreview,
  type ApplyResult,
  type BattleEvent,
  type BattleSetup,
  type PreviewResult,
  type Rejection,
  type RejectionCode,
} from './battle.ts'
export { BASIC_ATTACK, type AttackPreview, type Chance, type DamageRange } from './combat.ts'
export { lineOfSightTiles } from './lineOfSight.ts'
export { elementBeats, type RollEffect, type RollMode, type RollModeSource } from './rollMode.ts'
export type { DerivedValues } from './derived.ts'
export { isInStartZone, START_ZONE_ROWS, unitsVisibleTo } from './deployment.ts'
export { distance } from './movement.ts'
export type {
  Activations,
  BattleEndCause,
  BattleOutcome,
  BattlePhase,
  BattleState,
  Deployment,
  GuardedStatus,
  Initiative,
  InitiativeRoll,
  MonsterUnit,
  StatusId,
  TamerUnit,
  UnitId,
  UnitState,
  UnitStatus,
  UnitTemplate,
} from './state.ts'

// Dice stream (rules §21.5): exported for the AI's separate stream, tests and tools.
export {
  diceStream,
  isDiceSeed,
  nextUint32,
  rollDie,
  seedXoshiro128,
  type DiceSource,
  type DiceStream,
  type Xoshiro128State,
} from './dice.ts'
