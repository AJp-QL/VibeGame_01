import type { SessionSnapshot } from '@mt/session'
import { th } from './strings.ts'

export function UndoControls({ snapshot, onUndo }: { snapshot: SessionSnapshot; onUndo: () => void }) {
  const { undoState } = snapshot
  if (undoState.kind === 'hidden') return null
  return (
    <section className="panel undo-controls">
      <button type="button" className="secondary" disabled={undoState.kind === 'disabled'} onClick={onUndo} aria-describedby="undo-point">
        {th.undo.button}
      </button>
      <p id="undo-point" className="muted">{undoState.kind === 'disabled' ? th.undo.disabled[undoState.reason] : th.undo.to[undoState.offer.to]}</p>
    </section>
  )
}
