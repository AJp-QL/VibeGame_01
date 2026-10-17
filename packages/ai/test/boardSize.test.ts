import { describe, expect, it } from 'vitest'
import { boardSizeOf, isInStartZone, legalActions } from '@mt/engine'
import { tileName } from '@mt/shared'
import { chooseAction, createAi, planDeployment, GAME_PROFILES, SIM_PROFILES } from '../src/index.ts'
import { arena, newBattle, playBattle } from './play.ts'

// The AI reads the Board size from the Battle (phase 1.x ticket 13): on the 9x9
// Arena it deploys in its own start zone, plays only legal actions and finishes.

const seed = (n: number) => n.toString(16).padStart(16, '0')

describe('the AI on a 9x9 Board', () => {
  it('deploys on its own two rows, over all nine columns', () => {
    for (const side of ['A', 'B'] as const) {
      const state = newBattle('scenario_1', 'arena', seed(1), arena)
      expect(boardSizeOf(state)).toBe(9)
      const planned = planDeployment({ ...state, sideToAct: side }, createAi(state, side, GAME_PROFILES.greedy))
      const tiles = planned.actions.flatMap((a) => (a.type === 'deploy' ? [a.to] : []))
      expect(tiles).toHaveLength(3)
      for (const tile of tiles) expect(isInStartZone(side, tile, 9), tileName(tile)).toBe(true)
    }
  })

  it('plays whole Battles with legal actions only, and the same Battle gives the same result twice', () => {
    for (const n of [1, 2, 3]) {
      const play = () =>
        playBattle(newBattle('scenario_1', 'arena', seed(n), arena), { A: GAME_PROFILES.greedy, B: SIM_PROFILES.greedy }, {
          checkLegal: (state, action) => legalActions(state).some((a) => JSON.stringify(a) === JSON.stringify(action)),
        })
      const first = play()
      expect(first.final.outcome, `seed ${n}`).not.toBeNull()
      expect(first.illegal).toEqual([])
      expect(play().actions).toEqual(first.actions)
    }
  })

  it('walks to the far columns: Units end up beyond the old 7x7 edge', () => {
    let beyond = 0
    for (const n of [1, 2, 3, 4]) {
      const played = playBattle(newBattle('scenario_1', 'arena', seed(n), arena), { A: GAME_PROFILES.greedy, B: GAME_PROFILES.greedy })
      for (const e of played.events) if (e.type === 'unitMoved' && (e.to.x > 6 || e.to.y > 6)) beyond++
    }
    expect(beyond).toBeGreaterThan(0)
  })

  it('chooseAction on the Arena does not throw at any decision of a Battle', () => {
    const state = newBattle('scenario_1', 'arena', seed(7), arena)
    const ai = createAi(state, 'A', GAME_PROFILES.greedy)
    expect(() => chooseAction(state, ai)).not.toThrow()
  })
})
