import { COUNTERATTACK, type BattleState, type Chance, type UnitState, type UnitTemplate } from '@mt/session'
import type { GameData, Side } from '@mt/shared'
import { th } from './strings.ts'

export function unitName(unit: UnitTemplate, data: GameData): string {
  return unit.kind === 'tamer' ? th.tamer : (data.species[unit.species]?.name ?? unit.species)
}

export const otherSide = (side: Side): Side => (side === 'A' ? 'B' : 'A')

/** Display rounding is the UI's job (rules §21.1): whole percent, or one decimal when needed. */
export function percent(chance: Chance): string {
  return `${Math.round((chance.numerator * 1000) / chance.denominator) / 10}%`
}

/** Every Unit in play, on the Board or fallen, in Unit order (rules §21.4): team A Tamer, Monster 1, Monster 2, then B. */
export function allUnits(state: BattleState): readonly UnitState[] {
  const order = (a: UnitState, b: UnitState) =>
    a.side !== b.side ? (a.side < b.side ? -1 : 1) : a.kind !== b.kind ? (a.kind === 'tamer' ? -1 : 1) : a.id < b.id ? -1 : 1
  return [...state.units, ...state.fallen].sort(order)
}

/** "Fangrel (ทีม A)" for any Unit id, including Units that fell. */
export function namer(state: BattleState, data: GameData): (id: string) => string {
  return (id) => {
    const unit = allUnits(state).find((u) => u.id === id)
    return unit ? `${unitName(unit, data)} (${th.team(unit.side)})` : id
  }
}

export function skillName(data: GameData, id: string): string {
  if (id === COUNTERATTACK) return th.counterattackName
  return data.skills[id]?.name ?? id
}
