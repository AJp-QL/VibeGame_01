// P1X-36: on a big Board a healthy Monster that can attack nothing this Turn walks toward the
// enemy until an enemy is within its own Threat reach; the sim-parity profiles keep sim.py's waiting.
import { describe, expect, it } from 'vitest'
import { createBattle, distanceIn, legalActions, threatReach, type BattleState } from '@mt/engine'
import type { Side, Tile } from '@mt/shared'
import { GAME_PROFILES, SIM_PROFILES, type AiProfile } from '../src/index.ts'
import { Ctx } from '../src/model.ts'
import { planUnit } from '../src/planner.ts'
import { arena, gameData } from './play.ts'

const PATTERN = [12, 8, 15, 5, 18, 3, 10, 14, 7, 16, 2, 11]
const ROLLS = Array.from({ length: 300 }, (_, i) => PATTERN[i % PATTERN.length] as number)

function arenaBattle(tiles: Record<Side, [Tile, Tile, Tile]>): BattleState {
  const scenario = gameData.scenarios.scenario_1
  if (scenario === undefined) throw new Error('data')
  const { species, skills, statuses, elementWheel } = gameData
  return createBattle({ scenario, board: arena, species, skills, statuses, elementWheel, dice: { rolls: ROLLS }, preset: { tiles, firstSide: 'A' } })
}

const nearestEnemy = (state: BattleState, tile: Tile) =>
  Math.min(...state.units.filter((u) => u.side === 'B').map((e) => distanceIn(state, tile, e.tile)))

/** The plan of A.m1 (the Fangrel) in `state` under `profile`. */
function planOfM1(state: BattleState, profile: AiProfile) {
  const unit = state.units.find((u) => u.id === 'A.m1')!
  return planUnit(new Ctx(profile, 'A', state, new Set()), unit, legalActions(state))
}

const withoutApproach: AiProfile = { ...GAME_PROFILES.greedy, heuristics: { ...GAME_PROFILES.greedy.heuristics, approach: 0 } }

// A on the top rows, B on the bottom row of the 9x9 Arena: the Fangrel (2,1) is 7 away from everything.
const FAR = { A: [{ x: 4, y: 0 }, { x: 2, y: 1 }, { x: 6, y: 1 }], B: [{ x: 4, y: 8 }, { x: 2, y: 8 }, { x: 6, y: 8 }] } satisfies Record<Side, [Tile, Tile, Tile]>

describe('approach (P1X-36)', () => {
  it('the in-game profiles approach, the sim-parity profiles do not', () => {
    for (const p of Object.values(SIM_PROFILES)) expect(p.heuristics.approach).toBe(0)
    for (const p of Object.values(GAME_PROFILES)) expect(p.heuristics.approach).toBeGreaterThan(0)
  })

  it('a healthy Monster that can hit nothing walks nearer the enemy; nearer than the sim-parity AI', () => {
    const state = arenaBattle(FAR)
    const m1 = state.units.find((u) => u.id === 'A.m1')!
    expect(nearestEnemy(state, m1.tile)).toBeGreaterThan(threatReach(state, m1))
    const game = planOfM1(state, GAME_PROFILES.greedy)
    expect(nearestEnemy(state, game.dest)).toBeLessThan(nearestEnemy(state, m1.tile))
    expect(nearestEnemy(state, game.dest)).toBeLessThan(nearestEnemy(state, planOfM1(state, SIM_PROFILES.greedy).dest))
  })

  it("does not approach once an enemy is within the Monster's own Threat reach", () => {
    const state = arenaBattle({ ...FAR, A: [{ x: 4, y: 0 }, { x: 2, y: 3 }, { x: 6, y: 0 }] })
    const m1 = state.units.find((u) => u.id === 'A.m1')!
    expect(nearestEnemy(state, m1.tile)).toBeLessThanOrEqual(threatReach(state, m1))
    expect(planOfM1(state, GAME_PROFILES.greedy)).toEqual(planOfM1(state, withoutApproach))
  })

  it('does not approach with a Monster below the HP share', () => {
    const healthy = arenaBattle(FAR)
    const state = { ...healthy, units: healthy.units.map((u) => (u.id === 'A.m1' ? { ...u, hp: 2 } : u)) }
    expect(planOfM1(state, GAME_PROFILES.greedy)).toEqual(planOfM1(state, withoutApproach))
  })
})
