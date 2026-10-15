import { describe, expect, it } from 'vitest'
import { BOARD_SIZE, tileFromName, tileName, type Side } from '@mt/shared'
import {
  applyAction,
  legalActions,
  lineOfSightTiles,
  previewAction,
  type Action,
  type BattleState,
  type UnitId,
} from '../src/index.ts'
import { scenario1Battle, type BattleOptions } from './fixtures.ts'

// Rules §7.3: the line from the user's tile to the target's tile, without
// either end. The table is the test vector set of the rules document.
const VECTORS: readonly (readonly [string, string, readonly string[]])[] = [
  ['a1', 'c2', ['b2']],
  ['c2', 'a1', ['b1']],
  ['a1', 'e2', ['b1', 'c2', 'd2']],
  ['e2', 'a1', ['d2', 'c1', 'b1']],
  ['a1', 'b4', ['a2', 'b3']],
  ['a1', 'c5', ['b2', 'b3', 'c4']],
  ['c5', 'a1', ['b4', 'b3', 'a2']],
  ['d1', 'd7', ['d2', 'd3', 'd4', 'd5', 'd6']],
  ['a1', 'g7', ['b2', 'c3', 'd4', 'e5', 'f6']],
  ['c7', 'g6', ['d7', 'e6', 'f6']],
  ['g6', 'c7', ['f6', 'e7', 'd7']],
  ['b2', 'f5', ['c3', 'd4', 'e4']],
  ['f5', 'b2', ['e4', 'd3', 'c3']],
]

/** Basic Attack reaching 6 tiles, so every vector is in range (ranges are data, spec "Data"). */
const LONG_REACH = { basic_attack: { range: 6 } } as const

const ALL_TILES = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) =>
  tileName({ x: i % BOARD_SIZE, y: Math.floor(i / BOARD_SIZE) }),
)

/**
 * A Battle with `placed` Units on the given tiles and every other Unit parked
 * on the first free tiles not in `avoid` (so off the line being tested).
 */
function battleWith(placed: Readonly<Record<UnitId, string>>, avoid: readonly string[], options: BattleOptions = {}) {
  const taken = new Set([...Object.values(placed), ...avoid])
  const free = ALL_TILES.filter((t) => !taken.has(t))
  const tileOf = (id: UnitId) => placed[id] ?? free.shift()!
  const team = (side: Side) => [tileOf(`${side}.tamer`), tileOf(`${side}.m1`), tileOf(`${side}.m2`)] as const
  return scenario1Battle({ tiles: { A: team('A'), B: team('B') }, skills: LONG_REACH, ...options })
}

const attackAction = (unit: UnitId, target: UnitId): Action => ({ type: 'basicAttack', unit, target })

function canAttack(state: BattleState, unit: UnitId, target: UnitId): boolean {
  return legalActions(state).some((a) => a.type === 'basicAttack' && a.unit === unit && a.target === target)
}

describe('line of sight: the tiles the line passes (rules §7.3 test vectors)', () => {
  for (const [from, to, passes] of VECTORS) {
    it(`${from} → ${to} passes ${passes.join(', ')}`, () => {
      expect(lineOfSightTiles(tileFromName(from), tileFromName(to)).map(tileName)).toEqual(passes)
    })
  }

  it('neighbouring tiles have nothing between them (distance 1 is never checked, rules §7.1)', () => {
    for (const to of ['c3', 'd3', 'e3', 'e4', 'e5', 'd5', 'c5', 'c4']) {
      expect(lineOfSightTiles(tileFromName('d4'), tileFromName(to))).toEqual([])
    }
  })
})

describe('line of sight in attacks: any Unit on the line blocks (rules §7.2, §8.1)', () => {
  for (const [from, to, passes] of VECTORS) {
    it(`Fangrel on ${from} attacking Tidewall on ${to}: clear line is legal, a Unit on ${passes.join(' or ')} blocks`, () => {
      const avoid = [from, to, ...passes]
      const clear = battleWith({ 'A.m1': from, 'B.m1': to }, avoid)
      expect(canAttack(clear, 'A.m1', 'B.m1')).toBe(true)
      expect(previewAction(clear, attackAction('A.m1', 'B.m1')).ok).toBe(true)

      passes.forEach((tile, i) => {
        // Allies block as well as enemies: alternate team A's Tamer and team B's Quillfox.
        const blocker = i % 2 === 0 ? 'A.tamer' : 'B.m2'
        const state = battleWith({ 'A.m1': from, 'B.m1': to, [blocker]: tile }, avoid)
        const before = structuredClone(state)
        const result = applyAction(state, attackAction('A.m1', 'B.m1'))
        expect(result).toMatchObject({ ok: false, rejection: { code: 'no-line-of-sight', blockedBy: [blocker] } })
        expect(result.state).toBe(state)
        expect(state).toEqual(before)
        expect(previewAction(state, attackAction('A.m1', 'B.m1'))).toEqual({
          ok: false,
          rejection: !result.ok && result.rejection,
        })
        expect(canAttack(state, 'A.m1', 'B.m1')).toBe(false)
      })
    })
  }

  it('lists every Unit on the line, in the order the line meets them', () => {
    const state = battleWith({ 'A.m1': 'd1', 'B.m1': 'd7', 'B.m2': 'd5', 'A.tamer': 'd3' }, ['d2', 'd4', 'd6'])
    expect(applyAction(state, attackAction('A.m1', 'B.m1'))).toMatchObject({
      ok: false,
      rejection: { code: 'no-line-of-sight', blockedBy: ['A.tamer', 'B.m2'] },
    })
  })

  it('terrain does not block (rules §7.2): the line d1 → d7 crosses light, dark and light tiles', () => {
    const state = battleWith({ 'A.m1': 'd1', 'B.m1': 'd7' }, ['d2', 'd3', 'd4', 'd5', 'd6'])
    expect(canAttack(state, 'A.m1', 'B.m1')).toBe(true)
  })

  it('the line runs from attacker to target, so it is not symmetric (D-01)', () => {
    // a1 → c2 passes b2; c2 → a1 passes b1. A Unit on b2 blocks only one way.
    const blocked = battleWith({ 'A.m1': 'a1', 'B.m1': 'c2', 'A.tamer': 'b2' }, ['b1'])
    expect(canAttack(blocked, 'A.m1', 'B.m1')).toBe(false)
    const otherWay = battleWith({ 'A.m1': 'c2', 'B.m1': 'a1', 'A.tamer': 'b2' }, ['b1'])
    expect(canAttack(otherWay, 'A.m1', 'B.m1')).toBe(true)
  })

  it('a Flying attacker ignores Units on the line (rules §6.2, §7.1)', () => {
    // Wispling (A.m2, Flying) on d1; Tidewall on d4; Tamer A on d2 and Quillfox on d3 in between.
    const state = battleWith({ 'A.m2': 'd1', 'B.m1': 'd4', 'A.tamer': 'd2', 'B.m2': 'd3' }, [])
    expect(canAttack(state, 'A.m2', 'B.m1')).toBe(true)
    expect(applyAction(state, attackAction('A.m2', 'B.m1')).ok).toBe(true)
    // The same line blocks a Ground attacker.
    const ground = battleWith({ 'A.m1': 'd1', 'B.m1': 'd4', 'A.tamer': 'd2', 'B.m2': 'd3' }, [])
    expect(applyAction(ground, attackAction('A.m1', 'B.m1'))).toMatchObject({
      rejection: { code: 'no-line-of-sight', blockedBy: ['A.tamer', 'B.m2'] },
    })
  })

  it('a Flying target can still be blocked (rules §6.2)', () => {
    // Team B's Turn: Quillfox (Ground) on d7 aims at Wispling on d4 past Tidewall on d5.
    const state = battleWith({ 'B.m2': 'd7', 'A.m2': 'd4', 'B.m1': 'd5' }, ['d6'], { firstSide: 'B' })
    expect(applyAction(state, attackAction('B.m2', 'A.m2'))).toMatchObject({
      ok: false,
      rejection: { code: 'no-line-of-sight', blockedBy: ['B.m1'] },
    })
    const clear = battleWith({ 'B.m2': 'd7', 'A.m2': 'd4', 'B.m1': 'a5' }, ['d5', 'd6'], { firstSide: 'B' })
    expect(canAttack(clear, 'B.m2', 'A.m2')).toBe(true)
  })

  it('at distance 1 nothing is checked: a diagonal neighbour is always in sight', () => {
    const state = battleWith({ 'A.m1': 'c3', 'B.m1': 'd4', 'A.tamer': 'd3', 'B.m2': 'c4' }, [])
    expect(canAttack(state, 'A.m1', 'B.m1')).toBe(true)
  })
})
