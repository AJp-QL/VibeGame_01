/**
 * Replay (CONTEXT.md "Replay", spec Seam A "Replay"): the Dice Seed, what
 * the Battle was created from and every accepted action, fed back through
 * createBattle and applyAction in order, always gives the same Battle.
 *
 * The file format and its schema live in @mt/shared (`Replay`); this module
 * records one, checks it against the current engine version and data hash,
 * and replays it. A mismatch is reported, never converted (decision log
 * 2026-10-14).
 *
 * Format 2 (phase 1.x ticket 06) also holds the player's Undo: an `undo`
 * entry withdraws the last N standing actions, back to the safe point
 * (`undoPoint`, rules §17.5). Replaying applies it, so the final state is the
 * one the player had; the withdrawn steps stay in `steps`, marked `undone`.
 * `undo` is a file entry, not an Action: `applyAction` never sees it, so the
 * rules and ENGINE_VERSION are unchanged.
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
  type UndoRecord,
  UNDO_RECORD_TYPE,
} from '@mt/shared'
import { applyAction, createBattle, type Action, type BattleEvent, type BattleSetup, type Rejection } from './battle.ts'
import type { BattleState } from './state.ts'
import { undoPoint } from './undo.ts'
import { ENGINE_VERSION } from './version.ts'

/** One entry of a Replay's list: an engine action, or the player's Undo (format 2). */
export type BattleReplayEntry = Action | UndoRecord

/** A Replay whose entries are the engine's own actions and Undo records. */
export type BattleReplay = Replay<BattleReplayEntry>

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
 * (every action applyAction accepted, in order, with an `undo` entry where
 * the player went back; `undoRecord`). Stamps the current engine
 * version and data hash. `meta` (app version, export time, stats) comes from
 * the caller: the engine never reads the clock.
 */
export function recordReplay(
  header: ReplayHeader,
  data: GameData,
  actions: readonly BattleReplayEntry[],
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

/** The Undo entry for a player who withdrew the last `withdraw` standing actions. */
export function undoRecord(withdraw: number): UndoRecord {
  return { type: UNDO_RECORD_TYPE, withdraw }
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
  /** Position of the action in the Replay's list, from 0 (Undo entries take a place too). */
  readonly index: number
  readonly action: Action
  /** The state the action was applied to. */
  readonly before: BattleState
  /** Format 2: a later Undo withdrew this action (its `state` is not on the way to `final`). Always false in format 1. */
  readonly undone: boolean
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

/** An Undo entry as it was replayed. */
export interface ReplayUndo {
  /** Position of the entry in the Replay's list. */
  readonly index: number
  /** How many standing actions it withdrew. */
  readonly withdrawn: number
  /** How many of `steps` come before it. */
  readonly afterSteps: number
}

export type ReplayResult =
  | {
      readonly ok: true
      /** The Battle before the first action. */
      readonly initial: BattleState
      /** One step per action, in order, withdrawn ones included (`undone`): the state and events after it. */
      readonly steps: readonly ReplayStep[]
      /** Where the player went back (format 2), in order. */
      readonly undos: readonly ReplayUndo[]
      /** The state after the last standing action (`initial` when there is none). */
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
  const undos: ReplayUndo[] = []
  let state = initial
  // The actions still standing, and the state after each (stood[0] is the start): what Undo works on.
  const stood: Action[] = []
  const states: BattleState[] = [initial]
  const standing: number[] = []
  const undone = new Set<number>()
  for (const [index, recorded] of replay.actions.entries()) {
    if (recorded.type === UNDO_RECORD_TYPE) {
      const withdraw = (recorded as Partial<UndoRecord>).withdraw
      const point = undoPoint(states, stood)
      if (replay.formatVersion < 2 || point === null || withdraw !== stood.length - point.keep) {
        const message = replay.formatVersion < 2 ? 'Undo needs Replay format 2' : `Undo of ${String(withdraw)} action(s) does not go back to a safe point`
        return { ok: false, error: { kind: 'rejected', index, action: recorded, rejection: { code: 'unknown-action', message } } }
      }
      for (const step of standing.splice(point.keep)) undone.add(step)
      stood.length = point.keep
      states.length = point.keep + 1
      state = states[point.keep]!
      undos.push({ index, withdrawn: withdraw, afterSteps: steps.length })
      continue
    }
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
    const before = state
    state = result.state
    standing.push(steps.length)
    stood.push(action)
    states.push(state)
    steps.push({ index, action, before, undone: false, state, events: result.events })
  }
  return {
    ok: true,
    initial,
    steps: undone.size === 0 ? steps : steps.map((step, i) => (undone.has(i) ? { ...step, undone: true } : step)),
    undos,
    final: state,
  }
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
    statuses: data.statuses,
    elementWheel: data.elementWheel,
    dice: { seed: replay.diceSeed },
    ...(replay.preset !== undefined ? { preset: replay.preset } : {}),
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
