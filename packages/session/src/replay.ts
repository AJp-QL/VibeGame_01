/**
 * Replay (spec user stories 55–58): the Replay of the Battle being played,
 * opening a Replay file's text, and stepping through it read-only. No rules
 * here: recording, the compatibility check and replaying are the engine's
 * (`recordReplay`, `replayBattle`); the file format is @mt/shared's. Saving
 * the file (browser download) and the line that describes each action are
 * web's (ADR 0004: no player-facing text in session).
 */
import {
  decidingSide,
  legalActions,
  recordReplay,
  replayBattle,
  unitsVisibleTo,
  type Action,
  type BattleEvent,
  type BattleReplay,
  type BattleReplayEntry,
  type BattleState,
  type ReplayError,
  type ReplayMismatch,
  type ReplayStep,
  type UnitId,
} from '@mt/engine'
import { parseReplayText, type GameData, type Replay, type ReplayMeta, type Side } from '@mt/shared'
import type { BattleChoice } from './battleChoice.ts'
import type { BattleSessionPort, BattleSnapshot } from './port.ts'

// ------------------------------------------------------------------ export

/**
 * The Replay of a Battle started from `choice` with `diceSeed`, after
 * `actions` (the session's accepted actions; with Undo, `snapshot.recorded`,
 * which also holds the withdrawn ones and the Undo entries). `meta` carries what only the UI
 * knows: the build's version and the export time. Playtester stats (ticket
 * 17) go in `meta.stats`.
 */
export function battleReplay(
  data: GameData,
  choice: BattleChoice,
  diceSeed: string,
  actions: readonly BattleReplayEntry[],
  meta: ReplayMeta,
): BattleReplay {
  return recordReplay(
    {
      scenarioId: choice.scenarioId,
      boardId: choice.boardId,
      mode: choice.mode,
      ...(choice.mode === 'ai' ? { humanSide: choice.humanSide } : {}),
      diceSeed,
    },
    data,
    actions,
    meta,
  )
}

/** "replay_scenario_1_crossroads_0123456789abcdef_20261015-093000.json" */
export function replayFileName(replay: Replay): string {
  const time = replay.meta?.createdAt?.replace(/[-:]/g, '').replace('T', '-').slice(0, 15)
  return `replay_${replay.scenarioId}_${replay.boardId}_${replay.diceSeed}${time ? `_${time}` : ''}.json`
}

// -------------------------------------------------------------------- open

export type OpenedReplay =
  /** Not a Replay file: not JSON, or fails the schema. */
  | { readonly kind: 'invalid'; readonly issues: readonly string[] }
  /** Recorded by another engine version or with other game data: not replayed, not converted. */
  | { readonly kind: 'incompatible'; readonly replay: Replay; readonly mismatches: readonly ReplayMismatch[] }
  /** Compatible, but the Battle cannot be rebuilt or an action is rejected. */
  | { readonly kind: 'broken'; readonly replay: Replay; readonly error: Exclude<ReplayError, { kind: 'incompatible' }> }
  | { readonly kind: 'ready'; readonly replay: Replay; readonly initial: BattleState; readonly steps: readonly ReplayStep[]; readonly final: BattleState }

/** Read a Replay file's text and replay it with this build's data. */
export function openReplay(text: string, data: GameData): OpenedReplay {
  const parsed = parseReplayText(text)
  if (!parsed.ok) return { kind: 'invalid', issues: parsed.issues }
  const { replay } = parsed
  const result = replayBattle(replay, data)
  if (result.ok) return { kind: 'ready', replay, initial: result.initial, steps: result.steps, final: result.final }
  if (result.error.kind === 'incompatible') return { kind: 'incompatible', replay, mismatches: result.error.mismatches }
  return { kind: 'broken', replay, error: result.error }
}

// ---------------------------------------------------------------- playback

export interface PlaybackSnapshot extends BattleSnapshot {
  /** Actions applied so far: 0 = the Battle as created, `total` = the end of the Replay. */
  readonly step: number
  readonly total: number
  /** The action that led to this step, and the side that took it (null at step 0): the deciding side for an answer to a decision. */
  readonly action: Action | null
  readonly actor: Side | null
  /** Every event up to this step, oldest first. */
  readonly log: readonly BattleEvent[]
  /** Only while undone actions are shown: a later Undo withdrew this step's action. */
  readonly undone: boolean
  /** The Replay holds actions the player withdrew with Undo (format 2): there is something to show. */
  readonly hasUndone: boolean
  /** Whether the withdrawn actions are part of the steps now (off by default). */
  readonly showUndone: boolean
}

/** Read-only playback: the Board shows any step; taps do nothing; no new actions. */
export interface ReplayPlayer extends BattleSessionPort {
  getSnapshot(): PlaybackSnapshot
  /**
   * Show the actions the player withdrew with Undo too, or skip them (the
   * default). The position stays on the same action, or the last one shown
   * before it.
   */
  setShowUndone(show: boolean): void
  first(): void
  back(): void
  forward(): void
  last(): void
}

export function createReplayPlayer(initial: BattleState, steps: readonly ReplayStep[], options: { readonly showUndone?: boolean } = {}): ReplayPlayer {
  const listeners = new Set<() => void>()
  const hasUndone = steps.some((s) => s.undone)
  let showUndone = options.showUndone === true && hasUndone
  /** The steps being played: all of them, or only those on the way to the end. */
  let shown: readonly ReplayStep[] = showUndone ? steps : steps.filter((s) => !s.undone)
  const stateAt = (step: number): BattleState => (step === 0 ? initial : shown[step - 1]!.state)

  function snapshotAt(step: number, animate: boolean, revision: number): PlaybackSnapshot {
    const state = stateAt(step)
    // The developer sees both sides' placements during deployment.
    const units =
      state.phase === 'deployment' ? [...unitsVisibleTo(state, 'A'), ...unitsVisibleTo(state, 'B')] : [...state.units]
    const canAct: UnitId[] = [
      ...new Set(legalActions(state).flatMap((action) => ('unit' in action ? [action.unit] : []))),
    ]
    const last = step === 0 ? null : shown[step - 1]!
    return {
      state,
      units,
      canAct,
      // Animate only a single step forward from the position it was applied to; jumps and steps back just redraw.
      events: animate && last !== null ? last.events : [],
      revision,
      selectedUnit: null,
      reachable: [],
      targets: [],
      blockedTargets: [],
      pendingTarget: null,
      tileChoices: [],
      pendingTile: null,
      area: [],
      chosenTargets: [],
      movePreview: null,
      step,
      total: shown.length,
      action: last?.action ?? null,
      actor: last === null ? null : decidingSide(last.before),
      log: shown.slice(0, step).flatMap((s) => s.events),
      undone: last?.undone ?? false,
      hasUndone,
      showUndone,
    }
  }

  let snapshot = snapshotAt(0, false, 0)

  function notify(next: PlaybackSnapshot): void {
    snapshot = next
    for (const listener of listeners) listener()
  }

  function go(step: number): void {
    const to = Math.max(0, Math.min(shown.length, step))
    if (to === snapshot.step) return
    const previous = to === 0 ? null : shown[to - 1]!
    const fromHere = to === snapshot.step + 1 && previous !== null && previous.before === snapshot.state
    notify(snapshotAt(to, fromHere, snapshot.revision + 1))
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    input() {
      // Read-only: playback takes no actions.
    },
    setShowUndone(show) {
      if (show === showUndone || !hasUndone) return
      // Stay on the action being shown, or the last standing one before it.
      const current = snapshot.step === 0 ? null : shown[snapshot.step - 1]!
      showUndone = show
      shown = show ? steps : steps.filter((s) => !s.undone)
      let step = 0
      if (current !== null) {
        const at = shown.indexOf(current)
        step = at >= 0 ? at + 1 : shown.filter((s) => s.index < current.index).length
      }
      notify(snapshotAt(step, false, snapshot.revision + 1))
    },
    first: () => go(0),
    back: () => go(snapshot.step - 1),
    forward: () => go(snapshot.step + 1),
    last: () => go(shown.length),
  }
}
