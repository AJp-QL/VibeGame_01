import { useMemo } from 'react'
import { withMovePreview } from './movePreviewSession.ts'
import { createActionConfirmation } from './actionConfirmation.ts'
import { StartUnitDialog } from './StartUnitDialog.tsx'
import { decidingSide, type BattleOutcome, type BattleSession } from '@mt/session'
import type { GameData } from '@mt/shared'
import { BattleView } from './BattleView.tsx'
import { UndoControls } from './UndoControls.tsx'
import { BattleMenu } from './BattleMenu.tsx'
import { StatusBar, ResultSummary } from './BattleStatus.tsx'
import { DeploymentPanel, InitiativeResult } from './DeploymentPanel.tsx'
import { InspirationPrompt } from './InspirationPrompt.tsx'
import { TurnPanel } from './TurnPanel.tsx'
import { HpList } from './UnitDetails.tsx'
import { EventLog } from './EventLog.tsx'
import { TerrainLegend } from './TerrainLegend.tsx'
import { FeedbackLink } from './Playtest.tsx'
import { otherSide } from './battleText.ts'
import { useBattleSession } from './useBattleSession.ts'
import { th } from './strings.ts'

interface BattleScreenProps {
  data: GameData
  session: BattleSession
  diceSeed: string
  /** A new Battle with the same menu choices (and a new Dice Seed). */
  onPlayAgain: () => void
  onStartOver: () => void
  onUndo: () => void
  onMenu: () => void
  /** Download the Replay of this Battle so far. */
  onExportReplay: () => void
  /** The Battle ended (may be called again for the same Battle; the stats count it once). */
  onFinished: (outcome: BattleOutcome, rounds: number) => void
  feedbackUrl: string | null
}

export function BattleScreen({ data, session: sourceSession, diceSeed, onPlayAgain, onStartOver, onUndo, onMenu, onExportReplay, onFinished, feedbackUrl }: BattleScreenProps) {
  const confirmation = useMemo(() => createActionConfirmation(sourceSession), [sourceSession])
  const session = useMemo(() => withMovePreview(confirmation.session), [confirmation])
  const snapshot = useBattleSession(session, onFinished)
  const { state } = snapshot
  const scenario = data.scenarios[state.scenarioId]
  const board = data.boards[state.boardId]

  return (
    <main className="battle">
      <StartUnitDialog confirmation={confirmation} data={data} />
      <StatusBar state={state} />
      {snapshot.aiSide !== null && <p className="muted vs-ai">{th.ai.sides(otherSide(snapshot.aiSide), snapshot.aiSide)}</p>}

      {state.outcome === null && <BattleMenu onExportReplay={onExportReplay} onLeave={onMenu} onStartOver={onStartOver} />}

      {state.outcome !== null && (
        <section className={`panel result side-${state.outcome.winner ?? 'draw'}`} role="status">
          <ResultSummary outcome={state.outcome} state={state} />
          <div className="buttons">
            <button type="button" className="primary" onClick={onPlayAgain}>
              {th.playAgain}
            </button>
            <button type="button" className="secondary" onClick={onExportReplay}>
              {th.replay.export}
            </button>
            <button type="button" className="secondary" onClick={onMenu}>
              {th.backToMenu}
            </button>
          </div>
          {/* The Replay file carries the local play stats too (meta.stats). */}
          <p className="muted">{th.replay.exportHint}</p>
          <FeedbackLink url={feedbackUrl} />
        </section>
      )}

      <UndoControls snapshot={snapshot} onUndo={onUndo} />
      <BattleView session={session} />
      <TerrainLegend />

      {state.phase === 'deployment' ? (
        <DeploymentPanel snapshot={snapshot} session={session} data={data} />
      ) : state.outcome === null ? (
        // Any accepted action closes an open End Turn warning.
        <TurnPanel key={snapshot.revision} snapshot={snapshot} session={session} data={data} />
      ) : null}

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

      <p className="meta">
        {scenario && board ? th.scenarioOnBoard(scenario.name, board.name) : null} · {th.diceSeed(diceSeed)}
      </p>

      {snapshot.screen === 'handoff' && (
        <div className="cover" role="dialog" aria-modal="true" aria-labelledby="handoff-title">
          <div className="panel dialog">
            <h2 id="handoff-title">{th.handoffTitle(otherSide(state.sideToAct))}</h2>
            <p>{th.handoffBody(otherSide(state.sideToAct), state.sideToAct)}</p>
            <button type="button" className="primary" onClick={() => session.continueHotseat()}>
              {th.handoffReady(state.sideToAct)}
            </button>
          </div>
        </div>
      )}

      {snapshot.screen === 'initiative' && (
        <div className="cover see-through" role="dialog" aria-modal="true" aria-labelledby="initiative-title">
          <div className="panel dialog">
            <h2 id="initiative-title">{th.revealTitle}</h2>
            <InitiativeResult log={snapshot.log} firstSide={state.initiative?.firstSide ?? null} />
            {state.pending?.kind === 'inspiration' ? (
              <InspirationPrompt snapshot={snapshot} session={session} data={data} />
            ) : (
              <button type="button" className="primary" onClick={() => session.continueHotseat()}>
                {th.startBattle}
              </button>
            )}
          </div>
        </div>
      )}

      {snapshot.screen === 'decisionHandoff' && state.outcome === null && (
        <div className="cover" role="dialog" aria-modal="true" aria-labelledby="decision-handoff-title">
          <div className="panel dialog">
            <h2 id="decision-handoff-title">{th.inspiration.handoffTitle(decidingSide(state))}</h2>
            <p>
              {state.pending?.kind === 'inspiration'
                ? th.inspiration.handoffDecide(state.pending.side, state.sideToAct)
                : th.inspiration.handoffBack(decidingSide(state))}
            </p>
            <button type="button" className="primary" onClick={() => session.continueHotseat()}>
              {th.inspiration.handoffReady(decidingSide(state))}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
