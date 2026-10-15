import { useMemo, useSyncExternalStore } from 'react'
import { BASIC_ATTACK, type Action, type BattleState, type UnitTemplate } from '@mt/engine'
import { tileName, type GameData, type Replay, type Side } from '@mt/shared'
import { EventLog, HpList, StatusBar } from './App.tsx'
import { BattleView } from './BattleView.tsx'
import { createReplayPlayer, type OpenedReplay } from './replay.ts'
import { th } from './strings.ts'

interface ReplayScreenProps {
  data: GameData
  opened: Extract<OpenedReplay, { kind: 'ready' }>
  onMenu: () => void
}

/** Read-only playback of a Replay: step forward or back one action, or jump to either end. */
export function ReplayScreen({ data, opened, onMenu }: ReplayScreenProps) {
  const player = useMemo(() => createReplayPlayer(opened.initial, opened.steps), [opened])
  const snapshot = useSyncExternalStore(player.subscribe, player.getSnapshot)
  const { state, step, total } = snapshot
  const { replay } = opened
  const atStart = step === 0
  const atEnd = step === total

  return (
    <main className="battle replay">
      <section className="panel replay-header">
        <h2>{th.replay.title}</h2>
        <ReplayDetails replay={replay} data={data} />
        <p className="muted">{th.replay.readOnly}</p>
      </section>

      <StatusBar state={state} />

      <section className="panel controls replay-controls" aria-live="polite">
        <p className="replay-step">
          <strong>{th.replay.step(step, total)}</strong>{' '}
          <span>
            {snapshot.action === null || snapshot.actor === null
              ? th.replay.atStart
              : describeAction(snapshot.action, snapshot.actor, state, data)}
          </span>
        </p>
        <div className="buttons step-buttons">
          <button type="button" className="secondary" disabled={atStart} onClick={() => player.first()}>
            ⏮ {th.replay.first}
          </button>
          <button type="button" className="secondary" disabled={atStart} onClick={() => player.back()}>
            ◀ {th.replay.back}
          </button>
          <button type="button" className="primary" disabled={atEnd} onClick={() => player.forward()}>
            {th.replay.forward} ▶
          </button>
          <button type="button" className="secondary" disabled={atEnd} onClick={() => player.last()}>
            {th.replay.last} ⏭
          </button>
        </div>
      </section>

      {state.outcome !== null && (
        <section className={`panel result side-${state.outcome.winner}`} role="status">
          <h2>{th.resultTitle(state.outcome.winner)}</h2>
          <p>{th.cause[state.outcome.cause](state.outcome.winner === 'A' ? 'B' : 'A')}</p>
          <p>{th.resultRounds(state.round)}</p>
        </section>
      )}

      <BattleView session={player} />

      {state.phase === 'play' && (
        <section className="panel hp-panel">
          <h2>{th.hpTitle}</h2>
          <HpList state={state} data={data} />
        </section>
      )}

      <section className="panel log">
        <h2>{th.logTitle}</h2>
        <EventLog events={snapshot.log} state={state} data={data} />
      </section>

      <div className="buttons">
        <button type="button" className="secondary" onClick={onMenu}>
          {th.backToMenu}
        </button>
      </div>
    </main>
  )
}

/** Scenario, Board, mode, Dice Seed and where the Replay came from. */
export function ReplayDetails({ replay, data }: { replay: Replay; data: GameData }) {
  const scenario = data.scenarios[replay.scenarioId]?.name ?? replay.scenarioId
  const board = data.boards[replay.boardId]?.name ?? replay.boardId
  return (
    <>
      <p>{th.replay.details(scenario, board, th.menu.mode[replay.mode])}</p>
      <p className="muted">
        {th.diceSeed(replay.diceSeed)} · {th.replay.recorded(replay.engineVersion, replay.meta?.appVersion, replay.meta?.createdAt)}
      </p>
    </>
  )
}

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

function describeAction(action: Action, actor: Side, state: BattleState, data: GameData): string {
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
    case 'endTurn':
      return th.replay.action.endTurn(actor)
    default:
      // Action types added by later tickets show their type until they get their own text.
      return th.replay.action.other((action as { type: string }).type)
  }
}
