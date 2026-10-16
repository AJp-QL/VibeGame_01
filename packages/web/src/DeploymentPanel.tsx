import { legalActions, type BattleEvent, type BattleSession, type SessionSnapshot } from '@mt/session'
import { tileName, type GameData, type Side } from '@mt/shared'
import { unitName } from './battleText.ts'
import { th } from './strings.ts'

/** Every initiative roll so far (Inspiration rerolls included), and who starts once decided. */
export function InitiativeResult({ log, firstSide }: { log: readonly BattleEvent[]; firstSide: Side | null }) {
  const rolls = log.flatMap((e) => (e.type === 'initiativeRolled' ? [e] : []))
  return (
    <div className="initiative">
      <h3>{th.initiativeTitle}</h3>
      {rolls.map((roll, index) => (
        <ul key={index}>
          {roll.rerolled !== undefined && <li className="rerolled">{th.initiativeRerolled(roll.rerolled)}</li>}
          {(['A', 'B'] as const).map((side) => (
            <li key={side}>{th.initiativeRoll(side, roll.rolls[side].d20, roll.rolls[side].modifier, roll.rolls[side].total)}</li>
          ))}
          {roll.tie && <li className="tie">{th.initiativeTie}</li>}
        </ul>
      ))}
      {firstSide !== null && (
        <>
          <p className={`first side-${firstSide}`}>{th.initiativeFirst(firstSide)}</p>
          <p>{th.initiativeFirstTurn(firstSide)}</p>
        </>
      )}
    </div>
  )
}

export function DeploymentPanel({ snapshot, session, data }: { snapshot: SessionSnapshot; session: BattleSession; data: GameData }) {
  const { state } = snapshot
  const side = state.sideToAct
  const roster = state.deployment?.roster.filter((u) => u.side === side) ?? []
  const placed = state.deployment?.placements[side] ?? {}
  const canConfirm = legalActions(state).some((a) => a.type === 'confirmDeployment')
  return (
    <section className="panel controls">
      <p className="hint">
        {snapshot.rejection !== null
          ? th.rejection[snapshot.rejection]
          : snapshot.aiSide !== null
            ? th.ai.deploymentHint(side, snapshot.aiSide)
            : th.deploymentHint(side)}
      </p>
      <p className="hint">{th.deploymentPick}</p>
      <ul className="roster">
        {roster.map((unit) => {
          const tile = placed[unit.id]
          return (
            <li key={unit.id}>
              <button
                type="button"
                className={`roster-unit side-${side}`}
                aria-pressed={snapshot.selectedUnit === unit.id}
                onClick={() => session.selectUnit(unit.id)}
              >
                <strong>{unitName(unit, data)}</strong> <span>{tile ? th.placedOn(tileName(tile)) : th.notPlaced}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <button type="button" className="primary" disabled={!canConfirm} onClick={() => session.confirmDeployment()}>
        {th.confirmDeployment}
      </button>
      {!canConfirm && <p className="hint">{th.confirmNeedsAll}</p>}
    </section>
  )
}
