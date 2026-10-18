import { describe, expect, it } from 'vitest'
import { GAME_RANGE_RULES, legalActions } from '@mt/engine'
import { GAME_PROFILES, SIM_PROFILES } from '../src/index.ts'
import { newBattle, playBattle } from './play.ts'

// The AI in the game plays with the range rules (phase 1.x ticket 09, D-31): shorter ranges,
// disadvantage from distance 4, mountains blocking sight. It reads legal actions and attack
// previews from the engine, so it follows them; these tests check that whole Battles on the
// real data stay legal and deterministic.

const seed = (n: number) => n.toString(16).padStart(16, '0')
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

describe('the in-game AI under the range rules', () => {
  it('Battles start with the rules of the game', () => {
    expect(newBattle('scenario_1', 'crossroads', seed(1)).rangeRules).toEqual(GAME_RANGE_RULES)
  })

  for (const board of ['crossroads', 'shallows']) {
    it(`plays whole Battles on ${board} with legal actions only, and the same Battle gives the same actions`, () => {
      for (const n of [1, 2, 3]) {
        const play = () =>
          playBattle(newBattle('scenario_2', board, seed(n)), { A: GAME_PROFILES.greedy, B: GAME_PROFILES.tamer_rush }, {
            checkLegal: (state, action) => legalActions(state).some((a) => same(a, action)),
          })
        const first = play()
        expect(first.final.outcome, `${board} seed ${n}`).not.toBeNull()
        expect(first.illegal).toEqual([])
        expect(play().actions).toEqual(first.actions)
      }
    })
  }

  it('the sim-parity profiles still play legal Battles under the rules of the game', () => {
    const played = playBattle(newBattle('scenario_1', 'crossroads', seed(4)), { A: SIM_PROFILES.greedy, B: SIM_PROFILES.greedy }, {
      checkLegal: (state, action) => legalActions(state).some((a) => same(a, action)),
    })
    expect(played.illegal).toEqual([])
  })
})
