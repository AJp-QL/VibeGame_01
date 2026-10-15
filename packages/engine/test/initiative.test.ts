import { describe, expect, it } from 'vitest'
import type { Scenario } from '@mt/shared'
import type { BattleEvent } from '../src/index.ts'
import { deployBothSides, scenario1 } from './fixtures.ts'

const initiativeEvents = (events: readonly BattleEvent[]) =>
  events.filter((e) => e.type === 'initiativeRolled' || e.type === 'initiativeDecided')

/** Scenario 1 with team B's Tamer at AGI 16 (mod +3), higher than any other Unit. */
const quickTamerB: Scenario = {
  ...scenario1,
  teams: {
    ...scenario1.teams,
    B: { ...scenario1.teams.B, tamer: { ...scenario1.teams.B.tamer, stats: { ...scenario1.teams.B.tamer.stats, agi: 16 } } },
  },
}

describe('initiative: d20 + highest AGI mod in the team (rules §17.2)', () => {
  it("team A's d20 is rolled first, then team B's; higher total starts", () => {
    // Scenario 1: highest AGI is 12 on both teams (mod +1).
    const result = deployBothSides({ rolls: [15, 10] })
    expect(initiativeEvents(result.events)).toEqual([
      {
        type: 'initiativeRolled',
        rolls: { A: { d20: 15, modifier: 1, total: 16 }, B: { d20: 10, modifier: 1, total: 11 } },
        tie: false,
      },
      { type: 'initiativeDecided', firstSide: 'A' },
    ])
    expect(result.state.initiative?.firstSide).toBe('A')
    expect(result.state.dice).toMatchObject({ kind: 'scripted', position: 2 })
  })

  it('team B starts when its total is higher', () => {
    const result = deployBothSides({ rolls: [4, 18] })
    expect(result.events.at(-2)).toEqual({ type: 'initiativeDecided', firstSide: 'B' })
    expect(result.events.at(-1)).toEqual({ type: 'turnStarted', side: 'B', turn: 1, round: 1 })
    expect(result.state).toMatchObject({ sideToAct: 'B', firstSide: 'B', round: 1, turnNumber: { A: 0, B: 1 } })
  })

  it('the Tamer counts for the highest AGI mod', () => {
    // A rolls 12 + 1 = 13, B rolls 10 + 3 = 13: a tie, decided by the next pair.
    const result = deployBothSides({ rolls: [12, 10, 9, 5] }, quickTamerB)
    expect(initiativeEvents(result.events)[0]).toEqual({
      type: 'initiativeRolled',
      rolls: { A: { d20: 12, modifier: 1, total: 13 }, B: { d20: 10, modifier: 3, total: 13 } },
      tie: true,
    })
  })

  it('a tie rerolls both sides, A then B, until the totals differ (D-09)', () => {
    const result = deployBothSides({ rolls: [7, 7, 20, 20, 3, 9] })
    expect(initiativeEvents(result.events)).toEqual([
      { type: 'initiativeRolled', rolls: { A: { d20: 7, modifier: 1, total: 8 }, B: { d20: 7, modifier: 1, total: 8 } }, tie: true },
      { type: 'initiativeRolled', rolls: { A: { d20: 20, modifier: 1, total: 21 }, B: { d20: 20, modifier: 1, total: 21 } }, tie: true },
      { type: 'initiativeRolled', rolls: { A: { d20: 3, modifier: 1, total: 4 }, B: { d20: 9, modifier: 1, total: 10 } }, tie: false },
      { type: 'initiativeDecided', firstSide: 'B' },
    ])
    expect(result.state.initiative?.rolls).toHaveLength(3)
    expect(result.state.dice).toMatchObject({ position: 6 })
  })

  it('the same Dice Seed gives the same initiative', () => {
    const a = deployBothSides({ seed: 'deadbeefcafef00d' })
    const b = deployBothSides({ seed: 'deadbeefcafef00d' })
    expect(a.events).toEqual(b.events)
    expect(a.state).toEqual(b.state)
  })
})
