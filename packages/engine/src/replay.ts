/**
 * Replay (CONTEXT.md "Replay", spec Seam A "Replay"): the Dice Seed, what
 * the Battle was created from and every accepted action, fed back through
 * createBattle and applyAction in order, always gives the same Battle.
 *
 * The file format and its schema live in @mt/shared (`Replay`); this module
 * records one, checks it against the current engine version and data hash,
 * and replays it. A mismatch is reported, never converted (decision log
 * 2026-10-14).
 */
import {
  dataHash,
  REPLAY_FORMAT,
  REPLAY_FORMAT_VERSION,
  type BattleMode,
  type GameData,
  type Replay,
  type ReplayAction,
  type ReplayMeta,
  type Side,
  type Tile,
} from '@mt/shared'
import { applyAction, createBattle, type Action, type BattleEvent, type BattleSetup, type Rejection } from './battle.ts'
import type { BattleState } from './state.ts'
import { ENGINE_VERSION } from './version.ts'

/** A Replay whose actions are the engine's own. */
export type BattleReplay = Replay<Action>

/** How the Battle was created: everything in a Replay but the versions, metadata and actions. */
export interface ReplayHeader {
  readonly scenarioId: string
  readonly boardId: string
  readonly mode: BattleMode
  readonly humanSide?: Side
  readonly diceSeed: string
  readonly preset?: {
    readonly tiles: Readonly<Record<Side, readonly [Tile, Tile, Tile]>>
    readonly firstSide: Side
  }
}

/**
 * The Replay of a Battle created from `header` with `data`, after `actions`
 * (every action applyAction accepted, in order). Stamps the current engine
 * version and data hash. `meta` (app version, export time, stats) comes from
 * the caller: the engine never reads the clock.
 */
export function recordReplay(
  header: ReplayHeader,
  data: GameData,
  actions: readonly Action[],
  meta?: ReplayMeta,
): BattleReplay {
  return {
    format: REPLAY_FORMAT,
    formatVersion: REPLAY_FORMAT_VERSION,
    engineVersion: ENGINE_VERSION,
    dataHash: dataHash(data),
    scenarioId: header.scenarioId,
    boardId: header.boardId,
    mode: header.mode,
    ...(header.humanSide !== undefined ? { humanSide: header.humanSide } : {}),
    diceSeed: header.diceSeed,
    ...(header.preset !== undefined ? { preset: header.preset } : {}),
    ...(meta !== undefined ? { meta } : {}),
    actions: [...actions],
  }
}

/** One field of a Replay that does not match this build. */
export interface ReplayMismatch {
  readonly field: 'engineVersion' | 'dataHash'
  /** The value stored in the Replay. */
  readonly replay: string
  /** The value of this build. */
  readonly current: string
}

export type ReplayCompatibility =
  | { readonly compatible: true }
  | { readonly compatible: false; readonly mismatches: readonly ReplayMismatch[] }

/**
 * Whether this build can replay `replay` with `data`: the engine version and
 * the data hash must both match exactly. Nothing is converted.
 */
export function replayCompatibility(replay: Replay, data: GameData): ReplayCompatibility {
  const mismatches: ReplayMismatch[] = []
  if (replay.engineVersion !== ENGINE_VERSION) {
    mismatches.push({ field: 'engineVersion', replay: replay.engineVersion, current: ENGINE_VERSION })
  }
  const current = dataHash(data)
  if (replay.dataHash !== current) mismatches.push({ field: 'dataHash', replay: replay.dataHash, current })
  return mismatches.length === 0 ? { compatible: true } : { compatible: false, mismatches }
}

/** The Battle right after one replayed action. */
export interface ReplayStep {
  /** Position of the action in the Replay, from 0. */
  readonly index: number
  readonly action: Action
  /** The state after the action. */
  readonly state: BattleState
  /** The events the action produced, in order. */
  readonly events: readonly BattleEvent[]
}

export type ReplayError =
  /** Recorded by another engine version or with other data: not replayed. */
  | { readonly kind: 'incompatible'; readonly mismatches: readonly ReplayMismatch[] }
  /** The Battle cannot be created (unknown Scenario or Board, bad preset). */
  | { readonly kind: 'setup'; readonly message: string }
  /** The action at `index` was rejected (or is not an action at all): the Replay was changed or is broken. */
  | { readonly kind: 'rejected'; readonly index: number; readonly action: ReplayAction; readonly rejection: Rejection }

export type ReplayResult =
  | {
      readonly ok: true
      /** The Battle before the first action. */
      readonly initial: BattleState
      /** One step per action, in order: the state and events after it. */
      readonly steps: readonly ReplayStep[]
      /** The state after the last action (`initial` when there is none). */
      readonly final: BattleState
    }
  | { readonly ok: false; readonly error: ReplayError }

/**
 * Play a Replay again: check compatibility, create the Battle from its header
 * and apply every action in order. Gives the same states and events as the
 * Battle that was recorded, every time. Stops at the first action the engine
 * rejects and reports its index.
 */
export function replayBattle(replay: Replay, data: GameData): ReplayResult {
  const compatibility = replayCompatibility(replay, data)
  if (!compatibility.compatible) return { ok: false, error: { kind: 'incompatible', mismatches: compatibility.mismatches } }

  let initial: BattleState
  try {
    initial = createBattle(replaySetup(replay, data))
  } catch (error) {
    return { ok: false, error: { kind: 'setup', message: messageOf(error) } }
  }

  const steps: ReplayStep[] = []
  let state = initial
  for (const [index, recorded] of replay.actions.entries()) {
    // The schema only checks that an action is an object with a type; applyAction decides the rest.
    const action = recorded as unknown as Action
    let result: ReturnType<typeof applyAction>
    try {
      result = applyAction(state, action)
    } catch (error) {
      const rejection: Rejection = { code: 'unknown-action', message: `Malformed action: ${messageOf(error)}` }
      return { ok: false, error: { kind: 'rejected', index, action: recorded, rejection } }
    }
    if (!result.ok) return { ok: false, error: { kind: 'rejected', index, action: recorded, rejection: result.rejection } }
    state = result.state
    steps.push({ index, action, state, events: result.events })
  }
  return { ok: true, initial, steps, final: state }
}

function replaySetup(replay: Replay, data: GameData): BattleSetup {
  const scenario = data.scenarios[replay.scenarioId]
  const board = data.boards[replay.boardId]
  if (scenario === undefined) throw new Error(`Unknown Scenario "${replay.scenarioId}"`)
  if (board === undefined) throw new Error(`Unknown Board "${replay.boardId}"`)
  return {
    scenario,
    board,
    species: data.species,
    skills: data.skills,
    dice: { seed: replay.diceSeed },
    ...(replay.preset !== undefined ? { preset: replay.preset } : {}),
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
