import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadGameData, tileFromName, type Side } from '@mt/shared'
import { createBattle, type BattleSetup } from '@mt/engine'
import { createBattleSession, type BattleSessionPort, type BattleSnapshot } from '../src/index.ts'
import { createReplayPlayer } from '../src/replay.ts'

// Port fields for the Board (phase 1.x ticket 32): `attackable`, `plan` and `mode` come through
// `BattleSessionPort.getSnapshot()` with the values of the SessionSnapshot, so the Board reads them
// without a cast; the Replay player gives none.

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

// Fangrel (A.m1) d4, Wispling (A.m2) c3; Tidewall (B.m1) e5 and Quillfox (B.m2) b6.
const TILES: Record<Side, readonly [string, string, string]> = { A: ['a1', 'd4', 'c3'], B: ['a7', 'e5', 'b6'] }

function newSession() {
  const place = (side: Side) => {
    const [tamer, m1, m2] = TILES[side].map(tileFromName)
    return [tamer!, m1!, m2!] as const
  }
  const setup: BattleSetup = {
    scenario: data.scenarios.scenario_1!,
    board: data.boards.crossroads!,
    species: data.species,
    skills: data.skills,
    statuses: data.statuses,
    elementWheel: data.elementWheel,
    dice: { seed: '0123456789abcdef' },
    preset: { tiles: { A: place('A'), B: place('B') }, firstSide: 'A' },
  }
  return createBattleSession(createBattle(setup))
}

describe('session port: Action plan fields', () => {
  it('gives attackable, plan and mode the same values as the SessionSnapshot', () => {
    const session = newSession()
    const port: BattleSessionPort = session
    const fangrel = session.getSnapshot().units.find((u) => u.tile.x === tileFromName('d4').x && u.tile.y === tileFromName('d4').y)!

    const same = (snapshot: BattleSnapshot) => {
      const full = session.getSnapshot()
      expect(snapshot.attackable).toStrictEqual(full.attackable)
      expect(snapshot.plan).toStrictEqual(full.plan)
      expect(snapshot.mode).toBe(full.mode)
    }

    same(port.getSnapshot())
    expect(port.getSnapshot().attackable).toStrictEqual([])
    expect(port.getSnapshot().plan).toBeNull()
    expect(port.getSnapshot().mode).toBe('move')

    session.selectUnit(fangrel.id)
    const attackable = port.getSnapshot().attackable
    expect(attackable).toBeDefined()
    expect(attackable!.length).toBeGreaterThan(0)
    same(port.getSnapshot())

    session.aimTarget(attackable![0]!.unit)
    const aimed = port.getSnapshot()
    expect(aimed.plan).not.toBeNull()
    expect(aimed.plan!.target).toBe(attackable![0]!.unit)
    same(aimed)

    session.cancel()
    session.cancel()
    same(port.getSnapshot())
  })
})

describe('Replay player port', () => {
  it('gives no Action plan fields', () => {
    const session = newSession()
    const player = createReplayPlayer(session.getSnapshot().state, [])
    const snapshot: BattleSnapshot = player.getSnapshot()
    expect(snapshot.attackable).toBeUndefined()
    expect(snapshot.plan).toBeUndefined()
    expect(snapshot.mode).toBeUndefined()
  })
})
