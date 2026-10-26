import { useMemo, type ReactNode } from 'react'
import { createBattleSession, type BattleSession, type SessionSnapshot } from '@mt/session'
import type { GameData } from '@mt/shared'
import { namer, percent } from './battleText.ts'
import { SkillButtons } from './SkillButtons.tsx'
import { th } from './strings.ts'

/** Only a move-only confirmation opens this continuation; selection is still session-owned. */
export function isAfterMove(snapshot: SessionSnapshot): boolean {
  if (snapshot.selectedUnit !== null && snapshot.movedWithoutAction.includes(snapshot.selectedUnit)) return true
  const last = snapshot.actions.at(-1)
  return snapshot.selectedUnit !== null && last !== undefined && 'unit' in last && last.unit === snapshot.selectedUnit &&
    (last.type === 'move' || (last.type === 'useSkill' && snapshot.state.skills[last.skill]?.effects?.replacesMove === true))
}

export function isActionSheetOpen(snapshot: SessionSnapshot): boolean {
  return snapshot.state.pending === null && (snapshot.plan !== null || snapshot.movePreview !== null || isAfterMove(snapshot))
}

export function ActionsFromHere({ snapshot, session, data, tools }: { snapshot: SessionSnapshot; session: BattleSession; data: GameData; tools?: ReactNode }) {
  const name = namer(snapshot.state, data)
  // Ask an isolated session for its plans and odds. No commands reach the live Battle.
  const attacks = useMemo(() => {
    const review = createBattleSession(snapshot.state)
    review.selectUnit(snapshot.selectedUnit)
    return snapshot.attackable.filter(enemy => enemy.fromHere).map(enemy => {
      review.aimTarget(enemy.unit)
      return { enemy, preview: review.getSnapshot().plan?.preview }
    })
  }, [snapshot.state, snapshot.selectedUnit, snapshot.attackable])
  return (
    <section className="actions-from-here" aria-labelledby="actions-from-here-title">
      <div className="sheet-details">
        <h2 id="actions-from-here-title">{th.actionsFromHere}</h2>
        <div className="buttons">
          {attacks.map(({ enemy, preview }) => (
            <button type="button" className="secondary" key={enemy.unit} onClick={() => session.aimTarget(enemy.unit)}>
              {th.attack} · {name(enemy.unit)}
              {preview?.type === 'attack' ? ` · ${th.previewHit(percent(preview.hitChance))}` : ''}
            </button>
          ))}
          <button type="button" className="secondary" disabled={!snapshot.canDefend} onClick={() => session.defend()}>{th.defend}</button>
          {snapshot.canCommand && <button type="button" className="secondary" onClick={() => session.chooseCommand()}>{th.command}</button>}
        </div>
        <SkillButtons snapshot={snapshot} session={session} data={data} />
        {tools}
      </div>
      <div className="buttons sheet-footer">
        <button type="button" className="primary" title={th.finishUnitHint} onClick={() => session.selectUnit(null)}>{th.finishUnit}</button>
      </div>
    </section>
  )
}
