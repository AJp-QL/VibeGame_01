import { describe, expect, it } from 'vitest'
import { tileFromName } from '@mt/shared'
import { applyAction, GAME_RANGE_RULES, LINE_OF_SIGHT_FROM, legalActions, NO_RANGE_RULES, previewAction, type Action, type AttackPreview, type BattleState } from '../src/index.ts'
import { arena, gameData, NEUTRAL_ELEMENTS, scenario1Battle } from './fixtures.ts'

// Experiment switches of phase 1.x ticket 08: a long-range disadvantage and terrain that
// blocks line of sight. Both are off in the game; the simulator turns them on to measure.

const longShot = (target: string): Action => ({ type: 'useSkill', unit: 'B.m2', skill: 'long_shot', target })

function attackPreview(state: BattleState, action: Action): AttackPreview {
  const result = previewAction(state, action)
  if (!result.ok || result.preview?.type !== 'attack') throw new Error(result.ok ? 'not an attack preview' : result.rejection.message)
  return result.preview
}

// Quillfox (B.m2) with Long Shot (range 4) on c6 shoots up column c at Fangrel (A.m1), every Monster forest
// (neutral element). Column c is plain from c2 to c6, so no terrain gives either side an advantage.
const at = (distance: number) => ({ A: ['g1', `c${6 - distance}`, 'g2'], B: ['g7', 'g6', 'c6'] }) as const

describe('long-range disadvantage (variant b)', () => {
  const rules = { longRangeDisadvantageFrom: 4 }

  it('the rule tests play without it (the kit): an attack at range 4 rolls normally', () => {
    const state = scenario1Battle({ firstSide: 'B', tiles: at(4), elements: NEUTRAL_ELEMENTS })
    expect(state.rangeRules).toEqual({})
    const preview = attackPreview(state, longShot('A.m1'))
    expect(preview.distance).toBe(4)
    expect(preview.rollMode).toBe('normal')
    expect(preview.longRangeDisadvantage).toBeUndefined()
  })

  it('from the given distance an attack roll has disadvantage', () => {
    const state = scenario1Battle({ firstSide: 'B', tiles: at(4), elements: NEUTRAL_ELEMENTS, rangeRules: rules })
    const preview = attackPreview(state, longShot('A.m1'))
    expect(preview.rollMode).toBe('disadvantage')
    expect(preview.longRangeDisadvantage).toBe(true)
    expect(preview.hitChance.numerator / preview.hitChance.denominator).toBeLessThan(
      attackPreview(scenario1Battle({ firstSide: 'B', tiles: at(4), elements: NEUTRAL_ELEMENTS }), longShot('A.m1')).hitChance.numerator /
        attackPreview(scenario1Battle({ firstSide: 'B', tiles: at(4), elements: NEUTRAL_ELEMENTS }), longShot('A.m1')).hitChance.denominator,
    )
  })

  it('a shorter distance is unaffected', () => {
    const state = scenario1Battle({ firstSide: 'B', tiles: at(3), elements: NEUTRAL_ELEMENTS, rangeRules: rules })
    const preview = attackPreview(state, longShot('A.m1'))
    expect(preview.distance).toBe(3)
    expect(preview.rollMode).toBe('normal')
    expect(preview.longRangeDisadvantage).toBeUndefined()
  })

  it('cancels an advantage like any other disadvantage (rules §5.2), and does not stack on one', () => {
    // Forest beats water on the wheel: Quillfox as a forest Monster shooting a water Monster has advantage.
    const forestShooter = { ...NEUTRAL_ELEMENTS, 'B.m2': 'forest' as const, 'A.m1': 'water' as const }
    expect(attackPreview(scenario1Battle({ firstSide: 'B', tiles: at(4), elements: forestShooter }), longShot('A.m1')).rollMode).toBe('advantage')
    expect(attackPreview(scenario1Battle({ firstSide: 'B', tiles: at(4), elements: forestShooter, rangeRules: rules }), longShot('A.m1')).rollMode).toBe('normal')
    // The other way round it already has disadvantage; the rule adds no second one.
    const waterShooter = { ...NEUTRAL_ELEMENTS, 'B.m2': 'water' as const, 'A.m1': 'forest' as const }
    expect(attackPreview(scenario1Battle({ firstSide: 'B', tiles: at(4), elements: waterShooter }), longShot('A.m1')).rollMode).toBe('disadvantage')
    expect(attackPreview(scenario1Battle({ firstSide: 'B', tiles: at(4), elements: waterShooter, rangeRules: rules }), longShot('A.m1')).rollMode).toBe('disadvantage')
  })

  it('the rolled attack uses the disadvantage: two d20s are drawn', () => {
    const state = scenario1Battle({ firstSide: 'B', tiles: at(4), elements: NEUTRAL_ELEMENTS, rangeRules: rules, dice: { rolls: [18, 2, 5] } })
    const result = applyAction(state, longShot('A.m1'))
    if (!result.ok) throw new Error(result.rejection.message)
    expect(result.events[1]).toMatchObject({ type: 'attackRolled', rollMode: 'disadvantage', rolls: [18, 2], natural: 2 })
  })
})

describe('terrain that blocks sight (variant c)', () => {
  // Crossroads has mountain on b2 and f6. Quillfox on c3 shoots Fangrel on a1: the line passes b2.
  const tiles = { A: ['g1', 'a1', 'g2'], B: ['g7', 'g6', 'c3'] } as const
  const shots = (state: BattleState) => legalActions(state).filter((a) => a.type === 'useSkill' && a.skill === 'long_shot' && a.target === 'A.m1')

  it('the game is unchanged: terrain never blocks', () => {
    const state = scenario1Battle({ tiles, elements: NEUTRAL_ELEMENTS, firstSide: 'B' })
    expect(shots(state)).toHaveLength(1)
  })

  it('with mountain blocking sight the shot is refused, with no Unit to name', () => {
    const state = scenario1Battle({ tiles, elements: NEUTRAL_ELEMENTS, firstSide: 'B', rangeRules: { sightBlockedBy: ['mountain'] } })
    expect(shots(state)).toHaveLength(0)
    const result = previewAction(state, longShot('A.m1'))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.rejection.code).toBe('no-line-of-sight')
      expect(result.rejection.blockedBy).toEqual([])
      // The mountain on b2 is named, so the UI need not guess that "no Unit" means terrain.
      expect(result.rejection.blockedByTerrain).toEqual([tileFromName('b2')])
    }
  })

  it('when a Unit and a mountain both stand on the line, the rejection names both', () => {
    // A.m2 stands on the mountain b2, which is the only tile between c3 and a1.
    const both = { A: ['g1', 'a1', 'b2'], B: ['g7', 'g6', 'c3'] } as const
    const state = scenario1Battle({ tiles: both, elements: NEUTRAL_ELEMENTS, firstSide: 'B', rangeRules: { sightBlockedBy: ['mountain'] } })
    const result = previewAction(state, longShot('A.m1'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.rejection).toMatchObject({ code: 'no-line-of-sight', blockedBy: ['A.m2'], blockedByTerrain: [tileFromName('b2')] })
  })

  it('a Unit-only block names no terrain', () => {
    const unitOnly = { A: ['g1', 'a1', 'b2'], B: ['g7', 'g6', 'c3'] } as const
    const state = scenario1Battle({ tiles: unitOnly, elements: NEUTRAL_ELEMENTS, firstSide: 'B' })
    const result = previewAction(state, longShot('A.m1'))
    expect(result.ok === false && result.rejection.blockedByTerrain).toEqual([])
  })

  it('line of sight is checked from distance 2, a value the engine exports', () => {
    expect(LINE_OF_SIGHT_FROM).toBe(2)
  })

  it('other terrain on the line does not block when only mountain does', () => {
    const state = scenario1Battle({ tiles, elements: NEUTRAL_ELEMENTS, firstSide: 'B', rangeRules: { sightBlockedBy: ['dark'] } })
    expect(shots(state)).toHaveLength(1)
  })

  it('a target next to the shooter is never blocked (line of sight is checked from 2)', () => {
    const near = { A: ['g1', 'b2', 'g2'], B: ['g7', 'g6', 'c3'] } as const
    const state = scenario1Battle({ tiles: near, elements: NEUTRAL_ELEMENTS, firstSide: 'B', rangeRules: { sightBlockedBy: ['mountain'] } })
    expect(shots(state)).toHaveLength(1)
  })

  it('a Flying attacker sees over terrain as over Units', () => {
    // Wispling (A.m2, Flying) on c3 with Element Bolt (range 4) at Tidewall on a1: same line over the mountain on b2.
    const flying = { A: ['g1', 'g2', 'c3'], B: ['g7', 'a1', 'g6'] } as const
    const state = scenario1Battle({ tiles: flying, elements: NEUTRAL_ELEMENTS, rangeRules: { sightBlockedBy: ['mountain'] } })
    const bolts = legalActions(state).filter((a) => a.type === 'useSkill' && a.skill === 'element_bolt' && a.target === 'B.m1')
    expect(bolts).toHaveLength(1)
  })

  it('the Unit-blocking rule still holds next to the terrain rule', () => {
    expect(tileFromName('b2')).toEqual({ x: 1, y: 1 })
    const withBlocker = { A: ['g1', 'a1', 'b2'], B: ['g7', 'g6', 'c3'] } as const
    const state = scenario1Battle({ tiles: withBlocker, elements: NEUTRAL_ELEMENTS, firstSide: 'B', rangeRules: { sightBlockedBy: ['mountain'] } })
    const result = previewAction(state, longShot('A.m1'))
    expect(result.ok === false && result.rejection.blockedBy).toEqual(['A.m2'])
  })
})

describe("the rules of the game (ticket 09, D-31): the data and the rules together", () => {
  const real = { realRules: true, elements: NEUTRAL_ELEMENTS } as const
  // Quillfox (B.m2) on g7 shoots up column g at Fangrel (A.m1): no mountain on that column.
  const atG = (distance: number) => ({ A: ['a1', `g${7 - distance}`, 'b1'], B: ['a7', 'b7', 'g7'] }) as const

  it('a Battle plays with the range rules unless told otherwise', () => {
    expect(GAME_RANGE_RULES).toEqual({ longRangeDisadvantageFrom: 4, sightBlockedBy: ['mountain'] })
    expect(scenario1Battle({ ...real, tiles: atG(3) }).rangeRules).toEqual(GAME_RANGE_RULES)
    expect(scenario1Battle({ ...real, tiles: atG(3), rangeRules: NO_RANGE_RULES }).rangeRules).toEqual({})
  })

  it('data: Long Shot, Element Bolt and Pin reach 3 and Mark 4', () => {
    expect(['long_shot', 'element_bolt', 'pin', 'mark'].map((id) => gameData.skills[id]?.range)).toEqual([3, 3, 3, 4])
  })

  it('data: both Boards have four more mountains than before, in pairs that look the same after a turn', () => {
    const mountains = (id: string) => gameData.boards[id]!.terrain.flat().filter((t) => t === 'mountain').length
    expect(mountains('crossroads')).toBe(2 + 4)
    expect(mountains('shallows')).toBe(2 + 4)
    expect(gameData.boards.crossroads!.terrain[2]![2]).toBe('mountain')
    expect(gameData.boards.shallows!.terrain[3]![1]).toBe('mountain')
  })

  it('Long Shot no longer reaches 4; Mark does, with disadvantage', () => {
    const state = scenario1Battle({ ...real, firstSide: 'B', tiles: atG(4) })
    const options = legalActions(state).filter((a) => a.type === 'useSkill' && a.target === 'A.m1')
    expect(options.map((a) => a.type === 'useSkill' && a.skill)).toEqual(['mark'])
    const mark = attackPreview(state, { type: 'useSkill', unit: 'B.m2', skill: 'mark', target: 'A.m1' })
    expect(mark.distance).toBe(4)
    expect(mark.rollMode).toBe('disadvantage')
    expect(mark.longRangeDisadvantage).toBe(true)
  })

  it('Long Shot at 3 rolls normally', () => {
    const state = scenario1Battle({ ...real, firstSide: 'B', tiles: atG(3) })
    const preview = attackPreview(state, longShot('A.m1'))
    expect(preview.distance).toBe(3)
    expect(preview.rollMode).toBe('normal')
  })

  it('a mountain on the line blocks the shot: Crossroads c3 now stands between c1 and c4', () => {
    // Quillfox on c1 shoots at Fangrel on c4 (distance 3): the line passes c2 and c3, and c3 is a mountain.
    const tiles = { A: ['g1', 'c4', 'g2'], B: ['g7', 'g6', 'c1'] } as const
    const state = scenario1Battle({ ...real, firstSide: 'B', tiles })
    const result = previewAction(state, longShot('A.m1'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.rejection).toMatchObject({ code: 'no-line-of-sight', blockedBy: [] })
  })

  it('a Unit standing on a mountain is not blocked by its own tile, and sees along the open lines', () => {
    // Quillfox stands on the mountain c3 and shoots up column c at c1 (distance 2, c2 is plain).
    const tiles = { A: ['g1', 'c1', 'g2'], B: ['g7', 'g6', 'c3'] } as const
    const state = scenario1Battle({ ...real, firstSide: 'B', tiles })
    expect(previewAction(state, longShot('A.m1')).ok).toBe(true)
  })

  it('Wispling flies over mountains', () => {
    const tiles = { A: ['g1', 'g2', 'c1'], B: ['g7', 'c4', 'g6'] } as const
    const state = scenario1Battle({ ...real, tiles })
    const bolts = legalActions(state).filter((a) => a.type === 'useSkill' && a.skill === 'element_bolt' && a.target === 'B.m1')
    expect(bolts).toHaveLength(1)
  })

  it('the 9x9 test Board is unaffected: the rules need no Board data', () => {
    expect(arena.terrain).toHaveLength(9)
  })
})

