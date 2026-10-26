import type { ReactNode } from 'react'
import type { BattleSession, SessionSnapshot } from '@mt/session'
import { tileName, type GameData } from '@mt/shared'
import { namer, skillName } from './battleText.ts'
import { PreviewCard } from './ActionPreview.tsx'
import { th } from './strings.ts'

export function ActionPlanPanel({ snapshot, session, data, tools }: { snapshot: SessionSnapshot; session: BattleSession; data: GameData; tools?: ReactNode }) {
  const plan = snapshot.plan
  if (plan === null) return null
  const name = namer(snapshot.state, data)
  return (
    <section className="action-plan" aria-labelledby="action-plan-title">
      <h2 id="action-plan-title">{th.actionPlan.title}</h2>
      <p>{th.actionPlan.origin(name(plan.unit), tileName(plan.origin.tile))} · {th.actionPlan.via[plan.origin.via]}</p>
      <div className="buttons plan-choices sheet-choices" role="group" aria-label={th.actionPlan.choices}>
        {plan.choices.map(choice => (
          <button key={choice.key} type="button" className="secondary" aria-pressed={choice.key === plan.choice?.key}
            onClick={() => session.choosePlanAction(choice.key)}>
            {choice.kind === 'command' && choice.action.type === 'command' ? `${th.command} · ${th.commandOption[choice.action.option]}` : choice.kind === 'defend' ? th.defend : choice.skill === null ? th.attack : skillName(data, choice.skill)}
            {choice.target !== null ? ` · ${name(choice.target)}` : ''}
          </button>
        ))}
      </div>
      <div className="sheet-details">
        {plan.preview !== null && <PreviewCard preview={plan.preview} action={plan.choice?.action ?? null} name={name} data={data} />}
        {plan.rolls && <p className="warning">{th.actionPlan.rolls}</p>}
        {tools}
      </div>
      <div className="buttons sheet-footer">
        <button type="button" className="primary" disabled={plan.choice === null} onClick={() => session.confirmPlan()}>{th.actionPlan.confirm}</button>
        <button type="button" className="secondary" onClick={() => session.cancel()}>{th.cancel}</button>
      </div>
    </section>
  )
}
