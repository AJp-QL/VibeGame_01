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
 */
export {
  applyAction,
  createBattle,
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
export {
  BASIC_ATTACK,
  type AttackPreview,
  type Chance,
  type DamageRange,
  type RollMode,
} from './combat.ts'
export type { DerivedValues } from './derived.ts'
export { distance } from './movement.ts'
export type {
  BattleEndCause,
  BattleOutcome,
  BattleState,
  MonsterUnit,
  TamerUnit,
  UnitId,
  UnitState,
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
