import { describe, expect, it } from 'vitest'
import { SIDES, tileFromName, tileName, type Board, type Scenario, type Side } from '@mt/shared'
import {
  applyAction,
  createBattle,
  derivedValues,
  legalActions,
  type BattleState,
  type DiceSource,
  type UnitId,
} from '../src/index.ts'
import { gameData } from './fixtures.ts'

// The menu plays any Scenario on any Board (spec user story 8); Scenario 2 and
// the Shallows Board come from data/ (ticket 13).

const shallows: Board = gameData.boards.shallows!
const scenario2: Scenario = gameData.scenarios.scenario_2!

type Tiles = readonly [string, string, string]

function battle(scenario: Scenario, board: Board, tiles?: Readonly<Record<Side, Tiles>>, firstSide: Side = 'A') {
  const dice: DiceSource = { seed: '0123456789abcdef' }
  const common = { scenario, board, species: gameData.species, skills: gameData.skills, dice }
  if (tiles === undefined) return createBattle(common)
  const place = (side: Side) => {
    const [tamer, m1, m2] = tiles[side].map(tileFromName)
    return [tamer!, m1!, m2!] as const
  }
  return createBattle({ ...common, preset: { tiles: { A: place('A'), B: place('B') }, firstSide } })
}

function destinations(state: BattleState, unit: UnitId): string[] {
  return legalActions(state)
    .flatMap((action) => (action.type === 'move' && action.unit === unit ? [tileName(action.to)] : []))
    .sort()
}

describe('a Battle on the chosen Board', () => {
  it('Scenario 2 on Shallows starts in deployment on Shallows terrain', () => {
    const state = battle(scenario2, shallows)
    expect(state.phase).toBe('deployment')
    expect(state.scenarioId).toBe('scenario_2')
    expect(state.boardId).toBe('shallows')
    expect(state.terrain).toEqual(shallows.terrain)
  })

  it('Scenario 1 can be played on Shallows too', () => {
    expect(battle(gameData.scenarios.scenario_1!, shallows).boardId).toBe('shallows')
  })

  it('both sides deploy on Shallows, the river tiles in their start zone included', () => {
    let state = battle(scenario2, shallows)
    const placements: Record<Side, Tiles> = { A: ['d1', 'g1', 'f2'], B: ['d7', 'a7', 'b6'] }
    for (const side of SIDES) {
      ;(['tamer', 'm1', 'm2'] as const).forEach((slot, i) => {
        const result = applyAction(state, { type: 'deploy', unit: `${side}.${slot}`, to: tileFromName(placements[side][i]!) })
        if (!result.ok) throw new Error(result.rejection.message)
        state = result.state
      })
      const confirmed = applyAction(state, { type: 'confirmDeployment' })
      if (!confirmed.ok) throw new Error(confirmed.rejection.message)
      state = confirmed.state
    }
    expect(state.phase).toBe('play')
  })
})

describe('Scenario 2 Tidewall on the Shallows river (rules §6.3)', () => {
  const A: Tiles = ['g1', 'f1', 'e1']

  it('starting its Move on the river (b6) it moves 3, its base 2 plus Aquatic', () => {
    const state = battle(scenario2, shallows, { A, B: ['d7', 'b6', 'g7'] }, 'B')
    expect(derivedValues(state, 'B.m1').move).toBe(2)
    expect(destinations(state, 'B.m1')).toContain('e3')
    expect(destinations(state, 'B.m1')).not.toContain('e2')
  })

  it('off the river (c7) it moves 2', () => {
    const state = battle(scenario2, shallows, { A, B: ['d7', 'c7', 'g7'] }, 'B')
    expect(destinations(state, 'B.m1')).toContain('c5')
    expect(destinations(state, 'B.m1')).not.toContain('c4')
  })
})
