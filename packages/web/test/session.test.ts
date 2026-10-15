import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadGameData, tileFromName, tileName, type Side } from '@mt/shared'
import { createBattle, legalActions, type BattleSetup } from '@mt/engine'
import { createBattleSession, idleUnits, type BattleSession } from '../src/session.ts'

// The session holds no rules: tapping reproduces what the engine says.

const DATA_DIR = fileURLToPath(new URL('../../../data/', import.meta.url))

function gameData() {
  const files: Record<string, unknown> = {}
  for (const entry of readdirSync(DATA_DIR, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue
    const fullPath = join(entry.parentPath, entry.name)
    files[relative(DATA_DIR, fullPath).split(sep).join('/')] = JSON.parse(readFileSync(fullPath, 'utf8'))
  }
  return loadGameData(files)
}

const data = gameData()

function newSession(options: Partial<Pick<BattleSetup, 'dice' | 'preset'>> = {}) {
  return createBattleSession(
    createBattle({
      scenario: data.scenarios.scenario_1!,
      board: data.boards.crossroads!,
      species: data.species,
      dice: options.dice ?? { seed: '0123456789abcdef' },
      ...(options.preset ? { preset: options.preset } : {}),
    }),
  )
}

const TILES = { A: ['d1', 'c2', 'e2'], B: ['d7', 'e6', 'c6'] } as const

/** A Battle in play: Turn 1 of team A, Units on TILES. */
function playingSession() {
  const tiles = (side: Side) => {
    const [tamer, m1, m2] = TILES[side].map(tileFromName)
    return [tamer!, m1!, m2!] as const
  }
  return newSession({ preset: { tiles: { A: tiles('A'), B: tiles('B') }, firstSide: 'A' } })
}

/** Place the side's 3 Units by tapping tiles: the session selects the next unplaced Unit by itself. */
function placeByTapping(session: BattleSession, side: Side) {
  for (const tile of TILES[side]) session.input({ type: 'tapTile', tile: tileFromName(tile) })
}

describe('BattleSession: Hotseat deployment', () => {
  it('starts with team A placing and its Tamer selected, showing its start zone', () => {
    const { state, selectedUnit, reachable, units } = newSession().getSnapshot()
    expect(state.phase).toBe('deployment')
    expect(selectedUnit).toBe('A.tamer')
    expect(reachable.map(tileName).sort()).toEqual(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g'].flatMap((c) => [`${c}1`, `${c}2`]).sort(),
    )
    expect(units).toEqual([])
  })

  it('tapping tiles places the Units in order; a placed Unit can be tapped and moved', () => {
    const session = newSession()
    placeByTapping(session, 'A')
    let snapshot = session.getSnapshot()
    expect(snapshot.units.map((u) => [u.id, tileName(u.tile)])).toEqual([
      ['A.tamer', 'd1'],
      ['A.m1', 'c2'],
      ['A.m2', 'e2'],
    ])
    expect(snapshot.selectedUnit).toBeNull()

    session.input({ type: 'tapUnit', unit: 'A.m1' })
    session.input({ type: 'tapTile', tile: tileFromName('a1') })
    snapshot = session.getSnapshot()
    expect(snapshot.units.find((u) => u.id === 'A.m1')?.tile).toEqual(tileFromName('a1'))
  })

  it('a tile outside the start zone places nothing', () => {
    const session = newSession()
    session.input({ type: 'tapTile', tile: tileFromName('d4') })
    expect(session.getSnapshot()).toMatchObject({ revision: 0, selectedUnit: 'A.tamer' })
  })

  it("after team A confirms, a hand-off screen covers the Board and team B sees none of A's Units", () => {
    const session = newSession()
    placeByTapping(session, 'A')
    session.confirmDeployment()
    let snapshot = session.getSnapshot()
    expect(snapshot.screen).toBe('handoff')
    expect(snapshot.state.sideToAct).toBe('B')
    expect(snapshot.units).toEqual([])

    session.continueHotseat()
    snapshot = session.getSnapshot()
    expect(snapshot).toMatchObject({ screen: 'board', selectedUnit: 'B.tamer' })
    // Tapping where team A's Tamer stands finds no Unit to select.
    expect(snapshot.units.some((u) => u.side === 'A')).toBe(false)
  })

  it('after team B confirms, every Unit is revealed and the initiative screen shows who starts', () => {
    const session = newSession({ dice: { rolls: [3, 17] } })
    placeByTapping(session, 'A')
    session.confirmDeployment()
    session.continueHotseat()
    placeByTapping(session, 'B')
    session.confirmDeployment()
    const snapshot = session.getSnapshot()
    expect(snapshot.screen).toBe('initiative')
    expect(snapshot.units).toHaveLength(6)
    expect(snapshot.state).toMatchObject({ phase: 'play', sideToAct: 'B', activations: { limit: 2 } })
    expect(snapshot.state.initiative?.firstSide).toBe('B')
    session.continueHotseat()
    expect(session.getSnapshot().screen).toBe('board')
  })

  it('Confirm before all 3 Units are placed is refused with a reason', () => {
    const session = newSession()
    session.confirmDeployment()
    expect(session.getSnapshot()).toMatchObject({ rejection: 'deployment-incomplete', screen: 'board' })
  })
})

describe('BattleSession: a Turn (tap Unit → see reachable tiles → tap tile)', () => {
  it('selecting a Unit of the side to act shows exactly its legal Moves', () => {
    const session = playingSession()
    session.input({ type: 'tapUnit', unit: 'A.m1' })
    const { state, selectedUnit, reachable } = session.getSnapshot()
    const legal = legalActions(state).flatMap((a) => (a.type === 'move' && a.unit === 'A.m1' ? [tileName(a.to)] : []))
    expect(selectedUnit).toBe('A.m1')
    expect(reachable.map(tileName).sort()).toEqual(legal.sort())
  })

  it('tapping a reachable tile moves the Unit and notifies subscribers', () => {
    const session = playingSession()
    let notified = 0
    session.subscribe(() => notified++)
    session.input({ type: 'tapUnit', unit: 'A.m1' })
    session.input({ type: 'tapTile', tile: tileFromName('c4') })
    const snapshot = session.getSnapshot()
    expect(snapshot.state.units.find((u) => u.id === 'A.m1')?.tile).toEqual(tileFromName('c4'))
    expect(snapshot.events).toMatchObject([{ type: 'unitMoved', unit: 'A.m1' }])
    expect(snapshot.revision).toBe(1)
    expect(snapshot.selectedUnit).toBeNull()
    expect(notified).toBe(2)
  })

  it('tapping a Unit of the other side or an unreachable tile selects nothing', () => {
    const session = playingSession()
    session.input({ type: 'tapUnit', unit: 'B.m2' })
    expect(session.getSnapshot().selectedUnit).toBeNull()
    session.input({ type: 'tapUnit', unit: 'A.m1' })
    session.input({ type: 'tapTile', tile: tileFromName('c7') })
    expect(session.getSnapshot()).toMatchObject({ selectedUnit: null, revision: 0 })
  })

  it('on the first Turn, the third Unit has no Moves once 2 Units have acted', () => {
    const session = playingSession()
    session.input({ type: 'tapUnit', unit: 'A.m1' })
    session.input({ type: 'tapTile', tile: tileFromName('c3') })
    session.input({ type: 'tapUnit', unit: 'A.m2' })
    session.input({ type: 'tapTile', tile: tileFromName('e3') })
    session.input({ type: 'tapUnit', unit: 'A.tamer' })
    expect(session.getSnapshot()).toMatchObject({ selectedUnit: 'A.tamer', reachable: [] })
    expect(session.getSnapshot().canAct).toEqual([])
  })

  it('End Turn warns about Units that did nothing (idleUnits), then hands the Turn over', () => {
    const session = playingSession()
    expect(idleUnits(session.getSnapshot().state)).toEqual(['A.tamer', 'A.m1', 'A.m2'])
    session.input({ type: 'tapUnit', unit: 'A.m1' })
    session.input({ type: 'tapTile', tile: tileFromName('c3') })
    expect(idleUnits(session.getSnapshot().state)).toEqual(['A.tamer', 'A.m2'])
    session.endTurn()
    expect(session.getSnapshot().state.sideToAct).toBe('B')
    expect(session.getSnapshot().log.map((e) => e.type)).toEqual(['unitMoved', 'turnEnded', 'turnStarted'])
  })

  it('no warning once the 2 Units of the first Turn have acted', () => {
    const session = playingSession()
    session.input({ type: 'tapUnit', unit: 'A.m1' })
    session.input({ type: 'tapTile', tile: tileFromName('c3') })
    session.input({ type: 'tapUnit', unit: 'A.m2' })
    session.input({ type: 'tapTile', tile: tileFromName('e3') })
    expect(idleUnits(session.getSnapshot().state)).toEqual([])
  })
})
