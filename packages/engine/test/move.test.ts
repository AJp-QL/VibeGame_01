import { describe, expect, it } from 'vitest'
import { tileFromName, tileName } from '@mt/shared'
import {
  applyAction,
  derivedValues,
  distance,
  legalActions,
  type ApplyResult,
  type BattleState,
  type UnitId,
} from '../src/index.ts'
import { scenario1Battle } from './fixtures.ts'

/** Tile names the Unit can Move to, according to legalActions. */
function destinations(state: BattleState, unit: UnitId): string[] {
  return legalActions(state)
    .flatMap((action) => (action.type === 'move' && action.unit === unit ? [tileName(action.to)] : []))
    .sort()
}

function move(state: BattleState, unit: UnitId, to: string): ApplyResult {
  return applyAction(state, { type: 'move', unit, to: tileFromName(to) })
}

function endTurn(state: BattleState): BattleState {
  const result = applyAction(state, { type: 'endTurn' })
  if (!result.ok) throw new Error(result.rejection.message)
  return result.state
}

/** Every tile within `range` of `from`, excluding `from` itself. */
function tilesWithin(from: string, range: number): string[] {
  const names: string[] = []
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      const d = distance(tileFromName(from), { x, y })
      if (d >= 1 && d <= range) names.push(tileName({ x, y }))
    }
  }
  return names.sort()
}

// Everyone except the Unit under test stands in the far corner, out of the way.
const FAR = { A: ['e7', 'f7', 'g7'], B: ['f6', 'g6', 'g5'] } as const

describe('movement range from the formula (rules §3.2, expected values §20.2)', () => {
  const cases = [
    { unit: 'A.tamer', side: 'A', slot: 0, name: 'Tamer Level 1', move: 3 },
    { unit: 'A.m1', side: 'A', slot: 1, name: 'Fangrel 1 Star (light)', move: 4 },
    { unit: 'A.m2', side: 'A', slot: 2, name: 'Wispling 1 Star (light)', move: 4 },
    { unit: 'B.tamer', side: 'B', slot: 0, name: 'Tamer Level 1', move: 3 },
    { unit: 'B.m1', side: 'B', slot: 1, name: 'Tidewall 1 Star (heavy): 3 + 0 − 1 = 2', move: 2 },
    { unit: 'B.m2', side: 'B', slot: 2, name: 'Quillfox 1 Star (light)', move: 4 },
  ] as const

  for (const { unit, side, slot, name, move: expected } of cases) {
    it(`${name} moves ${expected}`, () => {
      // Put the Unit on a1 (a normal tile) and everyone else far away.
      const own = [...FAR[side]] as [string, string, string]
      own[slot] = 'a1'
      let state = scenario1Battle({ tiles: { A: FAR.A, B: FAR.B, [side]: own } })
      if (side === 'B') state = endTurn(state)

      expect(derivedValues(state, unit).move).toBe(expected)
      expect(destinations(state, unit)).toEqual(tilesWithin('a1', expected))
    })
  }

  it('Scenario 1 as placed gives every Unit its formula range', () => {
    const state = scenario1Battle()
    const moves = Object.fromEntries(state.units.map((u) => [u.id, derivedValues(state, u.id).move]))
    expect(moves).toEqual({ 'A.tamer': 3, 'A.m1': 4, 'A.m2': 4, 'B.tamer': 3, 'B.m1': 2, 'B.m2': 4 })
  })
})

describe('distance counts all 8 directions as 1 step (rules §2.3)', () => {
  it('is Chebyshev distance', () => {
    expect(distance(tileFromName('d4'), tileFromName('e5'))).toBe(1)
    expect(distance(tileFromName('a1'), tileFromName('d4'))).toBe(3)
    expect(distance(tileFromName('a1'), tileFromName('g2'))).toBe(6)
    expect(distance(tileFromName('c6'), tileFromName('c6'))).toBe(0)
  })

  it('lets a Unit Move diagonally at the same cost as straight', () => {
    // Tidewall (Move 2) from d4 reaches f6 diagonally and f4 straight, not g4.
    const state = endTurn(scenario1Battle({ tiles: { A: FAR.A, B: ['a7', 'd4', 'a5'] } }))
    const reach = destinations(state, 'B.m1')
    expect(reach).toEqual(expect.arrayContaining(['f6', 'f4', 'b2', 'd2']))
    expect(reach).not.toContain('g4')
  })
})

describe('other Units block movement (rules §6.1)', () => {
  it('a ground Unit cannot pass through Units of either side', () => {
    // Tidewall on a1 (Move 2), walled in by a2 and b2: only b1, c1, c2 are reachable;
    // a3 is 2 tiles away but every 2-step path is blocked.
    const state = endTurn(scenario1Battle({ tiles: { A: ['a2', 'g7', 'f7'], B: ['b2', 'a1', 'g5'] } }))
    expect(destinations(state, 'B.m1')).toEqual(['b1', 'c1', 'c2'])
    expect(move(state, 'B.m1', 'a3')).toMatchObject({ ok: false, rejection: { code: 'out-of-reach' } })
  })

  it('a ground Unit boxed in by Units cannot Move at all', () => {
    const state = scenario1Battle({ tiles: { A: ['a2', 'a1', 'g7'], B: ['b1', 'b2', 'g5'] } })
    expect(destinations(state, 'A.m1')).toEqual([])
  })

  it('no Unit can stop on a tile another Unit occupies', () => {
    const state = scenario1Battle()
    expect(move(state, 'A.m1', 'd1')).toMatchObject({ ok: false, rejection: { code: 'tile-occupied' } })
    expect(move(state, 'A.m2', 'd1')).toMatchObject({ ok: false, rejection: { code: 'tile-occupied' } })
  })
})

describe('Flying passes over Units but cannot stop on them (rules §6.2)', () => {
  it('Wispling crosses a wall of Units that stops a ground Unit', () => {
    // Same box as above, but the boxed-in Unit is the Wispling.
    const state = scenario1Battle({ tiles: { A: ['a2', 'g7', 'a1'], B: ['b1', 'b2', 'g5'] } })
    const reach = destinations(state, 'A.m2')
    expect(reach).toEqual(tilesWithin('a1', 4).filter((t) => !['a2', 'b1', 'b2'].includes(t)))
    expect(move(state, 'A.m2', 'b2')).toMatchObject({ ok: false, rejection: { code: 'tile-occupied' } })
  })

  it('the Move event lists the path over the Unit it passed', () => {
    const state = scenario1Battle({ tiles: { A: ['a2', 'g7', 'a1'], B: ['b1', 'b2', 'g5'] } })
    const result = move(state, 'A.m2', 'a3')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.events).toEqual([
      {
        type: 'unitMoved',
        unit: 'A.m2',
        from: tileFromName('a1'),
        to: tileFromName('a3'),
        path: [tileFromName('b2'), tileFromName('a3')],
      },
    ])
  })
})

describe('Aquatic gets +1 when it starts its Move on water (rules §6.3)', () => {
  it('Tidewall starting on water (a3) moves 3', () => {
    const state = endTurn(scenario1Battle({ tiles: { A: FAR.A, B: ['a7', 'a3', 'g5'] } }))
    expect(derivedValues(state, 'B.m1').move).toBe(2)
    expect(destinations(state, 'B.m1')).toEqual(tilesWithin('a3', 3).filter((t) => t !== 'a7'))
  })

  it('Tidewall next to water but not on it moves 2', () => {
    const state = endTurn(scenario1Battle({ tiles: { A: FAR.A, B: ['a7', 'a4', 'g5'] } }))
    expect(destinations(state, 'B.m1')).toEqual(tilesWithin('a4', 2))
  })
})

describe('a Move', () => {
  it('puts the Unit on the new tile and reports it as an event', () => {
    const state = scenario1Battle()
    const result = move(state, 'A.m1', 'c4')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const fangrel = result.state.units.find((u) => u.id === 'A.m1')
    expect(fangrel?.tile).toEqual(tileFromName('c4'))
    expect(result.events).toHaveLength(1)
    expect(result.events[0]).toMatchObject({ type: 'unitMoved', unit: 'A.m1', to: tileFromName('c4') })
    expect(result.events[0]?.type === 'unitMoved' && result.events[0].path).toHaveLength(2)
  })

  it('happens at most once per Unit per Turn', () => {
    const first = move(scenario1Battle(), 'A.m1', 'c3')
    if (!first.ok) throw new Error(first.rejection.message)
    expect(destinations(first.state, 'A.m1')).toEqual([])
    expect(move(first.state, 'A.m1', 'c4')).toMatchObject({ ok: false, rejection: { code: 'already-moved' } })
  })

  it('every action legalActions offers is accepted', () => {
    const state = scenario1Battle()
    for (const action of legalActions(state)) {
      expect(applyAction(state, action).ok).toBe(true)
    }
  })
})

describe('illegal actions are rejected with a reason and the state unchanged', () => {
  const state = scenario1Battle()
  const before = structuredClone(state)

  const illegal = [
    ['too far for its movement range', () => move(state, 'A.m1', 'c7'), 'out-of-reach'],
    ['onto an occupied tile', () => move(state, 'A.tamer', 'c2'), 'tile-occupied'],
    ['a Unit of the side not to act', () => move(state, 'B.m2', 'c5'), 'not-your-turn'],
    ['an unknown Unit', () => move(state, 'A.m9', 'c3'), 'unknown-unit'],
    [
      'a tile off the Board',
      () => applyAction(state, { type: 'move', unit: 'A.m1', to: { x: 7, y: 1 } }),
      'off-board',
    ],
    ['a Move to its own tile', () => move(state, 'A.m1', 'c2'), 'tile-occupied'],
  ] as const

  for (const [what, attempt, code] of illegal) {
    it(`Move ${what}: ${code}`, () => {
      const result = attempt()
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.rejection.code).toBe(code)
      expect(result.rejection.message).not.toBe('')
      expect(result.state).toBe(state)
      expect(state).toEqual(before)
    })
  }
})
