import { useState, type ReactNode } from 'react'
import type { BattleSession, PlanChoice, SessionSnapshot } from '@mt/session'
import { tileName, type GameData } from '@mt/shared'
import { namer, skillName } from './battleText.ts'
import { ThreatCount } from './ThreatZone.tsx'
import { SkillButtons } from './SkillButtons.tsx'
import { th } from './strings.ts'

function AttackChoice({ choices, label, name, session }: { choices: readonly PlanChoice[]; label: string; name: (id: string) => string; session: BattleSession }) {
  const [key, setKey] = useState<string | null>(null)
  const choice = choices.find(choice => choice.key === key) ?? choices[0]
  if (choice === undefined) return null
  return (
    <div className="preview-choice move-targets">
      <button type="button" className="secondary" onClick={() => session.choosePlanAction(choice.key)}>{label}</button>
      <select aria-label={th.previewTarget(label)} value={choice.key} onChange={event => setKey(event.target.value)}>
        {choices.map(option => <option key={option.key} value={option.key}>{name(option.target!)}</option>)}
      </select>
    </div>
  )
}

export function MovePreviewPanel({ snapshot, session, data, tools }: { snapshot: SessionSnapshot; session: BattleSession; data: GameData; tools?: ReactNode }) {
  const preview = snapshot.movePreview
  if (preview === null) return null
  const name = namer(snapshot.state, data)
  const move = preview.skill === null ? th.confirmMove : skillName(data, preview.skill)
  const unplannedSkills = snapshot.skills.filter(button => !preview.options.some(choice => choice.skill === button.skill))
  return (
    <section className="move-preview" aria-labelledby="move-preview-title">
      <h2 id="move-preview-title">{th.movePreviewTitle(name(preview.unit), tileName(preview.tile))}</h2>
      <div className="sheet-choices">
        {preview.reach.map(option => <AttackChoice key={option.skill ?? 'basic'}
          choices={preview.options.filter(choice => choice.kind === 'attack' && choice.skill === option.skill)}
          label={option.skill === null ? th.attack : skillName(data, option.skill)} name={name} session={session} />)}
        <div className="buttons move-support">
          {preview.options.filter(choice => choice.kind === 'defend' || choice.kind === 'other').map(choice => (
            <button type="button" className="secondary" key={choice.key} onClick={() => session.choosePlanAction(choice.key)}>
              {choice.kind === 'defend' ? th.defend : skillName(data, choice.skill!)}
              {choice.target !== null ? ` · ${name(choice.target)}` : ''}
            </button>
          ))}
          {snapshot.canCommand && <button type="button" className="secondary" onClick={() => session.chooseCommand()}>{th.command}</button>}
        </div>
        <SkillButtons snapshot={snapshot} session={session} data={data} skills={unplannedSkills} />
      </div>
      <div className="sheet-details">
        <p className="muted">{th.movePreviewNote}</p>
        <p className="muted">{th.previewLegend}</p>
        <ThreatCount count={preview.threat} />
        <ul className="move-reach">
          {preview.reach.filter(option => option.targets.length === 0 || option.blocked.length > 0).map(option => (
            <li key={option.skill ?? 'basic'}>
              <strong>{option.skill === null ? th.attack : skillName(data, option.skill)}</strong>
              {option.targets.length === 0 && <span>{th.movePreviewNoTargets}</span>}
              {option.blocked.map(blocked => (
                <span className="blocked" key={blocked.unit}>
                  {blocked.reason === 'target-hidden' ? th.blockedHidden(name(blocked.unit)) : th.blockedBy(name(blocked.unit), blocked.blockedBy.map(name).join(', '), (blocked.blockedByTerrain?.length ?? 0) > 0)}
                </span>
              ))}
            </li>
          ))}
        </ul>
        {tools}
      </div>
      <div className="buttons sheet-footer">
        <button type="button" className="primary" onClick={() => session.confirmMove()}>{move}</button>
        <button type="button" className="secondary" onClick={() => session.cancel()}>{th.cancel}</button>
      </div>
    </section>
  )
}
