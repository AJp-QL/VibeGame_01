// Ticket 23: the in-game profiles look past the activation (Mark's advantage on our next
// Turn, Hex, Pin, Camouflage); the sim-parity profiles do not.
import { describe, expect, it } from 'vitest'
import { applyAction, createBattle, decidingSide, type Action, type BattleState } from '@mt/engine'
import type { Side, Tile } from '@mt/shared'
import { chooseAction, createAi, GAME_PROFILES, SIM_PROFILES, type AiProfile } from '../src/index.ts'
import { gameData, newBattle, playBattle, seedOf } from './play.ts'

const PATTERN = [12, 8, 15, 5, 18, 3, 10, 14, 7, 16, 2, 11]
const ROLLS = Array.from({ length: 300 }, (_, i) => PATTERN[i % PATTERN.length] as number)

function presetBattle(tiles: Record<Side, [Tile, Tile, Tile]>, firstSide: Side): BattleState {
  const scenario = gameData.scenarios.scenario_1
  const board = gameData.boards.crossroads
  if (scenario === undefined || board === undefined) throw new Error('data')
  const { species, skills, statuses, elementWheel } = gameData
  return createBattle({ scenario, board, species, skills, statuses, elementWheel, dice: { rolls: ROLLS }, preset: { tiles, firstSide } })
}

/** The skills `side` uses in its Turn with `profile` (the other side answers pending decisions). */
function skillsInTurn(start: BattleState, side: Side, profile: AiProfile): string[] {
  let state = start
  let ai = createAi(state, side, profile)
  let other = createAi(state, side === 'A' ? 'B' : 'A', SIM_PROFILES.greedy)
  const used: string[] = []
  while (state.outcome === null && state.sideToAct === side) {
    let action: Action
    if (decidingSide(state) === side) {
      const c = chooseAction(state, ai)
      ai = c.ai
      action = c.action
      if (action.type === 'useSkill') used.push(action.skill)
    } else {
      const c = chooseAction(state, other)
      other = c.ai
      action = c.action
    }
    const r = applyAction(state, action)
    if (!r.ok) throw new Error(r.rejection.message)
    state = r.state
  }
  return used
}

describe('lookahead (ticket 23)', () => {
  it('sim-parity profiles have no lookahead; in-game profiles do', () => {
    for (const p of Object.values(SIM_PROFILES)) expect(p.heuristics.lookahead).toBe(0)
    for (const p of Object.values(GAME_PROFILES)) expect(p.heuristics.lookahead).toBeGreaterThan(0)
  })

  it('Marks an enemy that its side can follow up on next Turn; sim.py only counts allies still to act', () => {
    // B's Quillfox (1,1) next to A's Fangrel (1,2) and Tamer (1,3); B's Tamer and Tidewall
    // (4,0)/(4,1) are within reach of them next Turn. Marked lasts until the end of B's next Turn.
    const state = presetBattle(
      { A: [{ x: 1, y: 3 }, { x: 1, y: 2 }, { x: 6, y: 6 }], B: [{ x: 4, y: 1 }, { x: 4, y: 0 }, { x: 1, y: 1 }] },
      'B',
    )
    expect(skillsInTurn(state, 'B', GAME_PROFILES.greedy)).toContain('mark')
    expect(skillsInTurn(state, 'B', SIM_PROFILES.greedy)).not.toContain('mark')
  })

  it('uses Mark, Hex, Pin and Camouflage in whole Battles (game profiles both sides)', () => {
    const count = (scenario: string, board: string, skill: string, battles: number) => {
      let n = 0
      for (let i = 1; i <= battles; i++) {
        const played = playBattle(newBattle(scenario, board, seedOf(i)), { A: GAME_PROFILES.greedy, B: GAME_PROFILES.greedy })
        n += played.actions.filter((a) => a.type === 'useSkill' && a.skill === skill).length
      }
      return n
    }
    expect(count('scenario_1', 'crossroads', 'mark', 10)).toBeGreaterThan(0)
    expect(count('scenario_1', 'crossroads', 'camouflage', 10)).toBeGreaterThan(0)
    expect(count('scenario_1', 'shallows', 'hex', 20)).toBeGreaterThan(0)
    expect(count('scenario_2', 'shallows', 'pin', 10)).toBeGreaterThan(0)
  }, 120000)
})
