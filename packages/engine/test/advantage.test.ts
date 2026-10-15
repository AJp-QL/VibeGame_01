import { describe, expect, it } from 'vitest'
import { ELEMENTS, tileFromName, type Element } from '@mt/shared'
import {
  applyAction,
  previewAction,
  type ApplyResult,
  type AttackPreview,
  type BattleEvent,
  type BattleState,
  type RollModeSource,
  type UnitId,
} from '../src/index.ts'
import { scenario1Battle, type BattleOptions } from './fixtures.ts'

// Crossroads (rules §2.2), the tiles used here:
//   forest b4 e7 · water a3 e1 g5 · mountain b2 · desert b6 f2 · light d3 · normal c3 c4 c5 c6 d6 …
// Scenario 1: A.m1 Fangrel (forest, Ground), A.m2 Wispling (mountain, Flying),
// B.m1 Tidewall (desert, Aquatic), B.m2 Quillfox (water, Ground). Tamers have no element.

type Tiles = readonly [string, string, string]

function battle(A: Tiles, B: Tiles, options: BattleOptions = {}): BattleState {
  return scenario1Battle({ tiles: { A, B }, ...options })
}

function preview(state: BattleState, unit: UnitId, target: UnitId): AttackPreview {
  const result = previewAction(state, { type: 'basicAttack', unit, target })
  if (!result.ok || result.preview?.type !== 'attack') throw new Error(result.ok ? 'no preview' : result.rejection.message)
  return result.preview
}

function attack(state: BattleState, unit: UnitId, target: UnitId): readonly BattleEvent[] {
  const result: ApplyResult = applyAction(state, { type: 'basicAttack', unit, target })
  if (!result.ok) throw new Error(result.rejection.message)
  return result.events
}

const rollsUsed = (events: readonly BattleEvent[]) => {
  const roll = events[0]
  return roll?.type === 'attackRolled' ? roll.rolls : []
}

const element = (effect: 'advantage' | 'disadvantage', attackerElement: Element, targetElement: Element) =>
  ({ kind: 'element', effect, attackerElement, targetElement }) as const

const terrain = (effect: 'advantage' | 'disadvantage', tile: Element, attackerElement: Element, aquatic = false) =>
  ({ kind: 'terrain', effect, terrain: tile, attackerElement, aquatic }) as const

const protection = (...protectors: UnitId[]) =>
  ({ kind: 'tamerProtection', effect: 'disadvantage', protectors, cancellableByCommand: false }) as const

describe('element wheel: every pair of elements (rules §4.1, §4.2, D-08)', () => {
  // Rules §4.1, written out: each element beats the next one.
  const WHEEL: readonly (readonly [Element, Element])[] = [
    ['forest', 'water'],
    ['water', 'mountain'],
    ['mountain', 'desert'],
    ['desert', 'forest'],
    ['light', 'dark'],
    ['dark', 'light'],
  ]
  const beats = (a: Element, b: Element) => WHEEL.some(([x, y]) => x === a && y === b)

  // Fangrel (A.m1) on c3 next to Tidewall (B.m1) on c4, both on normal tiles; elements set per pair.
  for (const attacker of ELEMENTS) {
    for (const target of ELEMENTS) {
      const sources: RollModeSource[] = []
      if (beats(attacker, target)) sources.push(element('advantage', attacker, target))
      if (beats(target, attacker)) sources.push(element('disadvantage', attacker, target))
      const mode = sources.length === 1 ? sources[0]!.effect : 'normal'
      it(`${attacker} attacking ${target}: ${mode}`, () => {
        const state = battle(['a1', 'c3', 'g1'], ['g7', 'c4', 'a7'], { elements: { 'A.m1': attacker, 'B.m1': target } })
        expect(preview(state, 'A.m1', 'B.m1')).toMatchObject({ rollMode: mode, rollModeSources: sources })
      })
    }
  }

  it('forest > water: Fangrel attacking Quillfox rolls two d20 and keeps the higher', () => {
    const state = battle(['a1', 'c3', 'g1'], ['g7', 'a7', 'c4'], { dice: { rolls: [3, 15, 5] } })
    const events = attack(state, 'A.m1', 'B.m2')
    expect(events[0]).toMatchObject({ rollMode: 'advantage', rolls: [3, 15], natural: 15, total: 17, hit: true })
  })

  it('desert > forest: Fangrel attacking Tidewall rolls two d20 and keeps the lower', () => {
    const state = battle(['a1', 'c3', 'g1'], ['g7', 'c4', 'a7'], { dice: { rolls: [15, 3] } })
    expect(attack(state, 'A.m1', 'B.m1')[0]).toMatchObject({ rollMode: 'disadvantage', rolls: [15, 3], natural: 3, hit: false })
  })

  it('light against dark cancels to a normal roll: one d20 (D-08)', () => {
    const state = battle(['a1', 'c3', 'g1'], ['g7', 'c4', 'a7'], {
      elements: { 'A.m1': 'light', 'B.m1': 'dark' },
      dice: { rolls: [9, 4] },
    })
    expect(attack(state, 'A.m1', 'B.m1')[0]).toMatchObject({ rollMode: 'normal', rolls: [9] })
  })

  it('a Tamer has no element: no element source attacking a Monster or being attacked by one', () => {
    // Tamer A on c3 next to Quillfox on c4; team A's Monsters away from Tamer A.
    const state = battle(['c3', 'g1', 'g2'], ['g7', 'a7', 'c4'])
    expect(preview(state, 'A.tamer', 'B.m2').rollModeSources).toEqual([])
    const bTurn = battle(['c3', 'g1', 'g2'], ['g7', 'a7', 'c4'], { firstSide: 'B' })
    expect(preview(bTurn, 'B.m2', 'A.tamer').rollModeSources).toEqual([])
  })
})

describe('terrain under the attacker (rules §4.3, §6.2, §6.3)', () => {
  // Fangrel (A.m1) attacks Tamer B next to it, so only terrain can count.
  const fangrelOn = (tile: string, tamerB: string, elements: BattleOptions['elements'] = {}) =>
    preview(battle(['g1', tile, 'g2'], [tamerB, 'g7', 'a7'], { elements }), 'A.m1', 'B.tamer').rollModeSources

  it('a Monster on a tile of its own element gets advantage: Fangrel on forest', () => {
    expect(fangrelOn('b4', 'c4')).toEqual([terrain('advantage', 'forest', 'forest')])
  })

  it('a Monster on a tile whose element beats its own gets disadvantage: Fangrel on desert', () => {
    expect(fangrelOn('b6', 'c6')).toEqual([terrain('disadvantage', 'desert', 'forest')])
  })

  it('a tile its own element beats, a neutral element or a normal tile does nothing', () => {
    expect(fangrelOn('a3', 'b3')).toEqual([]) // water: forest beats it
    expect(fangrelOn('d3', 'e3')).toEqual([]) // light: neutral to forest
    expect(fangrelOn('c3', 'c4')).toEqual([]) // normal
  })

  it('light and dark tiles work like the other elements', () => {
    expect(fangrelOn('d3', 'e3', { 'A.m1': 'light' })).toEqual([terrain('advantage', 'light', 'light')])
    expect(fangrelOn('d3', 'e3', { 'A.m1': 'dark' })).toEqual([terrain('disadvantage', 'light', 'dark')])
  })

  it('a Flying Monster gets nothing from terrain, either way', () => {
    // Wispling (mountain, Flying) on water, which beats mountain, and on mountain.
    const wisplingOn = (tile: string, tamerB: string) =>
      preview(battle(['g1', 'g2', tile], [tamerB, 'g7', 'a7']), 'A.m2', 'B.tamer').rollModeSources
    expect(wisplingOn('e1', 'f1')).toEqual([])
    expect(wisplingOn('b2', 'c2')).toEqual([])
    // A Ground Monster of the same element on the same water tile gets disadvantage.
    expect(fangrelOn('e1', 'f1', { 'A.m1': 'mountain' })).toEqual([terrain('disadvantage', 'water', 'mountain')])
  })

  describe('Aquatic: water counts as its own element', () => {
    // Team B's Turn: Tidewall (desert, Aquatic) attacks Tamer A next to it.
    const tidewallOn = (tile: string, tamerA: string) =>
      preview(battle([tamerA, 'a1', 'a3'], ['g7', tile, 'a7'], { firstSide: 'B' }), 'B.m1', 'A.tamer').rollModeSources

    it('Tidewall on water gets advantage, marked as Aquatic', () => {
      expect(tidewallOn('g5', 'f5')).toEqual([terrain('advantage', 'water', 'desert', true)])
    })

    it('Tidewall on desert gets advantage, on mountain disadvantage, on forest nothing', () => {
      expect(tidewallOn('f2', 'e2')).toEqual([terrain('advantage', 'desert', 'desert')])
      expect(tidewallOn('b2', 'c2')).toEqual([terrain('disadvantage', 'mountain', 'desert')])
      expect(tidewallOn('c1', 'd1')).toEqual([])
    })

    it('a water Monster that is not Aquatic gets the ordinary match: Quillfox on water', () => {
      const state = battle(['f1', 'a1', 'a3'], ['a7', 'g7', 'e1'], { firstSide: 'B' })
      expect(preview(state, 'B.m2', 'A.tamer').rollModeSources).toEqual([terrain('advantage', 'water', 'water')])
    })
  })

  it('a Tamer gets nothing from terrain: Tamer A on forest', () => {
    const state = battle(['b4', 'g1', 'g2'], ['g7', 'c4', 'a7'])
    expect(preview(state, 'A.tamer', 'B.m1').rollModeSources).toEqual([])
  })

  it('the tile counts where the attacker stands when it rolls: Move onto forest, then attack', () => {
    const state = battle(['g1', 'c3', 'g2'], ['c4', 'g7', 'a7'], { dice: { rolls: [5, 16, 3] } })
    expect(preview(state, 'A.m1', 'B.tamer').rollMode).toBe('normal')
    const moved = applyAction(state, { type: 'move', unit: 'A.m1', to: tileFromName('b4') })
    if (!moved.ok) throw new Error(moved.rejection.message)
    expect(preview(moved.state, 'A.m1', 'B.tamer').rollMode).toBe('advantage')
    expect(attack(moved.state, 'A.m1', 'B.tamer')[0]).toMatchObject({ rollMode: 'advantage', rolls: [5, 16], natural: 16 })
  })
})

describe('several sources: no stacking, advantage and disadvantage cancel (rules §5.2)', () => {
  it('two advantages are one advantage: two d20, not three', () => {
    // Fangrel on forest (b4) attacking Quillfox (water) on c4.
    const state = battle(['g1', 'b4', 'g2'], ['g7', 'a7', 'c4'], { dice: { rolls: [4, 9, 1] } })
    const p = preview(state, 'A.m1', 'B.m2')
    expect(p.rollModeSources).toEqual([element('advantage', 'forest', 'water'), terrain('advantage', 'forest', 'forest')])
    expect(p.rollMode).toBe('advantage')
    const events = attack(state, 'A.m1', 'B.m2')
    expect(rollsUsed(events)).toEqual([4, 9])
    expect(events[1]).toMatchObject({ type: 'damageDealt', rolls: [1] })
  })

  it('two disadvantages are one disadvantage', () => {
    // Fangrel on desert (b6) attacking Tidewall (desert) on c6.
    const state = battle(['g1', 'b6', 'g2'], ['g7', 'c6', 'a7'], { dice: { rolls: [15, 4] } })
    const p = preview(state, 'A.m1', 'B.m1')
    expect(p.rollModeSources).toEqual([element('disadvantage', 'forest', 'desert'), terrain('disadvantage', 'desert', 'forest')])
    expect(p.rollMode).toBe('disadvantage')
    expect(attack(state, 'A.m1', 'B.m1')[0]).toMatchObject({ rolls: [15, 4], natural: 4, hit: false })
  })

  it('one advantage and one disadvantage cancel to a normal roll', () => {
    // Fangrel on desert (b6) attacking Quillfox (water) on c6.
    const state = battle(['g1', 'b6', 'g2'], ['g7', 'a7', 'c6'], { dice: { rolls: [9, 3] } })
    const p = preview(state, 'A.m1', 'B.m2')
    expect(p.rollModeSources).toEqual([element('advantage', 'forest', 'water'), terrain('disadvantage', 'desert', 'forest')])
    expect(p.rollMode).toBe('normal')
    expect(p.hitChance).toEqual({ numerator: 12, denominator: 20 })
    expect(attack(state, 'A.m1', 'B.m2')[0]).toMatchObject({ rollMode: 'normal', rolls: [9] })
  })

  it('one advantage against two disadvantages still cancels, however many on each side', () => {
    // A dark Fangrel on light (d3) attacking a light Tidewall on c4: element both ways, terrain disadvantage.
    const state = battle(['g1', 'd3', 'g2'], ['g7', 'c4', 'a7'], { elements: { 'A.m1': 'dark', 'B.m1': 'light' } })
    const p = preview(state, 'A.m1', 'B.m1')
    expect(p.rollModeSources).toEqual([
      element('advantage', 'dark', 'light'),
      element('disadvantage', 'dark', 'light'),
      terrain('disadvantage', 'light', 'dark'),
    ])
    expect(p.rollMode).toBe('normal')
  })
})

describe('Tamer protection: disadvantage against a Tamer with an allied Monster adjacent (rules §9)', () => {
  // Tamer B on d6, Tidewall on e6 next to it; Fangrel on c5 (normal tile) next to Tamer B.
  const PROTECTED = { A: ['a1', 'c5', 'g1'], B: ['d6', 'e6', 'a7'] } as const

  it('an enemy Monster attacking the Tamer gets disadvantage, Command cannot cancel it', () => {
    const p = preview(battle(PROTECTED.A, PROTECTED.B), 'A.m1', 'B.tamer')
    expect(p.rollModeSources).toEqual([protection('B.m1')])
    expect(p.rollMode).toBe('disadvantage')
  })

  it('two allied Monsters adjacent are still one source, listing both', () => {
    const p = preview(battle(PROTECTED.A, ['d6', 'e6', 'c7']), 'A.m1', 'B.tamer')
    expect(p.rollModeSources).toEqual([protection('B.m1', 'B.m2')])
  })

  it('no allied Monster adjacent: no protection; an enemy Monster adjacent does not protect', () => {
    const p = preview(battle(PROTECTED.A, ['d6', 'g4', 'a7']), 'A.m1', 'B.tamer')
    expect(p.rollModeSources).toEqual([])
    expect(p.rollMode).toBe('normal')
  })

  it('applies at any range, and the protected Tamer can still be targeted (rules §8.1)', () => {
    // Fangrel on d2, Tamer B 4 tiles away on d6 (line d3–d5 clear), Basic Attack reaching 4.
    const state = battle(['a1', 'd2', 'g1'], ['d6', 'e6', 'a7'], { skills: { basic_attack: { range: 4 } } })
    expect(preview(state, 'A.m1', 'B.tamer')).toMatchObject({ distance: 4, rollModeSources: [protection('B.m1')] })
  })

  it('a Flying attacker and an attacking Tamer get it too', () => {
    expect(preview(battle(['a1', 'g1', 'c5'], PROTECTED.B), 'A.m2', 'B.tamer').rollModeSources).toEqual([protection('B.m1')])
    expect(preview(battle(['c5', 'a1', 'g1'], PROTECTED.B), 'A.tamer', 'B.tamer').rollModeSources).toEqual([
      protection('B.m1'),
    ])
  })

  it('the attack roll keeps the lower of two d20', () => {
    const state = battle(PROTECTED.A, PROTECTED.B, { dice: { rolls: [18, 7] } })
    expect(attack(state, 'A.m1', 'B.tamer')[0]).toMatchObject({ rollMode: 'disadvantage', rolls: [18, 7], natural: 7, total: 9, hit: false })
  })

  it('terrain advantage cancels it (rules §5.3 example): Fangrel on forest gets a normal roll', () => {
    // Fangrel on e7 (forest) next to Tamer B on d7, Tidewall on c6 next to the Tamer.
    const state = battle(['a1', 'e7', 'g1'], ['d7', 'c6', 'a5'], { dice: { rolls: [12, 2] } })
    const p = preview(state, 'A.m1', 'B.tamer')
    expect(p.rollModeSources).toEqual([terrain('advantage', 'forest', 'forest'), protection('B.m1')])
    expect(p.rollMode).toBe('normal')
    expect(attack(state, 'A.m1', 'B.tamer')[0]).toMatchObject({ rollMode: 'normal', rolls: [12] })
  })
})

describe('preview with advantage or disadvantage: exact odds over 400 pairs (rules §21.1)', () => {
  // Fangrel (+2) against Tamer B (Guard 11): a kept face of 9 or more hits, 1 never, 20 always.
  const cases = [
    // Fangrel on forest (b4): advantage. Hits unless both d20 are 1–8: 400 − 64. Critical unless neither is 20: 400 − 361.
    { mode: 'advantage', A: ['g1', 'b4', 'g2'], B: ['c4', 'g7', 'a7'], hits: 336, criticals: 39 },
    // Fangrel on desert (b6): disadvantage. Both d20 must be 9–20: 12 × 12. Critical only on 20 and 20.
    { mode: 'disadvantage', A: ['g1', 'b6', 'g2'], B: ['c6', 'g7', 'a7'], hits: 144, criticals: 1 },
  ] as const

  for (const { mode, A, B, hits, criticals } of cases) {
    it(`${mode}: hit ${hits}/400 and critical ${criticals}/400, the same as applyAction over every pair`, () => {
      const p = preview(battle(A, B), 'A.m1', 'B.tamer')
      expect(p).toMatchObject({
        rollMode: mode,
        hitChance: { numerator: hits, denominator: 400 },
        criticalChance: { numerator: criticals, denominator: 400 },
      })
      let hitPairs = 0
      let criticalPairs = 0
      for (let first = 1; first <= 20; first++) {
        for (let second = 1; second <= 20; second++) {
          const events = attack(battle(A, B, { dice: { rolls: [first, second, 1, 1] } }), 'A.m1', 'B.tamer')
          const roll = events[0]
          if (roll?.type !== 'attackRolled') throw new Error('expected an attack roll')
          if (roll.hit) hitPairs++
          if (roll.critical) criticalPairs++
        }
      }
      expect([hitPairs, criticalPairs]).toEqual([hits, criticals])
    })
  }

  it('the preview with advantage draws no dice and changes nothing', () => {
    const state = battle(['g1', 'b4', 'g2'], ['c4', 'g7', 'a7'], { dice: { rolls: [4, 9, 1] } })
    const before = structuredClone(state)
    preview(state, 'A.m1', 'B.tamer')
    expect(state).toEqual(before)
    expect(attack(state, 'A.m1', 'B.tamer')[0]).toMatchObject({ rolls: [4, 9] })
  })
})
