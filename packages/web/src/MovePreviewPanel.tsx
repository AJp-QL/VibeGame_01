import type { BattleSession, SessionSnapshot } from '@mt/session'
import { tileName, type GameData } from '@mt/shared'
import { namer, skillName } from './battleText.ts'
import { ThreatCount } from './ThreatZone.tsx'
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
      <ThreatCount count={preview.threat} />
      <ul className="move-reach">
        {preview.reach.map(option => (
          <li key={option.skill ?? 'basic'}>
            <strong>{option.skill === null ? th.attack : skillName(data, option.skill)}</strong>
            {option.targets.length === 0 ? <span>{th.movePreviewNoTargets}</span> : (
              <div className="buttons move-targets">
                {option.targets.map(target => {
                  const choice = preview.options.find(choice => choice.kind === 'attack' && choice.skill === option.skill && choice.target === target)
                  return choice === undefined ? null : <button type="button" className="secondary" key={target}
                    onClick={() => session.choosePlanAction(choice.key)}>{name(target)}</button>
                })}
              </div>
            )}
            {option.blocked.map(blocked => (
              <span className="blocked" key={blocked.unit}>
                {blocked.reason === 'target-hidden' ? th.blockedHidden(name(blocked.unit)) : th.blockedBy(name(blocked.unit), blocked.blockedBy.map(name).join(', '))}
              </span>
            ))}
          </li>
        ))}
      </ul>
      <div className="buttons move-support">
        {preview.options.filter(choice => choice.kind !== 'attack').map(choice => (
          <button type="button" className="secondary" key={choice.key} onClick={() => session.choosePlanAction(choice.key)}>
            {choice.kind === 'defend' ? th.defend : skillName(data, choice.skill!)}
          </button>
        ))}
      </div>
      <div className="buttons">
        <button type="button" className="primary" onClick={() => session.confirmMove()}>{move}</button>
        <button type="button" className="secondary" onClick={() => session.cancel()}>{th.cancel}</button>
      </div>
    </section>
  )
}
