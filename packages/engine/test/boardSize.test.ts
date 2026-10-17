import { describe, expect, it } from 'vitest'
import { tileFromName, tileName, type Tile } from '@mt/shared'
import {
  applyAction,
  areaTiles,
  boardSizeOf,
  createBattle,
  isInStartZone,
  legalActions,
  startZoneRows,
  type Action,
  type ApplyResult,
  type BattleState,
} from '../src/index.ts'
import { pushOutcome } from '../src/push.ts'
import { arena, gameData, NEUTRAL_ELEMENTS, scenario1Battle, scenario1Deployment } from './fixtures.ts'

// The size of the Board belongs to the Board (phase 1.x ticket 13): the engine
// reads it from the Battle, so a 9x9 Board plays like the 7x7 ones, edge to edge.

const tile = (name: string): Tile => tileFromName(name)
const names = (tiles: readonly Tile[]) => tiles.map(tileName).sort()

function accepted(result: ApplyResult): BattleState {
  if (!result.ok) throw new Error(result.rejection.message)
  return result.state
}

/** A Battle on the 9x9 Arena, Units on the given tiles (Tamer, Monster 1, Monster 2 per side). */
function arenaBattle(tiles: { A: [string, string, string]; B: [string, string, string] }): BattleState {
  return scenario1Battle({ board: arena, tiles, elements: NEUTRAL_ELEMENTS })
}

describe('the engine reads the size from the Battle', () => {
  it('a 7x7 Board is 7, the Arena is 9', () => {
    expect(boardSizeOf(scenario1Battle())).toBe(7)
    expect(boardSizeOf(arenaBattle({ A: ['a1', 'd2', 'e2'], B: ['i9', 'f8', 'e8'] }))).toBe(9)
  })

  it('Units can start on the whole Arena, and not off it', () => {
    const state = arenaBattle({ A: ['a1', 'i2', 'e2'], B: ['i9', 'a8', 'e8'] })
    expect(state.units.map((u) => tileName(u.tile))).toEqual(['a1', 'i2', 'e2', 'i9', 'a8', 'e8'])
    expect(() => arenaBattle({ A: ['a1', 'j2', 'e2'], B: ['i9', 'a8', 'e8'] })).toThrow(/cannot start/)
  })

  it('start zones are the first and last two rows of the Board', () => {
    expect(startZoneRows('A', 7)).toEqual([0, 1])
    expect(startZoneRows('B', 7)).toEqual([5, 6])
    expect(startZoneRows('A', 9)).toEqual([0, 1])
    expect(startZoneRows('B', 9)).toEqual([7, 8])
    expect(isInStartZone('B', tile('e8'), 9)).toBe(true)
    expect(isInStartZone('B', tile('e8'))).toBe(false)
  })
})

describe('Moving on a bigger Board', () => {
  // Fangrel (light, Ground) next to the old edge: on the Arena it can walk on.
  const state = arenaBattle({ A: ['a1', 'g5', 'e2'], B: ['i9', 'a8', 'e8'] })

  it('legal moves reach columns h and i, and none go beyond', () => {
    const moves = legalActions(state).flatMap((a) => (a.type === 'move' && a.unit === 'A.m1' ? [a.to] : []))
    expect(names(moves)).toContain('i5')
    expect(names(moves)).toContain('h6')
    expect(moves.every((t) => t.x <= 8 && t.y <= 8)).toBe(true)
  })

  it('a Move to the far edge is accepted, a Move past it is off-board', () => {
    const moved = accepted(applyAction(state, { type: 'move', unit: 'A.m1', to: tile('i5') }))
    expect(moved.units.find((u) => u.id === 'A.m1')?.tile).toEqual(tile('i5'))
    const past = applyAction(state, { type: 'move', unit: 'A.m1', to: { x: 9, y: 4 } })
    expect(past.ok).toBe(false)
    if (!past.ok) expect(past.rejection.code).toBe('off-board')
  })

  it('Wispling can Blink to the far edge', () => {
    const blinkState = arenaBattle({ A: ['a1', 'e2', 'g5'], B: ['i9', 'a8', 'e8'] })
    const blinks = legalActions(blinkState).flatMap((a) => (a.type === 'useSkill' && a.skill === 'blink' && a.unit === 'A.m2' ? [a.tile!] : []))
    expect(names(blinks)).toContain('i5')
    expect(blinks.every((t) => t.x <= 8)).toBe(true)
  })
})

describe('Deployment on a bigger Board', () => {
  const state = scenario1Deployment({ seed: '0123456789abcdef' }, undefined, arena)

  it("a side's start zone is its two nearest rows, every column", () => {
    const placements = legalActions(state).filter((a) => a.type === 'deploy' && a.unit === 'A.tamer')
    expect(placements).toHaveLength(18)
    expect(names(placements.map((a) => (a as Extract<Action, { type: 'deploy' }>).to)).every((n) => n.endsWith('1') || n.endsWith('2'))).toBe(true)
    expect(names(placements.map((a) => (a as Extract<Action, { type: 'deploy' }>).to))).toContain('i2')
  })

  it('placing beyond the zone or the Board is refused with the right reason', () => {
    const outside = applyAction(state, { type: 'deploy', unit: 'A.tamer', to: tile('a3') })
    expect(outside.ok === false && outside.rejection.code).toBe('outside-start-zone')
    const off = applyAction(state, { type: 'deploy', unit: 'A.tamer', to: { x: 9, y: 0 } })
    expect(off.ok === false && off.rejection.code).toBe('off-board')
    expect(applyAction(state, { type: 'deploy', unit: 'A.tamer', to: tile('i2') }).ok).toBe(true)
  })

  it('team B places on the last two rows, rows 8 and 9', () => {
    let s = state
    for (const [unit, name] of [['A.tamer', 'e1'], ['A.m1', 'd2'], ['A.m2', 'f2']] as const) {
      s = accepted(applyAction(s, { type: 'deploy', unit, to: tile(name) }))
    }
    s = accepted(applyAction(s, { type: 'confirmDeployment' }))
    expect(s.sideToAct).toBe('B')
    const zones = legalActions(s).flatMap((a) => (a.type === 'deploy' && a.unit === 'B.tamer' ? [a.to] : []))
    expect(zones).toHaveLength(18)
    expect(new Set(zones.map((t) => t.y))).toEqual(new Set([7, 8]))
    const row7 = applyAction(s, { type: 'deploy', unit: 'B.tamer', to: tile('e7') })
    expect(row7.ok === false && row7.rejection.code).toBe('outside-start-zone')
    expect(applyAction(s, { type: 'deploy', unit: 'B.tamer', to: tile('e8') }).ok).toBe(true)
  })
})

describe('Pushing, areas and Attune on a bigger Board', () => {
  it('a push runs on to column i and stops at the edge, not at the old g', () => {
    // Tidewall (B.m1) on f5 pushes Fangrel (A.m1) on g5 east.
    const open = arenaBattle({ A: ['a1', 'g5', 'e2'], B: ['i9', 'f5', 'e8'] })
    expect(pushOutcome(open, 'B.m1', 'A.m1', 1)).toEqual({ to: tile('h5'), blocked: null })
    const edge = arenaBattle({ A: ['a1', 'i5', 'e2'], B: ['i9', 'h5', 'e8'] })
    expect(pushOutcome(edge, 'B.m1', 'A.m1', 1)).toEqual({ to: null, blocked: { tile: tile('j5'), by: 'offBoard' } })
  })

  it('Burst covers the 3x3 around its centre, cut off at the Arena edge', () => {
    const burst = gameData.skills.burst!
    expect(names(areaTiles(burst, tile('e5'), 9))).toEqual(['d4', 'd5', 'd6', 'e4', 'e5', 'e6', 'f4', 'f5', 'f6'])
    expect(names(areaTiles(burst, tile('i9'), 9))).toEqual(['h8', 'h9', 'i8', 'i9'])
    // The default size is the 7x7 Boards'.
    expect(names(areaTiles(burst, tile('g7')))).toEqual(['f6', 'f7', 'g6', 'g7'])
  })

  it('Burst can be centred on the far edge of the Arena', () => {
    const state = arenaBattle({ A: ['a1', 'e2', 'g5'], B: ['i9', 'i5', 'e8'] })
    const centres = legalActions(state).flatMap((a) => (a.type === 'useSkill' && a.skill === 'burst' && a.tile !== undefined ? [a.tile] : []))
    expect(names(centres)).toContain('i5')
  })

  it('Attune can change a tile in column h', () => {
    const state = arenaBattle({ A: ['g4', 'e2', 'a2'], B: ['i9', 'i8', 'e8'] })
    const tiles = legalActions(state).flatMap((a) => (a.type === 'useSkill' && a.skill === 'attune' && a.tile !== undefined ? [a.tile] : []))
    expect(names(tiles)).toContain('h4')
    expect(names(tiles)).toContain('h5')
  })
})
