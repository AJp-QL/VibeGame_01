/**
 * Replay in the web app (spec user stories 55–58): export the Replay of the
 * Battle being played, open a Replay file, and step through it read-only.
 * No rules here: recording, the compatibility check and replaying are the
 * engine's (`recordReplay`, `replayBattle`); the file format is @mt/shared's.
 */
import {
  BASIC_ATTACK,
  decidingSide,
  legalActions,
  recordReplay,
  replayBattle,
  unitsVisibleTo,
  type Action,
  type BattleEvent,
  type BattleReplay,
  type BattleState,
  type ReplayError,
  type ReplayMismatch,
  type ReplayStep,
  type UnitId,
  type UnitTemplate,
} from '@mt/engine'
import { parseReplayText, serializeReplay, tileName, type GameData, type Replay, type ReplayMeta, type Side } from '@mt/shared'
import type { BattleSessionPort, BattleSnapshot } from '@mt/battle'
import type { BattleChoice } from './battleChoice.ts'
import { th } from './strings.ts'

// ------------------------------------------------------------------ export

/**
 * The Replay of a Battle started from `choice` with `diceSeed`, after
 * `actions` (the session's accepted actions). `meta` carries what only the UI
 * knows: the build's version and the export time. Playtester stats (ticket
 * 17) go in `meta.stats`.
 */
export function battleReplay(
  data: GameData,
  choice: BattleChoice,
  diceSeed: string,
  actions: readonly Action[],
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

/** Save the Replay as a JSON file through the browser's download. */
export function downloadReplay(replay: Replay): void {
  const url = URL.createObjectURL(new Blob([serializeReplay(replay)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = replayFileName(replay)
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

// -------------------------------------------------------------------- open

export type OpenedReplay =
  /** Not a Replay file: not JSON, or fails the schema. */
  | { readonly kind: 'invalid'; readonly issues: readonly string[] }
  /** Recorded by another engine version or with other game data: not replayed, not converted. */
  | { readonly kind: 'incompatible'; readonly replay: Replay; readonly mismatches: readonly ReplayMismatch[] }
  /** Compatible, but the Battle cannot be rebuilt or an action is rejected. */
  | { readonly kind: 'broken'; readonly replay: Replay; readonly error: Exclude<ReplayError, { kind: 'incompatible' }> }
  | { readonly kind: 'ready'; readonly replay: Replay; readonly initial: BattleState; readonly steps: readonly ReplayStep[] }

/** Read a Replay file's text and replay it with this build's data. */
export function openReplay(text: string, data: GameData): OpenedReplay {
  const parsed = parseReplayText(text)
  if (!parsed.ok) return { kind: 'invalid', issues: parsed.issues }
  const { replay } = parsed
  const result = replayBattle(replay, data)
  if (result.ok) return { kind: 'ready', replay, initial: result.initial, steps: result.steps }
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
}

/** Read-only playback: the Board shows any step; taps do nothing; no new actions. */
export interface ReplayPlayer extends BattleSessionPort {
  getSnapshot(): PlaybackSnapshot
  first(): void
  back(): void
  forward(): void
  last(): void
}

export function createReplayPlayer(initial: BattleState, steps: readonly ReplayStep[]): ReplayPlayer {
  const listeners = new Set<() => void>()
  const stateAt = (step: number): BattleState => (step === 0 ? initial : steps[step - 1]!.state)

  function snapshotAt(step: number, animate: boolean, revision: number): PlaybackSnapshot {
    const state = stateAt(step)
    // The developer sees both sides' placements during deployment.
    const units =
      state.phase === 'deployment' ? [...unitsVisibleTo(state, 'A'), ...unitsVisibleTo(state, 'B')] : [...state.units]
    const canAct: UnitId[] = [
      ...new Set(legalActions(state).flatMap((action) => ('unit' in action ? [action.unit] : []))),
    ]
    const last = step === 0 ? null : steps[step - 1]!
    return {
      state,
      units,
      canAct,
      // Animate only a single step forward; jumps and steps back just redraw.
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
      step,
      total: steps.length,
      action: last?.action ?? null,
      actor: step === 0 ? null : decidingSide(stateAt(step - 1)),
      log: steps.slice(0, step).flatMap((s) => s.events),
    }
  }

  let snapshot = snapshotAt(0, false, 0)

  function go(step: number): void {
    const to = Math.max(0, Math.min(steps.length, step))
    if (to === snapshot.step) return
    snapshot = snapshotAt(to, to === snapshot.step + 1, snapshot.revision + 1)
    for (const listener of listeners) listener()
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
    first: () => go(0),
    back: () => go(snapshot.step - 1),
    forward: () => go(snapshot.step + 1),
    last: () => go(steps.length),
  }
}

// ------------------------------------------------------------- action text

/** "Fangrel (ทีม A)", from the Units on the Board, those that fell, or the deployment roster. */
function unitLabel(id: string, state: BattleState, data: GameData): string {
  const unit: UnitTemplate | undefined =
    state.units.find((u) => u.id === id) ??
    state.fallen.find((u) => u.id === id) ??
    state.deployment?.roster.find((u) => u.id === id)
  if (unit === undefined) return id
  const name = unit.kind === 'tamer' ? th.tamer : (data.species[unit.species]?.name ?? unit.species)
  return `${name} (${th.team(unit.side)})`
}

/** One line saying what a Replay action did, for the playback controls. */
export function describeAction(action: Action, actor: Side, state: BattleState, data: GameData): string {
  const label = (id: string) => unitLabel(id, state, data)
  switch (action.type) {
    case 'deploy':
      return th.replay.action.deploy(label(action.unit), tileName(action.to))
    case 'confirmDeployment':
      return th.replay.action.confirmDeployment(actor)
    case 'move':
      return th.replay.action.move(label(action.unit), tileName(action.to))
    case 'basicAttack':
      return th.replay.action.attack(label(action.unit), data.skills[BASIC_ATTACK]?.name ?? BASIC_ATTACK, label(action.target))
    case 'defend':
      return th.replay.action.defend(label(action.unit))
    case 'useSkill': {
      const skill = data.skills[action.skill]?.name ?? action.skill
      if (action.tile !== undefined && action.element !== undefined) {
        return th.replay.action.attune(label(action.unit), skill, tileName(action.tile), th.element[action.element])
      }
      if (action.tile !== undefined) {
        return action.targets === undefined
          ? th.replay.action.teleport(label(action.unit), skill, tileName(action.tile))
          : th.replay.action.area(label(action.unit), skill, tileName(action.tile), action.targets.map(label).join(', '))
      }
      if (action.target === undefined) return th.replay.action.skill(label(action.unit), skill)
      // Ids start with the side: an ally (Cover, First Aid) or the user itself, or an enemy.
      return action.target.charAt(0) === action.unit.charAt(0)
        ? th.replay.action.skillOn(label(action.unit), skill, label(action.target))
        : th.replay.action.attack(label(action.unit), skill, label(action.target))
    }
    case 'command':
      return th.replay.action.command(label(action.unit), label(action.target), th.commandOption[action.option] ?? action.option)
    case 'retreat':
      return action.to === null
        ? th.replay.action.stay(label(action.unit))
        : th.replay.action.retreat(label(action.unit), tileName(action.to))
    case 'endTurn':
      return th.replay.action.endTurn(actor)
    case 'useInspiration':
      return th.replay.action.useInspiration(action.side)
    case 'declineInspiration':
      return th.replay.action.declineInspiration(action.side)
    default:
      // Action types added by later tickets show their type until they get their own text.
      return th.replay.action.other((action as { type: string }).type)
  }
}
