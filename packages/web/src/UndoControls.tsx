import type { SessionSnapshot } from '@mt/session'
import { th } from './strings.ts'

export function UndoControls({ snapshot, onUndo }: { snapshot: SessionSnapshot; onUndo: () => void }) {
  const { state, undo } = snapshot
  if (state.phase !== 'play' || state.outcome !== null || snapshot.screen !== 'board' || state.sideToAct === snapshot.aiSide) return null
  return (
    <section className="panel undo-controls">
      <button type="button" className="secondary" disabled={undo === null} onClick={onUndo} aria-describedby="undo-point">
        {th.undo.button}
      </button>
      <p id="undo-point" className="muted">{undo === null ? th.undo.unavailable : th.undo.to[undo.to]}</p>
    </section>
  )
}
