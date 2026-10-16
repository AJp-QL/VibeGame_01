import type { BattleSession, SessionSnapshot } from '@mt/session'
import type { GameData } from '@mt/shared'
import { logLines } from './EventLog.tsx'
import { namer } from './battleText.ts'
import { th } from './strings.ts'

/**
 * A pending Inspiration decision (rules §18): the roll just made and the two
 * answers. Shown to the side that decides (Hotseat hands the device over first).
 */
export function InspirationPrompt({ snapshot, session, data }: { snapshot: SessionSnapshot; session: BattleSession; data: GameData }) {
  const { state } = snapshot
  const pending = state.pending
  if (pending?.kind !== 'inspiration') return null
  const roll = logLines(pending.roll, namer(state, data), state, data)
  if (snapshot.aiSide === pending.side) {
    // The AI answers on its own; the human only sees the roll it is deciding about.
    return (
      <div className={`inspiration-prompt side-${pending.side}`} role="status">
        <strong>{th.inspiration.aiDeciding(pending.side)}</strong>
        {roll.map((line) => (
          <p key={line} className="roll">
            {line}
          </p>
        ))}
      </div>
    )
  }
  return (
    <div className={`inspiration-prompt side-${pending.side}`} role="group" aria-labelledby="inspiration-title">
      <strong id="inspiration-title">{th.inspiration.title(pending.side)}</strong>
      {roll.map((line) => (
        <p key={line} className="roll">
          {line}
        </p>
      ))}
      <p className="muted">{th.inspiration.body}</p>
      <div className="buttons">
        <button type="button" className="primary" onClick={() => session.useInspiration()}>
          {th.inspiration.use}
        </button>
        <button type="button" className="secondary" onClick={() => session.declineInspiration()}>
          {th.inspiration.decline}
        </button>
      </div>
    </div>
  )
}
