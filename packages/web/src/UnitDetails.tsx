import { useState } from 'react'
import { derivedValues, type BattleState, type UnitState } from '@mt/session'
import type { GameData } from '@mt/shared'
import { statusDurationText, statusEffectText } from './skillText.ts'
import { allUnits, namer, unitName } from './battleText.ts'
import { th } from './strings.ts'

/** Guard and Ward bonus from statuses (Guarded), 0 when none. */
function guardedBonus(unit: UnitState, state: BattleState): number {
  return unit.statuses.reduce(
    (bonus, s) => (state.statusTypes[s.id]?.effects.defenceFromSource ? Math.max(bonus, s.bonus ?? 0) : bonus),
    0,
  )
}

export function UnitCard({ unit, state, data }: { unit: UnitState; state: BattleState; data: GameData }) {
  const values = derivedValues(state, unit.id)
  const details =
    unit.kind === 'tamer'
      ? [th.level(unit.level), th.movementType.ground]
      : [th.star(unit.star), th.element[unit.element], th.movementType[unit.movement]]
  const terrain = state.terrain[unit.tile.y]?.[unit.tile.x]
  const standing = terrain === undefined ? [] : [th.standingOn(th.terrain[terrain])]
  const bonus = guardedBonus(unit, state)
  const defences =
    bonus > 0 ? th.defencesGuarded(values.guard + bonus, values.ward + bonus, bonus) : th.defences(values.guard, values.ward)
  return (
    <div className={`unit-card side-${unit.side}`}>
      <strong>{unitName(unit, data)}</strong> <span className="team">{th.team(unit.side)}</span>
      <div>{[...details, th.move(values.move), ...standing].join(' · ')}</div>
      <div>{[th.hp(unit.hp, values.maxHp), defences, th.attackBonus(values.attackBonus)].join(' · ')}</div>
      {(unit.coveredBy !== undefined || state.command?.target === unit.id) && (
        <div>
          {unit.coveredBy !== undefined && <span className="tag status-tag positive">{th.coveredTag(namer(state, data)(unit.coveredBy))}</span>}{' '}
          {state.command?.target === unit.id && (
            <span className="tag status-tag positive">
              {state.command.spent === true ? th.commandSpentTag : th.commandTag(th.commandOption[state.command.option])}
            </span>
          )}
        </div>
      )}
      <StatusList unit={unit} state={state} />
    </div>
  )
}

/** Every status on a Unit with what it does and how long it has left (spec user story 41). */
function StatusList({ unit, state }: { unit: UnitState; state: BattleState }) {
  if (unit.statuses.length === 0) return <div className="muted">{th.noStatuses}</div>
  return (
    <ul className="statuses">
      {unit.statuses.map((status) => {
        const type = state.statusTypes[status.id]
        if (type === undefined) return null
        return (
          <li key={status.id} className={`status ${type.polarity}`}>
            <span className={`tag status-tag ${type.polarity}`}>{type.name}</span> {statusEffectText(type, status)} ·{' '}
            <span className="muted">{statusDurationText(type, status)}</span>
          </li>
        )
      })}
    </ul>
  )
}

/** Small status chips for lists; tap one to read what it does and how long it lasts. */
function StatusChips({ unit, state }: { unit: UnitState; state: BattleState }) {
  const [open, setOpen] = useState<string | null>(null)
  const shown = unit.statuses.find((s) => s.id === open)
  const shownType = shown === undefined ? undefined : state.statusTypes[shown.id]
  return (
    <>
      {unit.statuses.map((status) => {
        const type = state.statusTypes[status.id]
        if (type === undefined) return null
        const badge = status.turnsLeft === undefined ? '' : ` ${th.statusTurnsBadge(status.turnsLeft)}`
        return (
          <button
            key={status.id}
            type="button"
            className={`tag status-tag ${type.polarity}`}
            aria-expanded={open === status.id}
            onClick={() => setOpen(open === status.id ? null : status.id)}
          >
            {type.name}
            {badge}
          </button>
        )
      })}
      {shown !== undefined && shownType !== undefined && (
        <span className="status-detail">
          {statusEffectText(shownType, shown)} · {statusDurationText(shownType, shown)}
        </span>
      )}
    </>
  )
}

export function HpList({ state, data }: { state: BattleState; data: GameData }) {
  return (
    <ul className="hp-list">
      {allUnits(state).map((unit) => {
        const down = !state.units.some((u) => u.id === unit.id)
        return (
          <li key={unit.id} className={`side-${unit.side}${down ? ' down' : ''}`}>
            <span>
              {unitName(unit, data)} <span className="team">{th.team(unit.side)}</span>
              {!down && <StatusChips unit={unit} state={state} />}
            </span>
            <span>{down ? th.down : th.hp(unit.hp, derivedValues(state, unit.id).maxHp)}</span>
          </li>
        )
      })}
    </ul>
  )
}
