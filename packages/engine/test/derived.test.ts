import { describe, expect, it } from 'vitest'
import type { Scenario, Stats } from '@mt/shared'
import { derivedValues, previewAction, type BattleState, type UnitId } from '../src/index.ts'
import { scenario1, scenario1Battle } from './fixtures.ts'

// Expected values: rules §20.2, the Prototype kit stat block table, with
// Tidewall's movement range from the formula alone (2) and its species Guard
// bonus +2 from data (D-06).

/** The damage the Unit's main attack does: dice, and which mod is added (rules §10.1). */
interface Primary {
  readonly dice: string
  readonly mod: 'melee' | 'ranged' | 'elemental'
  readonly value: number
}

interface Expected {
  readonly unit: UnitId
  readonly name: string
  readonly hp: number
  readonly move: number
  readonly guard: number
  readonly ward: number
  readonly proficiency: number
  readonly attackBonus: number
  readonly primary: Primary
}

const SCENARIO_1: readonly Expected[] = [
  { unit: 'A.tamer', name: 'Tamer Level 1', hp: 25, move: 3, guard: 11, ward: 11, proficiency: 2, attackBonus: 3, primary: { dice: '1d6', mod: 'melee', value: 0 } },
  { unit: 'A.m1', name: 'Fangrel 1 Star', hp: 19, move: 4, guard: 11, ward: 9, proficiency: 1, attackBonus: 2, primary: { dice: '1d8', mod: 'melee', value: 2 } },
  { unit: 'A.m2', name: 'Wispling 1 Star', hp: 17, move: 4, guard: 11, ward: 11, proficiency: 1, attackBonus: 2, primary: { dice: 'Bolt 1d8', mod: 'elemental', value: 2 } },
  { unit: 'B.tamer', name: 'Tamer Level 1', hp: 25, move: 3, guard: 11, ward: 11, proficiency: 2, attackBonus: 3, primary: { dice: '1d6', mod: 'melee', value: 0 } },
  { unit: 'B.m1', name: 'Tidewall 1 Star', hp: 31, move: 2, guard: 11, ward: 11, proficiency: 1, attackBonus: 1, primary: { dice: 'Shield Bash 2d6', mod: 'melee', value: 1 } },
  { unit: 'B.m2', name: 'Quillfox 1 Star', hp: 19, move: 4, guard: 11, ward: 9, proficiency: 1, attackBonus: 3, primary: { dice: 'Long Shot 1d8', mod: 'ranged', value: 2 } },
]

const SCENARIO_2: readonly Expected[] = [
  { unit: 'A.tamer', name: 'Tamer Level 6', hp: 45, move: 3, guard: 12, ward: 13, proficiency: 3, attackBonus: 5, primary: { dice: '1d6', mod: 'melee', value: 0 } },
  { unit: 'A.m1', name: 'Fangrel 4 Star', hp: 31, move: 5, guard: 14, ward: 11, proficiency: 2, attackBonus: 5, primary: { dice: '1d8', mod: 'melee', value: 6 } },
  { unit: 'A.m2', name: 'Wispling 4 Star', hp: 29, move: 4, guard: 13, ward: 14, proficiency: 2, attackBonus: 6, primary: { dice: 'Bolt 1d8', mod: 'elemental', value: 6 } },
  { unit: 'B.m1', name: 'Tidewall 4 Star', hp: 50, move: 2, guard: 12, ward: 14, proficiency: 2, attackBonus: 4, primary: { dice: 'Shield Bash 2d6', mod: 'melee', value: 5 } },
  { unit: 'B.m2', name: 'Quillfox 4 Star', hp: 29, move: 5, guard: 14, ward: 13, proficiency: 2, attackBonus: 8, primary: { dice: 'Long Shot 1d8', mod: 'ranged', value: 6 } },
]

const stats = (pow: number, agi: number, vit: number, int: number, sen: number, spi: number): Stats => ({
  pow,
  agi,
  vit,
  int,
  sen,
  spi,
})

/** Scenario 2 (mid game) as rules §20.1–§20.2 give it; data/ gets it with ticket 13. */
const scenario2: Scenario = (() => {
  const tamer = { ...scenario1.teams.A.tamer, level: 6, stats: stats(10, 14, 14, 10, 14, 16) }
  const [fangrel, wispling] = scenario1.teams.A.monsters
  const [tidewall, quillfox] = scenario1.teams.B.monsters
  return {
    ...scenario1,
    id: 'scenario_2',
    teams: {
      A: {
        ...scenario1.teams.A,
        tamer,
        monsters: [
          { ...fangrel, star: 4, stats: stats(22, 18, 14, 10, 16, 12) },
          { ...wispling, star: 4, stats: stats(10, 16, 12, 22, 18, 18) },
        ],
      },
      B: {
        ...scenario1.teams.B,
        tamer,
        monsters: [
          { ...tidewall, star: 4, stats: stats(20, 10, 22, 10, 14, 18) },
          { ...quillfox, star: 4, stats: stats(16, 18, 12, 10, 22, 16) },
        ],
      },
    },
  }
})()

function checkDerivedValues(state: BattleState, expected: Expected): void {
  const values = derivedValues(state, expected.unit)
  expect({
    hp: values.maxHp,
    move: values.move,
    guard: values.guard,
    ward: values.ward,
    proficiency: values.proficiency,
    attackBonus: values.attackBonus,
    primaryMod: values.damageMod[expected.primary.mod],
  }).toEqual({
    hp: expected.hp,
    move: expected.move,
    guard: expected.guard,
    ward: expected.ward,
    proficiency: expected.proficiency,
    attackBonus: expected.attackBonus,
    primaryMod: expected.primary.value,
  })
  expect(state.units.find((u) => u.id === expected.unit)?.hp).toBe(expected.hp)
}

describe('derived values of every Unit in Scenario 1 match the Prototype kit (rules §20.2)', () => {
  const state = scenario1Battle()
  for (const expected of SCENARIO_1) {
    it(`${expected.name}: HP ${expected.hp}, Guard/Ward ${expected.guard}/${expected.ward}, attack +${expected.attackBonus}, ${expected.primary.dice}+${expected.primary.value}`, () => {
      checkDerivedValues(state, expected)
    })
  }
})

describe('derived values of every Unit in Scenario 2 match the Prototype kit (rules §20.2)', () => {
  const state = scenario1Battle({ scenario: scenario2 })
  for (const expected of SCENARIO_2) {
    it(`${expected.name}: HP ${expected.hp}, Guard/Ward ${expected.guard}/${expected.ward}, attack +${expected.attackBonus}, ${expected.primary.dice}+${expected.primary.value}`, () => {
      checkDerivedValues(state, expected)
    })
  }
})

describe('Basic Attack damage of Scenario 1 Units (rules §15.1, §20.2)', () => {
  // Everyone stands next to an enemy: a1 Tamer A ↔ a2 Tamer B, d4 Fangrel ↔ d5 Tidewall, g1 Wispling ↔ g2 Quillfox.
  const tiles = { A: ['a1', 'd4', 'g1'], B: ['a2', 'd5', 'g2'] } as const

  const cases = [
    ['A.tamer', 'B.tamer', 'Tamer 1d6 + POW mod 0', { count: 1, sides: 6 }, 0, 1, 6],
    ['A.m1', 'B.m1', 'Fangrel 1d8 + POW mod 2', { count: 1, sides: 8 }, 2, 3, 10],
    ['A.m2', 'B.m2', 'Wispling 1d8 + POW mod −1, at least 1', { count: 1, sides: 8 }, -1, 1, 7],
  ] as const

  for (const [unit, target, name, dice, modifier, min, max] of cases) {
    it(name, () => {
      const state = scenario1Battle({ tiles })
      const result = previewAction(state, { type: 'basicAttack', unit, target })
      expect(result.ok && result.preview).toMatchObject({ damage: { dice, modifier, min, max } })
    })
  }
})
