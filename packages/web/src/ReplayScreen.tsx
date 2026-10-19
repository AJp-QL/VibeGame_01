import { useMemo, useSyncExternalStore } from 'react'
import type { GameData, Replay } from '@mt/shared'
import { EventLog } from './EventLog.tsx'
import { HpList } from './UnitDetails.tsx'
import { ResultSummary, StatusBar } from './BattleStatus.tsx'
import { BattleView } from './BattleView.tsx'
import { createReplayPlayer, type OpenedReplay } from '@mt/session'
import { describeAction } from './replay.ts'
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

      <label className="panel replay-undone">
        <input type="checkbox" checked={snapshot.showUndone} disabled={!snapshot.hasUndone}
          onChange={event => player.setShowUndone(event.target.checked)} />
        {th.replay.showUndone}
      </label>
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
        {snapshot.undone && <p className="warning">{th.replay.undone}</p>}
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
        <section className={`panel result side-${state.outcome.winner ?? 'draw'}`} role="status">
          <ResultSummary outcome={state.outcome} state={state} />
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
