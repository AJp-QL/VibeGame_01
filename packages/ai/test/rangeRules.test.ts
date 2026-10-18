import { describe, expect, it } from 'vitest'
import { applyAction, createBattle, decidingSide, GAME_RANGE_RULES, legalActions, previewAction, type BattleState } from '@mt/engine'
import { chooseAction, createAi, GAME_PROFILES, SIM_PROFILES } from '../src/index.ts'
import { gameData, newBattle, playBattle } from './play.ts'

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

  it('with a shot from distance 3 on offer, the AI does not take the attack roll from 4 (which would roll with disadvantage)', () => {
    // Quillfox (B.m2, Long Shot reaches 3, Mark 4) on g7; Fangrel (A.m1) on g3, 4 tiles up an open column.
    // Stepping to g6 or nearer gives the Long Shot a normal roll; Marking from g7 would roll with disadvantage.
    const scenario = gameData.scenarios.scenario_1
    const board = gameData.boards.crossroads
    if (scenario === undefined || board === undefined) throw new Error('data')
    const tile = (x: number, y: number) => ({ x, y })
    const build = (seedNumber: number): BattleState =>
      createBattle({
        scenario,
        board,
        species: gameData.species,
        skills: gameData.skills,
        statuses: gameData.statuses,
        elementWheel: gameData.elementWheel,
        dice: { seed: seed(seedNumber) },
        preset: { tiles: { A: [tile(0, 0), tile(6, 2), tile(0, 1)], B: [tile(0, 6), tile(1, 6), tile(6, 6)] }, firstSide: 'B' },
      })
    // The test is not empty: Marking from g7 is legal and would roll with disadvantage.
    const markFromG7 = previewAction(build(1), { type: 'useSkill', unit: 'B.m2', skill: 'mark', target: 'A.m1' })
    expect(markFromG7.ok && markFromG7.preview?.type === 'attack' && markFromG7.preview.longRangeDisadvantage).toBe(true)
    for (const n of [1, 2, 3, 4, 5]) {
      let state = build(n)
      let ai = createAi(state, 'B', GAME_PROFILES.greedy)
      const attacks: boolean[] = []
      // B's first Turn only.
      for (let step = 0; step < 40 && state.outcome === null && state.round === 1 && decidingSide(state) === 'B'; step++) {
        const choice = chooseAction(state, ai)
        ai = choice.ai
        if (choice.action.type === 'useSkill' || choice.action.type === 'basicAttack') {
          const preview = previewAction(state, choice.action)
          if (preview.ok && preview.preview?.type === 'attack') attacks.push(preview.preview.longRangeDisadvantage === true)
        }
        const result = applyAction(state, choice.action)
        if (!result.ok) throw new Error(result.rejection.message)
        state = result.state
      }
      expect(attacks.length, `seed ${n}: the AI attacked`).toBeGreaterThan(0)
      expect(attacks.filter(Boolean), `seed ${n}: attacks that rolled with the long-range disadvantage`).toEqual([])
    }
  })
})
