import { describe, expect, it } from 'vitest'
import { tileFromName, tileName } from '@mt/shared'
import { applyAction, distance, distanceIn, legalActions, type BattleState, type DistanceMetric } from '../src/index.ts'
import { scenario1Battle } from './fixtures.ts'

// Experiment switch of phase 1.x ticket 20: how distance is measured, carried in the Battle's
// range rules. The game always plays Chebyshev; the other two metrics exist for the simulator.

/** Fangrel (move 4) alone on `from`, the others in the far corners, counting distance by `metric`. */
function fangrelAt(from: string, metric?: DistanceMetric): BattleState {
  return scenario1Battle({
    tiles: { A: ['e7', from, 'g7'], B: ['f6', 'g6', 'g5'] },
    ...(metric === undefined ? {} : { rangeRules: { distanceMetric: metric } }),
  })
}

const moveTargets = (state: BattleState): string[] =>
  legalActions(state)
    .flatMap((a) => (a.type === 'move' && a.unit === 'A.m1' ? [tileName(a.to)] : []))
    .sort()

const OCCUPIED = ['e7', 'g7', 'f6', 'g6', 'g5']
const tilesWhere = (from: string, within: (dx: number, dy: number) => boolean): string[] => {
  const origin = tileFromName(from)
  const names: string[] = []
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < 7; x++) {
      const dx = Math.abs(x - origin.x)
      const dy = Math.abs(y - origin.y)
      if (dx + dy > 0 && within(dx, dy) && !OCCUPIED.includes(tileName({ x, y }))) names.push(tileName({ x, y }))
    }
  return names.sort()
}

const o = { x: 0, y: 0 }

describe('distance metrics', () => {
  it('Chebyshev is the default, with or without a state', () => {
    const at = (x: number, y: number) => distance(o, { x, y })
    expect([at(3, 3), at(3, 1), at(0, 4)]).toEqual([3, 3, 4])
    expect(distanceIn(fangrelAt('a1'), o, { x: 3, y: 3 })).toBe(3)
  })

  it('orthogonal: |dx| + |dy|', () => {
    const d = (x: number, y: number) => distance(o, { x, y }, 'orthogonal')
    expect([d(1, 1), d(2, 3), d(0, 4), d(1, 0)]).toEqual([2, 5, 4, 1])
  })

  it('alternating: a diagonal costs 1, then 2 (max + floor(min / 2))', () => {
    const d = (x: number, y: number) => distance(o, { x, y }, 'alternating')
    expect([d(1, 1), d(2, 2), d(3, 3), d(4, 4), d(3, 1), d(2, 1), d(5, 0), d(0, 0)]).toEqual([1, 3, 4, 6, 3, 2, 5, 0])
  })

  const cases: readonly { metric: DistanceMetric; within: (dx: number, dy: number) => boolean }[] = [
    { metric: 'chebyshev', within: (dx, dy) => Math.max(dx, dy) <= 4 },
    { metric: 'orthogonal', within: (dx, dy) => dx + dy <= 4 },
    { metric: 'alternating', within: (dx, dy) => Math.max(dx, dy) + Math.floor(Math.min(dx, dy) / 2) <= 4 },
  ]
  for (const { metric, within } of cases) {
    it(`${metric}: a Move of 4 reaches exactly the tiles within distance 4`, () => {
      for (const from of ['a1', 'd4']) expect(moveTargets(fangrelAt(from, metric))).toEqual(tilesWhere(from, within))
    })
  }

  it('a Battle without the setting plays Chebyshev', () => {
    expect(moveTargets(fangrelAt('d4'))).toEqual(moveTargets(fangrelAt('d4', 'chebyshev')))
  })

  it('the engine accepts and rejects Moves by the metric of the Battle', () => {
    // d4 -> a1 is three diagonal steps: 1 under Chebyshev, 1+2+1 = 4 alternating, 6 orthogonally.
    const ok = (m: DistanceMetric, to: string) => applyAction(fangrelAt('d4', m), { type: 'move', unit: 'A.m1', to: tileFromName(to) }).ok
    expect(['chebyshev', 'orthogonal', 'alternating'].map((m) => ok(m as DistanceMetric, 'a1'))).toEqual([true, false, true])
    // d4 -> a4 is three steps along a row in every metric.
    expect(['chebyshev', 'orthogonal', 'alternating'].map((m) => ok(m as DistanceMetric, 'a4'))).toEqual([true, true, true])
  })
})
