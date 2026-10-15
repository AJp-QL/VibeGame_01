import { describe, expect, it } from 'vitest'
import { tileFromName, tileName, type Side } from '@mt/shared'
import {
  applyAction,
  legalActions,
  unitsVisibleTo,
  type Action,
  type ApplyResult,
  type BattleState,
  type UnitId,
} from '../src/index.ts'
import { gameData, scenario1Deployment } from './fixtures.ts'

function ok(result: ApplyResult) {
  if (!result.ok) throw new Error(result.rejection.message)
  return result
}

function deploy(state: BattleState, unit: UnitId, to: string): ApplyResult {
  return applyAction(state, { type: 'deploy', unit, to: tileFromName(to) })
}

function confirm(state: BattleState): ApplyResult {
  return applyAction(state, { type: 'confirmDeployment' })
}

/** Place Tamer, Monster 1, Monster 2 of `side` on `tiles`. */
function place(state: BattleState, side: Side, tiles: readonly [string, string, string]): BattleState {
  const ids = [`${side}.tamer`, `${side}.m1`, `${side}.m2`]
  return ids.reduce((s, id, i) => ok(deploy(s, id, tiles[i]!)).state, state)
}

const A_TILES = ['d1', 'c2', 'e2'] as const
const B_TILES = ['d7', 'e6', 'c6'] as const

/** Team A placed and confirmed: team B is placing. */
function bPlacing(dice = { rolls: [15, 10] }): BattleState {
  return ok(confirm(place(scenario1Deployment(dice), 'A', A_TILES))).state
}

const deployTiles = (actions: readonly Action[], unit: UnitId) =>
  actions.flatMap((a) => (a.type === 'deploy' && a.unit === unit ? [tileName(a.to)] : [])).sort()

const zone = (rows: readonly number[]) =>
  rows.flatMap((row) => ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((col) => `${col}${row}`)).sort()

describe('a Battle starts in deployment (rules §17.1)', () => {
  it('shows the whole Board, has no Unit on it yet, and team A places first', () => {
    const state = scenario1Deployment()
    expect(state.phase).toBe('deployment')
    expect(state.terrain).toEqual(gameData.boards.crossroads!.terrain)
    expect(state.units).toEqual([])
    expect(state.sideToAct).toBe('A')
    expect(state).toMatchObject({ round: 0, turnNumber: { A: 0, B: 0 }, firstSide: null, initiative: null })
  })

  it('offers each Unit of the side placing every tile of its start zone (back 2 rows, 14 tiles), any terrain', () => {
    const actions = legalActions(scenario1Deployment())
    for (const unit of ['A.tamer', 'A.m1', 'A.m2']) expect(deployTiles(actions, unit)).toEqual(zone([1, 2]))
    expect(actions).toHaveLength(3 * 14)
    expect(actions.every((a) => a.type === 'deploy')).toBe(true)

    const forB = legalActions(bPlacing())
    for (const unit of ['B.tamer', 'B.m1', 'B.m2']) expect(deployTiles(forB, unit)).toEqual(zone([6, 7]))
  })

  it('a placed Unit takes its tile; it can be placed again elsewhere before confirming', () => {
    const first = ok(deploy(scenario1Deployment(), 'A.m1', 'c2'))
    expect(first.events).toEqual([
      { type: 'unitPlaced', side: 'A', unit: 'A.m1', from: null, to: tileFromName('c2'), hiddenFrom: 'B' },
    ])
    expect(first.state.deployment?.placements.A).toEqual({ 'A.m1': tileFromName('c2') })
    expect(deployTiles(legalActions(first.state), 'A.tamer')).not.toContain('c2')

    const again = ok(deploy(first.state, 'A.m1', 'g1'))
    expect(again.events[0]).toMatchObject({ from: tileFromName('c2'), to: tileFromName('g1') })
    expect(again.state.deployment?.placements.A).toEqual({ 'A.m1': tileFromName('g1') })
  })

  it('Confirm needs all 3 Units placed', () => {
    let state = scenario1Deployment()
    expect(confirm(state)).toMatchObject({ ok: false, rejection: { code: 'deployment-incomplete' } })
    state = ok(deploy(state, 'A.tamer', 'd1')).state
    state = ok(deploy(state, 'A.m1', 'c2')).state
    expect(legalActions(state)).not.toContainEqual({ type: 'confirmDeployment' })
    expect(confirm(state)).toMatchObject({ ok: false, rejection: { code: 'deployment-incomplete' } })
    state = ok(deploy(state, 'A.m2', 'e2')).state
    expect(legalActions(state)).toContainEqual({ type: 'confirmDeployment' })
    expect(confirm(state).ok).toBe(true)
  })

  it('uses no dice', () => {
    const state = place(scenario1Deployment({ rolls: [15, 10] }), 'A', A_TILES)
    expect(state.dice).toEqual(scenario1Deployment({ rolls: [15, 10] }).dice)
    const placedB = place(bPlacing(), 'B', B_TILES)
    expect(placedB.dice).toMatchObject({ kind: 'scripted', position: 0 })
  })
})

describe('placements are hidden until both sides confirm, then revealed together (rules §17.1)', () => {
  it("after team A confirms, team B places and sees none of team A's Units", () => {
    const result = ok(confirm(place(scenario1Deployment(), 'A', A_TILES)))
    expect(result.events).toEqual([{ type: 'deploymentConfirmed', side: 'A' }])
    expect(result.state).toMatchObject({ phase: 'deployment', sideToAct: 'B', units: [] })
    expect(unitsVisibleTo(result.state, 'B')).toEqual([])
    expect(unitsVisibleTo(result.state, 'A').map((u) => [u.id, tileName(u.tile)])).toEqual([
      ['A.tamer', 'd1'],
      ['A.m1', 'c2'],
      ['A.m2', 'e2'],
    ])
  })

  it("team B's placements are hidden from team A as well", () => {
    const result = ok(deploy(bPlacing(), 'B.m2', 'c6'))
    expect(result.events[0]).toMatchObject({ type: 'unitPlaced', side: 'B', hiddenFrom: 'A' })
    expect(unitsVisibleTo(result.state, 'A').map((u) => u.id)).toEqual(['A.tamer', 'A.m1', 'A.m2'])
    expect(unitsVisibleTo(result.state, 'B').map((u) => u.id)).toEqual(['B.m2'])
  })

  it('a side that confirmed cannot change its placements', () => {
    expect(deploy(bPlacing(), 'A.m1', 'a1')).toMatchObject({ ok: false, rejection: { code: 'not-your-turn' } })
  })

  it('when team B confirms, every Unit is revealed at once, initiative is rolled and the first Turn starts', () => {
    const result = ok(confirm(place(bPlacing({ rolls: [15, 10] }), 'B', B_TILES)))
    expect(result.events.map((e) => e.type)).toEqual([
      'deploymentConfirmed',
      'deploymentRevealed',
      'initiativeRolled',
      'initiativeDecided',
      'turnStarted',
    ])
    expect(result.events[1]).toEqual({
      type: 'deploymentRevealed',
      placements: [...A_TILES, ...B_TILES].map((tile, i) => ({
        unit: ['A.tamer', 'A.m1', 'A.m2', 'B.tamer', 'B.m1', 'B.m2'][i],
        tile: tileFromName(tile),
      })),
    })
    const { state } = result
    expect(state).toMatchObject({ phase: 'play', deployment: null, sideToAct: 'A', round: 1 })
    expect(state.units.map((u) => tileName(u.tile))).toEqual([...A_TILES, ...B_TILES])
    expect(unitsVisibleTo(state, 'A')).toEqual(state.units)
    expect(unitsVisibleTo(state, 'B')).toEqual(state.units)
  })
})

describe('illegal deployment actions are rejected with a reason and the state unchanged', () => {
  const state = ok(deploy(scenario1Deployment(), 'A.tamer', 'd1')).state
  const before = structuredClone(state)

  const illegal = [
    ['outside the start zone (row 3)', () => deploy(state, 'A.m1', 'd3'), 'outside-start-zone'],
    ["in the other side's start zone", () => deploy(state, 'A.m1', 'd7'), 'outside-start-zone'],
    ['on a tile already taken', () => deploy(state, 'A.m1', 'd1'), 'tile-occupied'],
    ['on its own tile', () => deploy(state, 'A.tamer', 'd1'), 'tile-occupied'],
    ['a Unit of the other side', () => deploy(state, 'B.m1', 'd7'), 'not-your-turn'],
    ['an unknown Unit', () => deploy(state, 'A.m9', 'a1'), 'unknown-unit'],
    ['a tile off the Board', () => applyAction(state, { type: 'deploy', unit: 'A.m1', to: { x: 2, y: -1 } }), 'off-board'],
    ['Confirm with Units still to place', () => confirm(state), 'deployment-incomplete'],
    ['a Move before the Battle starts', () => applyAction(state, { type: 'move', unit: 'A.tamer', to: tileFromName('d2') }), 'wrong-phase'],
    ['End Turn before the Battle starts', () => applyAction(state, { type: 'endTurn' }), 'wrong-phase'],
  ] as const

  for (const [what, attempt, code] of illegal) {
    it(`${what}: ${code}`, () => {
      const result = attempt()
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.rejection.code).toBe(code)
      expect(result.rejection.message).not.toBe('')
      expect(result.state).toBe(state)
      expect(state).toEqual(before)
    })
  }

  it('deployment actions after the Battle started: wrong-phase', () => {
    const playing = ok(confirm(place(bPlacing(), 'B', B_TILES))).state
    expect(deploy(playing, 'A.m1', 'a1')).toMatchObject({ ok: false, rejection: { code: 'wrong-phase' } })
    expect(confirm(playing)).toMatchObject({ ok: false, rejection: { code: 'wrong-phase' } })
  })

  it('every action legalActions offers during deployment is accepted', () => {
    for (const s of [state, place(bPlacing(), 'B', B_TILES)]) {
      for (const action of legalActions(s)) expect(applyAction(s, action).ok).toBe(true)
    }
  })
})
