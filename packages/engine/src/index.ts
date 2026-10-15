/**
 * @mt/engine: the rules of a Battle as pure functions (docs/rules/rules.md).
 * No UI, network or real time; integer arithmetic only (ADR 0002).
 *
 * Seam A — the interface every other package and every rules test goes through:
 *   createBattle(setup)           → BattleState
 *   legalActions(state)           → Action[] for the side that must act now ([] once the Battle is over)
 *   decidingSide(state)           → that side: a pending decision's side (Inspiration, Hit and Run's step), else the side to act
 *   previewAction(state, action)  → exact odds and damage ranges, without rolling or changing state
 *   applyAction(state, action)    → { ok, state, events } | { ok: false, state, rejection }
 *   derivedValues(state, unitId)  → values computed from the Unit's data
 *   unitSkills(state, unitId)     → the Unit's loadout: tier, cooldown, implemented yet
 *   unitsVisibleTo(state, side)   → the Units a side may see (deployment is hidden)
 *   lineOfSightTiles(from, to)    → the tiles a line of sight passes (rules §7.3), for tests, AI and UI
 *   areaTiles(skill, centre)      → the tiles an area skill (Burst) covers around a centre, for the UI and AI
 *   recordReplay / replayCompatibility / replayBattle → Replay of a Battle (ENGINE_VERSION is stamped in it)
 */
export {
  applyAction,
  createBattle,
  decidingSide,
  derivedValues,
  legalActions,
  previewAction,
  unitSkills,
  type Action,
  type ActionPreview,
  type ApplyResult,
  type BattleEvent,
  type BattleSetup,
  type PreviewResult,
  type Rejection,
  type RejectionCode,
} from './battle.ts'
export { BASIC_ATTACK, COUNTERATTACK, DEFEND, type AttackPreview, type Chance, type DamageRange } from './combat.ts'
export {
  MAJOR_COOLDOWN_TURNS,
  type AreaPreview,
  type EffectPreview,
  type RetreatAction,
  type SavePreview,
  type SkillAvailability,
  type UseSkillAction,
} from './skills.ts'
export type { SaveOdds, StatusBonus, StatusOdds } from './statuses.ts'
export { lineOfSightTiles } from './lineOfSight.ts'
export { areaTiles } from './wisplingSkills.ts'
export { elementBeats, type RollEffect, type RollMode, type RollModeSource } from './rollMode.ts'
export type { DerivedValues } from './derived.ts'
export { isInStartZone, START_ZONE_ROWS, unitsVisibleTo } from './deployment.ts'
export { distance } from './movement.ts'
export { ROUND_LIMIT } from './state.ts'
export type {
  Activations,
  BattleEndCause,
  BattleOutcome,
  BattlePhase,
  BattleState,
  Deployment,
  Initiative,
  InitiativeRoll,
  MonsterUnit,
  InspirationAnswer,
  InspirationDecision,
  PendingDecision,
  RerollableRoll,
  RetreatDecision,
  StatusEndCause,
  StatusId,
  TamerUnit,
  TauntDuty,
  UnitId,
  UnitState,
  UnitStatus,
  UnitTemplate,
} from './state.ts'

// Replay: record, check against this build, play again (spec Seam A "Replay").
export {
  recordReplay,
  replayBattle,
  replayCompatibility,
  type BattleReplay,
  type ReplayCompatibility,
  type ReplayError,
  type ReplayHeader,
  type ReplayMismatch,
  type ReplayResult,
  type ReplayStep,
} from './replay.ts'
export { ENGINE_VERSION } from './version.ts'

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
