import type { BattleSession, SessionSnapshot } from '@mt/session'
import { tileName, type GameData } from '@mt/shared'
import { namer, skillName } from './battleText.ts'
import { th } from './strings.ts'

export function MovePreviewPanel({ snapshot, session, data }: { snapshot: SessionSnapshot; session: BattleSession; data: GameData }) {
  const preview = snapshot.movePreview
  if (preview === null) return null
  const name = namer(snapshot.state, data)
  const move = preview.skill === null ? th.confirmMove : skillName(data, preview.skill)
  return (
    <section className="move-preview" aria-labelledby="move-preview-title">
      <h2 id="move-preview-title">{th.movePreviewTitle(name(preview.unit), tileName(preview.tile))}</h2>
      <p className="muted">{th.movePreviewNote}</p>
      <ul className="move-reach">
        {preview.reach.map(option => (
          <li key={option.skill ?? 'basic'}>
            <strong>{option.skill === null ? th.attack : skillName(data, option.skill)}</strong>
            <span>{option.targets.length > 0 ? th.movePreviewTargets(option.targets.map(name).join(', ')) : th.movePreviewNoTargets}</span>
            {option.blocked.map(blocked => (
              <span className="blocked" key={blocked.unit}>
                {blocked.reason === 'target-hidden' ? th.blockedHidden(name(blocked.unit)) : th.blockedBy(name(blocked.unit), blocked.blockedBy.map(name).join(', '), (blocked.blockedByTerrain?.length ?? 0) > 0)}
              </span>
            ))}
          </li>
        ))}
      </ul>
      <div className="buttons">
        <button type="button" className="primary" onClick={() => session.confirmMove()}>{move}</button>
        <button type="button" className="secondary" onClick={() => session.cancel()}>{th.cancel}</button>
      </div>
    </section>
  )
}
