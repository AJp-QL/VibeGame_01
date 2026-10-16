import { ROUND_LIMIT, type BattleState, type BattleOutcome } from '@mt/session'
import { otherSide } from './battleText.ts'
import { th } from './strings.ts'

export function StatusBar({ state }: { state: BattleState }) {
  if (state.phase === 'deployment') {
    return (
      <section className="status" aria-live="polite">
        <span className={`turn side-${state.sideToAct}`}>{th.deploymentStatus(state.sideToAct)}</span>
      </section>
    )
  }
  const { limit, started } = state.activations
  const teamSize = state.units.filter((u) => u.side === state.sideToAct).length
  const sides = ['A', 'B'] as const
  return (
    <section className="status" aria-live="polite">
      {state.round > 0 && <span className="round">{th.round(state.round, ROUND_LIMIT)}</span>}
      {state.firstSide !== null && (
        <span className={`turn side-${state.sideToAct}`}>
          {th.turnOf(state.sideToAct, state.turnNumber[state.sideToAct])}
        </span>
      )}
      {state.outcome === null && limit < teamSize && (
        <span className="limit">{th.firstTurnLimit(limit, started.length)}</span>
      )}
      <span className="totals">
        {th.damageTotals}:{' '}
        {sides.map((side) => (
          <span key={side} className={`side-${side}`}>
            {' '}
            {th.damageTotal(side, state.damageDealt[side])}
          </span>
        ))}
      </span>
      <span className="inspiration-left">
        {th.inspiration.name}:{' '}
        {sides.map((side) => (
          <span key={side} className={`side-${side}${state.inspiration[side] ? '' : ' spent'}`}>
            {' '}
            {th.inspirationLeft(side, state.inspiration[side])}
          </span>
        ))}
      </span>
    </section>
  )
}

/** Winner (or draw), why, how many Rounds and the damage totals (spec user story 47). */
export function ResultSummary({ outcome, state }: { outcome: BattleOutcome; state: BattleState }) {
  const { A, B } = state.damageDealt
  return (
    <>
      <h2>{th.resultTitle(outcome.winner)}</h2>
      {outcome.cause === 'turnLimit' ? (
        <>
          <p>{th.turnLimitCause(ROUND_LIMIT)}</p>
          <p>{th.turnLimitResult(A, B, outcome.winner)}</p>
        </>
      ) : (
        <p>{th.cause[outcome.cause](otherSide(outcome.winner ?? 'A'))}</p>
      )}
      <p>{th.resultRounds(state.round)}</p>
      {outcome.cause !== 'turnLimit' && <p>{th.resultDamage(A, B)}</p>}
    </>
  )
}
