import { useState } from 'react'
import { th } from './strings.ts'

/** The in-Battle menu: export the Replay so far, or leave the Battle (after a second tap to confirm). */
export function BattleMenu({ onExportReplay, onLeave }: { onExportReplay: () => void; onLeave: () => void }) {
  const [view, setView] = useState<'closed' | 'open' | 'leaving'>('closed')
  if (view === 'closed') {
    return (
      <div className="battle-menu-toggle">
        <button type="button" className="secondary" aria-expanded={false} onClick={() => setView('open')}>
          ☰ {th.battleMenu.open}
        </button>
      </div>
    )
  }
  return (
    <section className="panel battle-menu" aria-label={th.battleMenu.title}>
      {view === 'open' ? (
        <>
          <p className="muted">{th.replay.exportHint}</p>
          <div className="buttons">
            <button type="button" className="secondary" onClick={onExportReplay}>
              {th.replay.export}
            </button>
            <button type="button" className="secondary" onClick={() => setView('leaving')}>
              {th.battleMenu.leave}
            </button>
            <button type="button" className="secondary" aria-expanded={true} onClick={() => setView('closed')}>
              {th.battleMenu.close}
            </button>
          </div>
        </>
      ) : (
        <div className="warning" role="alertdialog" aria-labelledby="leave-warning">
          <p id="leave-warning">{th.battleMenu.leaveConfirm}</p>
          <div className="buttons">
            <button type="button" className="secondary" onClick={onExportReplay}>
              {th.replay.export}
            </button>
            <button type="button" className="primary" onClick={onLeave}>
              {th.battleMenu.leaveYes}
            </button>
            <button type="button" className="secondary" onClick={() => setView('closed')}>
              {th.battleMenu.leaveNo}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
