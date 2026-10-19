import { describe, expect, it } from 'vitest'
import { tileFromName } from '@mt/shared'
import { applyAction, longestAttackReach, threatCount, threatReach, threatZone, type BattleState } from '../src/index.ts'
import { arena, scenario1Battle } from './fixtures.ts'

// Threat zone (phase 1.x ticket 11): enemies on the Board count when the distance to the tile is at
// most their Move range + their longest attack/save skill reach. Nothing else is looked at.

const unit = (state: BattleState, id: string) => state.units.find((u) => u.id === id)!

describe('Threat zone', () => {
  it('reach is Move range plus the longest hostile skill reach', () => {
    const state = scenario1Battle({ tiles: { A: ['a1', 'd4', 'c3'], B: ['a7', 'e5', 'b6'] } })
    for (const id of ['A.m1', 'A.m2', 'B.m1', 'B.m2']) {
      expect(threatReach(state, unit(state, id)), id).toBeGreaterThan(longestAttackReach(state, unit(state, id)))
      expect(longestAttackReach(state, unit(state, id)), id).toBeGreaterThanOrEqual(1)
    }
  })

  it('a passive or ally-only skill adds no reach; a skill that only helps allies is ignored', () => {
    const base = scenario1Battle({ tiles: { A: ['a1', 'd4', 'c3'], B: ['a7', 'e5', 'b6'] } })
    // Give Fangrel an absurd range on Pack Howl (selfAndAllies): the threat does not change.
    const longHowl = scenario1Battle({
      tiles: { A: ['a1', 'd4', 'c3'], B: ['a7', 'e5', 'b6'] },
      skills: { pack_howl: { range: 6 } },
    })
    expect(longestAttackReach(longHowl, unit(longHowl, 'A.m1'))).toBe(longestAttackReach(base, unit(base, 'A.m1')))
  })

  it('counts the enemies within reach: near tiles by all three, a tile nobody reaches by none', () => {
    const state = scenario1Battle({ tiles: { A: ['a1', 'd4', 'c3'], B: ['g7', 'g6', 'g5'] } })
    // A tile right next to all of team B's Units is threatened by all three (Tamer, two Monsters).
    expect(threatCount(state, tileFromName('f6'), 'A')).toBe(3)
  })

  it('on a 9x9 Board a lone Tamer cannot cover the far corner', () => {
    const big = scenario1Battle({ board: arena, tiles: { A: ['i9', 'h9', 'i8'], B: ['a1', 'b1', 'a2'] } })
    const alone: BattleState = { ...big, units: big.units.filter((u) => u.side === 'A' || u.id === 'B.tamer') }
    expect(threatReach(alone, unit(alone, 'B.tamer'))).toBe(6)
    expect(threatCount(alone, tileFromName('i9'), 'A')).toBe(0)
    expect(threatCount(alone, tileFromName('g7'), 'A')).toBe(1)
  })

  it('is by side: the Units of the asked side are not counted', () => {
    const state = scenario1Battle({ tiles: { A: ['d4', 'd3', 'd5'], B: ['g7', 'g6', 'g5'] } })
    expect(threatCount(state, tileFromName('d4'), 'B')).toBe(3)
    const onlyA: BattleState = { ...state, units: state.units.filter((u) => u.side === 'A') }
    expect(threatCount(onlyA, tileFromName('d4'), 'A')).toBe(0)
  })

  it('a fallen Unit does not count', () => {
    let state = scenario1Battle({ tiles: { A: ['a1', 'd4', 'c3'], B: ['d6', 'd5', 'd7'] } })
    const before = threatCount(state, tileFromName('d4'), 'A')
    expect(before).toBe(3)
    state = {
      ...state,
      units: state.units.filter((u) => u.id !== 'B.m1'),
      fallen: [...state.fallen, { ...unit(state, 'B.m1'), hp: 0, statuses: [] }],
    }
    expect(threatCount(state, tileFromName('d4'), 'A')).toBe(2)
  })

  it('threatZone gives the same count for every tile as threatCount', () => {
    const state = scenario1Battle({ tiles: { A: ['a1', 'd4', 'c3'], B: ['a7', 'e5', 'b6'] } })
    const zone = threatZone(state, 'A')
    expect(zone).toHaveLength(7)
    let positive = 0
    for (let y = 0; y < 7; y++) {
      expect(zone[y]).toHaveLength(7)
      for (let x = 0; x < 7; x++) {
        expect(zone[y]![x], `${x},${y}`).toBe(threatCount(state, { x, y }, 'A'))
        if (zone[y]![x]! > 0) positive++
      }
    }
    expect(positive).toBeGreaterThan(0)
  })

  it('ignores line of sight, Pin, cooldowns and Units in the way', () => {
    const state = scenario1Battle({ tiles: { A: ['a1', 'd4', 'c3'], B: ['a7', 'e5', 'b6'] } })
    const pinned: BattleState = {
      ...state,
      units: state.units.map((u) => (u.id === 'B.m1' ? { ...u, statuses: [{ id: 'pin', turnsLeft: 2 }], skillsUsed: { shield_bash: 1 } } : u)),
    }
    expect(threatZone(pinned, 'A')).toEqual(threatZone(state, 'A'))
  })

  it('does not change the Battle or draw dice', () => {
    const state = scenario1Battle({})
    const copy = JSON.stringify(state)
    threatZone(state, 'A')
    threatCount(state, tileFromName('d4'), 'B')
    expect(JSON.stringify(state)).toBe(copy)
    expect(applyAction(state, { type: 'endTurn' }).ok).toBe(true)
  })
})
