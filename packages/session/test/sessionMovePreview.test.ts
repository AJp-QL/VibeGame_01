import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadGameData, sameTile, tileFromName, type Side, type Tile } from '@mt/shared'
import { createBattle, type BattleSetup, type BattleState, type UnitId } from '@mt/engine'
import { createBattleSession, type BattleSession, type MoveReach } from '../src/index.ts'

// Move preview (phase 1.x ticket 03, spec stories 1-13): the session looks at a
// reachable tile, or a Blink destination, as if the Unit stood there. The engine
// does the sums on a copy of the Battle, so the Battle never changes and no die
// is rolled. What it reports must be what the Unit really gets after moving.

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

// Fangrel (A.m1) d4, Wispling (A.m2) c3; Tidewall (B.m1) e5 and Quillfox (B.m2) b6 between them and the far corner.
const MIDDLE: Tiles = { A: ['a1', 'd4', 'c3'], B: ['a7', 'e5', 'b6'] }

// Team B's Quillfox (B.m2, Long Shot) on c2 shoots at team A: Fangrel on c5 stands in front of Wispling on c6, so line of sight blocks some shots.
// (Wispling flies, so it shoots over Units: it is not the Unit to test line of sight with.)
const SCREENED: Tiles = { A: ['a1', 'c5', 'c6'], B: ['g7', 'e5', 'c2'] }

function newSession(tiles: Tiles = MIDDLE, firstSide: Side = 'A'): BattleSession {
  const place = (side: Side) => {
    const [tamer, m1, m2] = tiles[side].map(tileFromName)
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
    preset: { tiles: { A: place('A'), B: place('B') }, firstSide },
  }
  return createBattleSession(createBattle(setup))
}

const unitAt = (state: BattleState, tile: Tile): UnitId | undefined => state.units.find((u) => sameTile(u.tile, tile))?.id
const sorted = (ids: readonly UnitId[]) => [...ids].sort()
const sortedBlocked = (reach: MoveReach) => sorted(reach.blocked.map((b) => b.unit))

describe('BattleSession: Move preview does not change the Battle', () => {
  it('previewing a reachable tile shows the Unit there, with no state change and no dice', () => {
    const session = newSession()
    session.selectUnit('A.m1')
    const before = session.getSnapshot()
    const tile = before.reachable[0]
    if (tile === undefined) throw new Error('Fangrel has nowhere to go')
    session.previewMove(tile)
    const after = session.getSnapshot()
    expect(after.movePreviewTile).toEqual(tile)
    expect(after.movePreview).toMatchObject({ unit: 'A.m1', tile, skill: null })
    expect(after.state).toBe(before.state)
    expect(after.state.dice).toEqual(before.state.dice)
    expect(after.actions).toEqual([])
    expect(after.state.units.find((u) => u.id === 'A.m1')?.tile).toEqual(tileFromName('d4'))
  })

  it('another reachable tile replaces the preview, cancelMovePreview and cancel drop it', () => {
    const session = newSession()
    session.selectUnit('A.m1')
    const [first, second] = session.getSnapshot().reachable
    if (first === undefined || second === undefined) throw new Error('Fangrel has fewer than two tiles to go to')
    session.previewMove(first)
    session.previewMove(second)
    expect(session.getSnapshot().movePreviewTile).toEqual(second)
    session.cancelMovePreview()
    expect(session.getSnapshot().movePreviewTile).toBeNull()
    expect(session.getSnapshot().movePreview).toBeNull()
    session.previewMove(first)
    session.cancel()
    expect(session.getSnapshot().movePreviewTile).toBeNull()
    // The Unit stays selected after the preview is dropped by cancelMovePreview, not by cancel.
    expect(session.getSnapshot().selectedUnit).toBe('A.m1')
  })

  it('a tile that is not reachable is ignored', () => {
    const session = newSession()
    session.selectUnit('A.m1')
    session.previewMove(tileFromName('e5'))
    expect(session.getSnapshot().movePreviewTile).toBeNull()
    expect(session.getSnapshot().movePreview).toBeNull()
  })

  it('choosing another Unit drops the preview', () => {
    const session = newSession()
    session.selectUnit('A.m1')
    session.previewMove(session.getSnapshot().reachable[0]!)
    session.selectUnit('A.m2')
    expect(session.getSnapshot().movePreviewTile).toBeNull()
  })

  it('a Unit that already moved has no tile to preview (story 13)', () => {
    const session = newSession()
    session.selectUnit('A.m1')
    session.input({ type: 'tapTile', tile: session.getSnapshot().reachable[0]! })
    expect(session.getSnapshot().selectedUnit).toBe('A.m1')
    expect(session.getSnapshot().reachable).toEqual([])
    session.previewMove(tileFromName('d3'))
    expect(session.getSnapshot().movePreviewTile).toBeNull()
    expect(session.getSnapshot().movePreview).toBeNull()
  })

  it('nothing is previewed without a selected Unit', () => {
    const session = newSession()
    session.previewMove(tileFromName('d3'))
    expect(session.getSnapshot().movePreviewTile).toBeNull()
  })
})

describe('BattleSession: confirming a Move preview', () => {
  it('moves the Unit to the previewed tile, as a Move action, and drops the preview', () => {
    const session = newSession()
    session.selectUnit('A.m1')
    const tile = session.getSnapshot().reachable[1]!
    session.previewMove(tile)
    session.confirmMove()
    const snapshot = session.getSnapshot()
    expect(snapshot.state.units.find((u) => u.id === 'A.m1')?.tile).toEqual(tile)
    expect(snapshot.actions).toEqual([{ type: 'move', unit: 'A.m1', to: tile }])
    expect(snapshot.movePreviewTile).toBeNull()
    expect(snapshot.movePreview).toBeNull()
  })

  it('confirming with nothing previewed does nothing', () => {
    const session = newSession()
    session.selectUnit('A.m1')
    session.confirmMove()
    expect(session.getSnapshot().actions).toEqual([])
  })

  it('the old way still works: tapping a lit tile moves at once', () => {
    const session = newSession()
    session.selectUnit('A.m1')
    const tile = session.getSnapshot().reachable[0]!
    session.input({ type: 'tapTile', tile })
    expect(session.getSnapshot().actions).toEqual([{ type: 'move', unit: 'A.m1', to: tile }])
  })

  it('works for either side in Hotseat: team B on its own Turn', () => {
    const session = newSession(MIDDLE, 'B')
    session.selectUnit('B.m1')
    const tile = session.getSnapshot().reachable[0]!
    session.previewMove(tile)
    expect(session.getSnapshot().movePreview).toMatchObject({ unit: 'B.m1', tile })
    session.confirmMove()
    expect(session.getSnapshot().state.units.find((u) => u.id === 'B.m1')?.tile).toEqual(tile)
  })
})

describe('BattleSession: what the preview says is what the Unit really gets', () => {
  /** The enemies a real Unit can aim at after really moving to `tile`, read from the ordinary aiming snapshot. */
  function realReach(layout: Tiles, first: Side, unit: UnitId, tile: Tile, skill: string | null): { targets: UnitId[]; blocked: UnitId[] } {
    const session = newSession(layout, first)
    session.selectUnit(unit)
    session.input({ type: 'tapTile', tile })
    if (skill === null) {
      session.chooseAttack()
    } else {
      session.chooseSkill(skill)
    }
    const snapshot = session.getSnapshot()
    const aiming = skill === null ? snapshot.mode === 'attack' : snapshot.mode === 'skill'
    const targets = aiming ? snapshot.targets.flatMap((t) => unitAt(snapshot.state, t) ?? []) : []
    return { targets: sorted(targets), blocked: sorted(snapshot.blocked.map((b) => b.unit)) }
  }

  const cases = [
    ['open Board', MIDDLE, 'A', 'A.m1', false],
    ['open Board', MIDDLE, 'A', 'A.m2', false],
    ['a Unit in the line of fire', SCREENED, 'B', 'B.m2', true],
    ['a Unit in the line of fire', SCREENED, 'B', 'B.m1', false],
  ] as const
  for (const [name, layout, first, unit, mustBlock] of cases) {
    it(`${unit}, ${name}: every reachable tile gives the same attack options as moving there`, () => {
      const session = newSession(layout, first)
      session.selectUnit(unit)
      const tiles = session.getSnapshot().reachable
      expect(tiles.length).toBeGreaterThan(3)
      let reached = 0
      let blockedSeen = 0
      for (const tile of tiles) {
        session.previewMove(tile)
        const preview = session.getSnapshot().movePreview
        if (preview === null) throw new Error(`no preview for ${tile.x},${tile.y}`)
        for (const reach of preview.reach) {
          // Area skills (Burst) are checked on their own below: their targets come with a chosen centre.
          if (reach.skill !== null && data.skills[reach.skill]?.target === 'area') continue
          const real = realReach(layout, first, unit, tile, reach.skill)
          expect(sorted(reach.targets), `${unit} ${reach.skill ?? 'attack'} from ${tile.x},${tile.y}`).toEqual(real.targets)
          expect(sortedBlocked(reach), `${unit} ${reach.skill ?? 'attack'} blocked from ${tile.x},${tile.y}`).toEqual(real.blocked)
          reached += reach.targets.length
          blockedSeen += reach.blocked.length
        }
      }
      // The layout is not trivial: somewhere the Unit reaches an enemy, and where a Unit is in the way, line of sight blocks a shot.
      expect(reached).toBeGreaterThan(0)
      if (mustBlock) expect(blockedSeen).toBeGreaterThan(0)
    })
  }

  it('Burst (an area skill): the enemies reachable from a tile are those of all its legal centres', () => {
    const probe = newSession()
    probe.selectUnit('A.m2')
    let checked = 0
    for (const tile of probe.getSnapshot().reachable) {
      probe.previewMove(tile)
      const burst = probe.getSnapshot().movePreview!.reach.find((r) => r.skill === 'burst')
      if (burst === undefined) throw new Error('Burst should be one of the options')
      const session = newSession()
      session.selectUnit('A.m2')
      session.input({ type: 'tapTile', tile })
      session.chooseSkill('burst')
      const aiming = session.getSnapshot().mode === 'skill'
      const reached = new Set<UnitId>()
      for (const centre of aiming ? session.getSnapshot().tileChoices : []) {
        session.input({ type: 'tapTile', tile: centre })
        for (const t of session.getSnapshot().targets) {
          const id = unitAt(session.getSnapshot().state, t)
          if (id !== undefined) reached.add(id)
        }
      }
      expect(sorted(burst.targets), `Burst from ${tile.x},${tile.y}`).toEqual(sorted([...reached]))
      checked += reached.size
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('a skill that is not ready (cooldown) is left out', () => {
    const session = newSession()
    session.selectUnit('A.m1')
    const tile = session.getSnapshot().reachable[0]!
    session.previewMove(tile)
    const before = session.getSnapshot().movePreview!.reach.map((r) => r.skill)
    expect(before).toContain(null)
    expect(before).not.toContain('defend')
    expect(before).not.toContain('pack_howl')
  })
})

describe('BattleSession: Blink uses the same preview', () => {
  it('a Blink destination is previewed with the enemies reachable from it, then confirmMove teleports', () => {
    const session = newSession()
    session.selectUnit('A.m2')
    session.chooseSkill('blink')
    const choices = session.getSnapshot().tileChoices
    const destination = choices[0]
    if (destination === undefined) throw new Error('Blink has no destination')
    session.input({ type: 'tapTile', tile: destination })
    const preview = session.getSnapshot().movePreview
    expect(preview).toMatchObject({ unit: 'A.m2', tile: destination, skill: 'blink' })
    expect(preview!.reach.map((r) => r.skill)).not.toContain('blink')
    const stateBefore = session.getSnapshot().state
    expect(session.getSnapshot().state).toBe(stateBefore)
    session.confirmMove()
    const snapshot = session.getSnapshot()
    expect(snapshot.events.some((e) => e.type === 'unitTeleported')).toBe(true)
    expect(snapshot.state.units.find((u) => u.id === 'A.m2')?.tile).toEqual(destination)
  })

  it('every Blink destination gives the same reach as really blinking there', () => {
    const probe = newSession()
    probe.selectUnit('A.m2')
    probe.chooseSkill('blink')
    const choices = probe.getSnapshot().tileChoices
    expect(choices.length).toBeGreaterThan(2)
    for (const destination of choices) {
      const session = newSession()
      session.selectUnit('A.m2')
      session.chooseSkill('blink')
      session.input({ type: 'tapTile', tile: destination })
      const preview = session.getSnapshot().movePreview!
      session.confirmMove()
      const real = createBattleSession(session.getSnapshot().state)
      real.selectUnit('A.m2')
      real.chooseAttack()
      const snapshot = real.getSnapshot()
      const basic = preview.reach.find((r) => r.skill === null)!
      const expectedTargets = snapshot.mode === 'attack' ? sorted(snapshot.targets.flatMap((t) => unitAt(snapshot.state, t) ?? [])) : []
      expect(sorted(basic.targets), `Blink to ${destination.x},${destination.y}`).toEqual(expectedTargets)
    }
  })
})
