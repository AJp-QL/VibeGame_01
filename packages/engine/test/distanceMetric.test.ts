import { describe, expect, it } from 'vitest'
import { tileFromName, tileName } from '@mt/shared'
import { applyAction, distance, legalActions, withDistanceMetric, type BattleState, type DistanceMetric } from '../src/index.ts'
import { scenario1Battle } from './fixtures.ts'

// Experiment switch of phase 1.x ticket 20: how distance is measured. The game always plays
// Chebyshev; the other two metrics exist for the simulator and are scoped to one call.

const FAR = { A: ['e7', 'f7', 'g7'], B: ['f6', 'g6', 'g5'] } as const

/** Fangrel (move 4) alone on `from`, everyone else in the far corner. */
function fangrelAt(from: string): BattleState {
  return scenario1Battle({ tiles: { A: ['e7', from, 'g7'], B: FAR.B } })
}

const moveTargets = (state: BattleState): string[] =>
  legalActions(state)
    .flatMap((a) => (a.type === 'move' && a.unit === 'A.m1' ? [tileName(a.to)] : []))
    .sort()

const tilesWhere = (from: string, within: (dx: number, dy: number) => boolean): string[] => {
  const origin = tileFromName(from)
  const names: string[] = []
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < 7; x++) {
      const dx = Math.abs(x - origin.x)
      const dy = Math.abs(y - origin.y)
      if (dx + dy > 0 && within(dx, dy) && !['e7', 'g7', 'f6', 'g6', 'g5'].includes(tileName({ x, y }))) names.push(tileName({ x, y }))
    }
  return names.sort()
}

const a = { x: 0, y: 0 }

describe('distance metrics', () => {
  it('Chebyshev is the default and is back after a run, even one that throws', () => {
    const at = (x: number, y: number) => distance(a, { x, y })
    expect([at(3, 3), at(3, 1), at(0, 4)]).toEqual([3, 3, 4])
    withDistanceMetric('orthogonal', () => expect(at(3, 3)).toBe(6))
    expect(at(3, 3)).toBe(3)
    expect(() =>
      withDistanceMetric('alternating', () => {
        throw new Error('boom')
      }),
    ).toThrow('boom')
    expect(at(3, 3)).toBe(3)
  })

  it('orthogonal: |dx| + |dy|', () => {
    const d = (x: number, y: number) => withDistanceMetric('orthogonal', () => distance(a, { x, y }))
    expect([d(1, 1), d(2, 3), d(0, 4), d(1, 0)]).toEqual([2, 5, 4, 1])
  })

  it('alternating: a diagonal costs 1, then 2 (max + floor(min / 2))', () => {
    const d = (x: number, y: number) => withDistanceMetric('alternating', () => distance(a, { x, y }))
    expect([d(1, 1), d(2, 2), d(3, 3), d(4, 4), d(3, 1), d(2, 1), d(5, 0), d(0, 0)]).toEqual([1, 3, 4, 6, 3, 2, 5, 0])
  })

  const cases: readonly { metric: DistanceMetric; within: (dx: number, dy: number) => boolean }[] = [
    { metric: 'chebyshev', within: (dx, dy) => Math.max(dx, dy) <= 4 },
    { metric: 'orthogonal', within: (dx, dy) => dx + dy <= 4 },
    { metric: 'alternating', within: (dx, dy) => Math.max(dx, dy) + Math.floor(Math.min(dx, dy) / 2) <= 4 },
  ]
  for (const { metric, within } of cases) {
    it(`${metric}: a Move of 4 reaches exactly the tiles within distance 4`, () => {
      for (const from of ['a1', 'd4']) {
        withDistanceMetric(metric, () => expect(moveTargets(fangrelAt(from))).toEqual(tilesWhere(from, within)))
      }
    })
  }

  it('the engine accepts and rejects Moves by the metric in play', () => {
    const state = fangrelAt('d4')
    // d4 -> g7 area is occupied; d4 -> a1 is 3 away: one diagonal run of 3 (cost 1+2+1 = 4) under alternating, 6 orthogonally.
    const to = (m: DistanceMetric) => withDistanceMetric(m, () => applyAction(state, { type: 'move', unit: 'A.m1', to: tileFromName('a1') }).ok)
    expect([to('chebyshev'), to('orthogonal'), to('alternating')]).toEqual([true, false, true])
    const far = (m: DistanceMetric) => withDistanceMetric(m, () => applyAction(state, { type: 'move', unit: 'A.m1', to: tileFromName('a4') }).ok)
    // d4 -> a4 is three steps along a row in every metric.
    expect([far('chebyshev'), far('orthogonal'), far('alternating')]).toEqual([true, true, true])
  })
})
