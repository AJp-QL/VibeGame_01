import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadGameData, tileFromName, tileName } from '@mt/shared'
import { createBattle, legalActions, previewAction, type DiceSource } from '@mt/engine'
import { createBattleSession } from '../src/session.ts'

// The session holds no rules: tapping reproduces what the engine says.

const DATA_DIR = fileURLToPath(new URL('../../../data/', import.meta.url))

type Tiles = readonly [string, string, string]

function newSession(tiles?: { A: Tiles; B: Tiles }, dice: DiceSource = { seed: '0123456789abcdef' }) {
  const files: Record<string, unknown> = {}
  for (const entry of readdirSync(DATA_DIR, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue
    const fullPath = join(entry.parentPath, entry.name)
    files[relative(DATA_DIR, fullPath).split(sep).join('/')] = JSON.parse(readFileSync(fullPath, 'utf8'))
  }
  const data = loadGameData(files)
  const scenario = data.scenarios.scenario_1!
  const state = createBattle({
    scenario: tiles
      ? {
          ...scenario,
          teams: {
            A: { ...scenario.teams.A, startingTiles: tiles.A },
            B: { ...scenario.teams.B, startingTiles: tiles.B },
          },
        }
      : scenario,
    board: data.boards.crossroads!,
    species: data.species,
    skills: data.skills,
    dice,
  })
  return createBattleSession(state)
}

describe('BattleSession (tap Unit → see reachable tiles → tap tile)', () => {
  it('selecting a Unit of the side to act shows exactly its legal Moves', () => {
    const session = newSession()
    session.input({ type: 'tapUnit', unit: 'A.m1' })
    const { state, selectedUnit, reachable } = session.getSnapshot()
    const legal = legalActions(state).flatMap((a) => (a.type === 'move' && a.unit === 'A.m1' ? [tileName(a.to)] : []))
    expect(selectedUnit).toBe('A.m1')
    expect(reachable.map(tileName).sort()).toEqual(legal.sort())
  })

  it('tapping a reachable tile moves the Unit and notifies subscribers', () => {
    const session = newSession()
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
    const session = newSession()
    session.input({ type: 'tapUnit', unit: 'B.m2' })
    expect(session.getSnapshot().selectedUnit).toBeNull()
    session.input({ type: 'tapUnit', unit: 'A.m1' })
    session.input({ type: 'tapTile', tile: tileFromName('c7') })
    expect(session.getSnapshot()).toMatchObject({ selectedUnit: null, revision: 0 })
  })

  it('End Turn hands the Turn to the other side', () => {
    const session = newSession()
    session.endTurn()
    expect(session.getSnapshot().state.sideToAct).toBe('B')
    expect(session.getSnapshot().log.map((e) => e.type)).toEqual(['turnEnded', 'turnStarted'])
  })
})

describe('BattleSession attack flow (select → Attack → target → preview → confirm or cancel)', () => {
  // Fangrel (A.m1) on d4 next to Tidewall (B.m1) on d5.
  const tiles = { A: ['a1', 'd4', 'g1'], B: ['a7', 'd5', 'g7'] } as const

  it('Attack lights up exactly the targets the engine allows, and Moves go dark', () => {
    const session = newSession(tiles)
    session.input({ type: 'tapUnit', unit: 'A.m1' })
    expect(session.getSnapshot()).toMatchObject({ canAttack: true, mode: 'move', targets: [] })
    session.chooseAttack()
    const snapshot = session.getSnapshot()
    expect(snapshot.mode).toBe('attack')
    expect(snapshot.reachable).toEqual([])
    expect(snapshot.targets.map(tileName)).toEqual(['d5'])
  })

  it('a Unit with no enemy in range cannot enter attack mode', () => {
    const session = newSession(tiles)
    session.input({ type: 'tapUnit', unit: 'A.m2' })
    session.chooseAttack()
    expect(session.getSnapshot()).toMatchObject({ canAttack: false, mode: 'move' })
  })

  it('tapping a target shows the engine preview; cancel steps back without acting', () => {
    const session = newSession(tiles)
    session.input({ type: 'tapUnit', unit: 'A.m1' })
    session.chooseAttack()
    session.input({ type: 'tapUnit', unit: 'B.m1' })
    const snapshot = session.getSnapshot()
    const expected = previewAction(snapshot.state, { type: 'basicAttack', unit: 'A.m1', target: 'B.m1' })
    expect(snapshot.pendingTarget).toBe('B.m1')
    expect(expected.ok && snapshot.preview).toEqual(expected.ok && expected.preview)
    expect(snapshot.preview).toMatchObject({ hitChance: { numerator: 12, denominator: 20 } })

    session.cancel()
    expect(session.getSnapshot()).toMatchObject({ pendingTarget: null, preview: null, mode: 'attack', revision: 0 })
    session.cancel()
    expect(session.getSnapshot()).toMatchObject({ mode: 'move', selectedUnit: 'A.m1' })
    session.cancel()
    expect(session.getSnapshot()).toMatchObject({ selectedUnit: null, revision: 0 })
  })

  it('confirm applies the attack; its events go to the log and the selection clears', () => {
    const session = newSession(tiles, { rolls: [9, 5] })
    session.input({ type: 'tapUnit', unit: 'A.m1' })
    session.chooseAttack()
    session.input({ type: 'tapUnit', unit: 'B.m1' })
    session.confirmAttack()
    const snapshot = session.getSnapshot()
    expect(snapshot.revision).toBe(1)
    expect(snapshot.log.map((e) => e.type)).toEqual(['attackRolled', 'damageDealt'])
    expect(snapshot.state.units.find((u) => u.id === 'B.m1')?.hp).toBe(24)
    expect(snapshot).toMatchObject({ selectedUnit: null, pendingTarget: null, preview: null, mode: 'move' })
  })

  it('tapping a Unit that is not a target while choosing one does not attack', () => {
    const session = newSession(tiles)
    session.input({ type: 'tapUnit', unit: 'A.m1' })
    session.chooseAttack()
    session.input({ type: 'tapUnit', unit: 'B.m2' })
    expect(session.getSnapshot()).toMatchObject({ selectedUnit: null, pendingTarget: null, revision: 0 })
  })
})
