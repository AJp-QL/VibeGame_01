// @mt/session: the Battle's interaction model without a UI (ADR 0004).
// battle and web use this package and @mt/shared only; what they need of the
// engine and the AI is re-exported at the bottom, so the UI never imports
// @mt/engine or @mt/ai itself. No player-facing text lives here.

export type { BattleSessionPort, BattleSnapshot, BoardInput } from './port.ts'
export {
  actionAtStake,
  createBattleSession,
  idleUnits,
  movedWithoutAction,
  type AiOpponent,
  type BattleSession,
  type BlockedTarget,
  type HotseatScreen,
  type MovePreview,
  type UndoOffer,
  type MoveReach,
  type SelectionMode,
  type SessionOptions,
  type SessionSnapshot,
  type SkillButton,
} from './session.ts'
export {
  aiOpponent,
  battleSetup,
  canStart,
  defaultChoice,
  isModeAvailable,
  menuBoards,
  menuScenarios,
  MODES,
  type BattleChoice,
  type Mode,
} from './battleChoice.ts'
export {
  createPlayStats,
  emptyStats,
  localDay,
  MAX_BATTLES,
  STATS_KEY,
  statsFileName,
  type BattleRecord,
  type PlayStats,
  type PlayStatsStore,
  type StatsStorage,
} from './playStats.ts'
export {
  battleReplay,
  createReplayPlayer,
  openReplay,
  replayFileName,
  type OpenedReplay,
  type PlaybackSnapshot,
  type ReplayPlayer,
} from './replay.ts'

// ------------------------------------------- engine and AI, for battle / web
// Additive only: add a name here when the UI needs it (ADR 0004 contract).

export {
  BASIC_ATTACK,
  COMMAND_OPTIONS,
  COUNTERATTACK,
  createBattle,
  decidingSide,
  derivedValues,
  ENGINE_VERSION,
  legalActions,
  ROUND_LIMIT,
  type Action,
  type ActionPreview,
  type AttackPreview,
  type BattleEndCause,
  type BattleEvent,
  type BattleOutcome,
  type BattleSetup,
  type BattleState,
  type Chance,
  type CommandOption,
  type DiceSource,
  type RejectionCode,
  type RollModeSource,
  type StatusOdds,
  type UnitId,
  type UnitState,
  type UnitStatus,
  type UnitTemplate,
} from '@mt/engine'
export type { AiProfile } from '@mt/ai'
