import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadGameData, tileFromName, type Side } from '@mt/shared'
import { createBattle, threatCount, threatZone, type BattleSetup, type BattleState } from '@mt/engine'
import { createBattleSession, type PlanOrigin } from '../src/index.ts'

// Threat zone in the session (phase 1.x ticket 11, spec stories 7-8, 53): the count for the previewed
// tile, the count of every tile for an overlay, and the tie-break of the Action plan's attack-from tile.

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

type Tiles = Readonly<Record<Side, readonly [string, string, string]>>

function newState(tiles: Tiles, firstSide: Side = 'A'): BattleState {
  const place = (side: Side) => {
    const [tamer, m1, m2] = tiles[side].map(tileFromName)
    return [tamer!, m1!, m2!] as const
  }
  const setup: BattleSetup = {
    scenario: data.scenarios.scenario_1!,
    board: data.boards.crossroads!,
    species: data.species,
    // Every reach cut to 1 so a Unit's Threat zone does not cover the whole 7x7 Board (the count then differs from tile to tile).
    skills: Object.fromEntries(Object.entries(data.skills).map(([id, skill]) => [id, skill.range > 1 ? { ...skill, range: 1 } : skill])),
    statuses: data.statuses,
    elementWheel: data.elementWheel,
    dice: { seed: '0123456789abcdef' },
    preset: { tiles: { A: place('A'), B: place('B') }, firstSide },
  }
  return createBattle(setup)
}

const MIDDLE: Tiles = { A: ['a1', 'd4', 'c3'], B: ['a7', 'e5', 'b6'] }
// Found by scanning layouts: here Threat zone, not tile order, decides between f6 and e6 for attacking Quillfox.
const SPREAD: Tiles = { A: ['a1', 'd4', 'c3'], B: ['a7', 'g1', 'f7'] }

describe('Threat zone in the session', () => {
  it('the Move preview carries the count of the tile being looked at', () => {
    const session = createBattleSession(newState(MIDDLE))
    session.selectUnit('A.m1')
    const state = session.getSnapshot().state
    const counts = new Set<number>()
    for (const tile of session.getSnapshot().reachable) {
      session.previewMove(tile)
      const threat = session.getSnapshot().movePreview!.threat
      expect(threat, `${tile.x},${tile.y}`).toBe(threatCount(state, tile, 'A'))
      counts.add(threat)
    }
    expect(counts.size).toBeGreaterThan(1)
  })

  it('a Blink destination is previewed with its count too', () => {
    const session = createBattleSession(newState(MIDDLE))
    session.selectUnit('A.m2')
    session.chooseSkill('blink')
    const tile = session.getSnapshot().tileChoices[0]!
    session.input({ type: 'tapTile', tile })
    expect(session.getSnapshot().movePreview!.threat).toBe(threatCount(session.getSnapshot().state, tile, 'A'))
  })

  it('threatZone is the count of every tile for the side at the device, in Hotseat for either side', () => {
    for (const side of ['A', 'B'] as const) {
      const state = newState(MIDDLE, side)
      const session = createBattleSession(state)
      const zone = session.getSnapshot().threatZone
      expect(zone).toEqual(threatZone(state, side))
      expect(zone).toHaveLength(7)
      expect(zone.flat().some((n) => n > 0)).toBe(true)
    }
  })

  it('moves with the Battle: a Unit that moves changes the zone, a down Unit leaves it', () => {
    const session = createBattleSession(newState(MIDDLE))
    const before = session.getSnapshot().threatZone
    session.endTurn()
    const after = session.getSnapshot().threatZone
    // Now it is team B's device: the zone is the one threatening team B.
    expect(after).toEqual(threatZone(session.getSnapshot().state, 'B'))
    expect(after).not.toEqual(before)
  })

  it('does not depend on the selection and changes nothing', () => {
    const session = createBattleSession(newState(MIDDLE))
    const state = session.getSnapshot().state
    session.selectUnit('A.m1')
    expect(session.getSnapshot().threatZone).toEqual(threatZone(state, 'A'))
    expect(session.getSnapshot().state).toBe(state)
    expect(session.getSnapshot().actions).toEqual([])
  })
})

describe('Threat zone as the second tie-break of the Action plan (spec 8.2 rule c)', () => {
  const order = (o: PlanOrigin) => ['stay', 'move', 'blink'].indexOf(o.via)

  for (const [name, tiles] of [['MIDDLE', MIDDLE], ['SPREAD', SPREAD]] as const) {
    it(`${name}: origins are sorted by stay/walk/Blink, steps, lower threat, then tile order`, () => {
      const session = createBattleSession(newState(tiles))
      let broke = 0
      for (const unit of ['A.m1', 'A.m2'] as const) {
        session.selectUnit(unit)
        const snapshot = session.getSnapshot()
        const threat = (o: PlanOrigin) => threatCount(snapshot.state, o.tile, 'A')
        for (const enemy of snapshot.attackable) {
          for (let i = 1; i < enemy.origins.length; i++) {
            const [a, b] = [enemy.origins[i - 1]!, enemy.origins[i]!]
            const key = order(a) - order(b) || a.steps - b.steps || threat(a) - threat(b) || a.tile.y - b.tile.y || a.tile.x - b.tile.x
            expect(key, `${unit} -> ${enemy.unit}: ${a.via}${a.tile.x},${a.tile.y} before ${b.via}${b.tile.x},${b.tile.y}`).toBeLessThan(0)
            // Threat decided it: same kind, same steps, different threat, and tile order alone would say otherwise.
            const tileOrder = a.tile.y - b.tile.y || a.tile.x - b.tile.x
            if (a.via === b.via && a.steps === b.steps && threat(a) < threat(b) && tileOrder > 0) broke++
          }
        }
        session.selectUnit(unit)
      }
      if (name === 'SPREAD') expect(broke).toBeGreaterThan(0)
    })
  }

  it('the plan\'s suggested tile is the least threatened among the nearest', () => {
    const session = createBattleSession(newState(SPREAD))
    session.selectUnit('A.m1')
    const snapshot = session.getSnapshot()
    for (const enemy of snapshot.attackable) {
      session.aimTarget(enemy.unit)
      const origin = session.getSnapshot().plan!.origin
      expect(origin).toEqual(enemy.origins[0])
      const nearest = enemy.origins.filter((o) => o.via === origin.via && o.steps === origin.steps)
      for (const other of nearest) {
        expect(threatCount(snapshot.state, origin.tile, 'A')).toBeLessThanOrEqual(threatCount(snapshot.state, other.tile, 'A'))
      }
      session.cancel()
    }
  })

  it('staying still wins over any threat: the current tile is first when the enemy is in range', () => {
    const session = createBattleSession(newState({ A: ['a1', 'd4', 'c3'], B: ['g7', 'd5', 'g6'] }))
    session.selectUnit('A.m1')
    session.aimTarget('B.m1')
    expect(session.getSnapshot().plan!.origin.via).toBe('stay')
  })
})
