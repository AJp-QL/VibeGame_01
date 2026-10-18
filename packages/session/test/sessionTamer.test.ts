import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadGameData, tileFromName, tileName, type Side } from '@mt/shared'
import { createBattle, NO_RANGE_RULES, type Action } from '@mt/engine'
import { createBattleSession } from '../src/session.ts'
import { kitCrossroads, kitSkills } from './kit.ts'

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
const t = tileFromName

// Tamer A on d2 with Fangrel (A.m1) on c3 and Wispling (A.m2) on e2 next to it;
// Tamer B on d7, Tidewall (B.m1) on c5, Quillfox (B.m2) on e6.
const TILES: Readonly<Record<Side, readonly [string, string, string]>> = { A: ['d2', 'c3', 'e2'], B: ['d7', 'c5', 'e6'] }

function playingSession() {
  const tiles = (side: Side) => {
    const [tamer, m1, m2] = TILES[side].map(t)
    return [tamer!, m1!, m2!] as const
  }
  return createBattleSession(
    createBattle({
      scenario: data.scenarios.scenario_1!,
      board: kitCrossroads(data.boards.crossroads!),
      rangeRules: NO_RANGE_RULES,
      species: data.species,
      skills: kitSkills(data.skills),
      statuses: data.statuses,
      elementWheel: data.elementWheel,
      dice: { seed: '0123456789abcdef' },
      preset: { tiles: { A: tiles('A'), B: tiles('B') }, firstSide: 'A' },
      inspiration: { A: false, B: false },
    }),
  )
}

describe('BattleSession: Command (Monster in range → option → confirm)', () => {
  it('is not offered on the first Turn; from the second, lights up the Monsters it may order', () => {
    const s = playingSession()
    s.input({ type: 'tapUnit', unit: 'A.tamer' })
    expect(s.getSnapshot().canCommand).toBe(false)
    s.chooseCommand()
    expect(s.getSnapshot().mode).toBe('move')
    s.endTurn()
    s.endTurn()

    s.input({ type: 'tapUnit', unit: 'A.tamer' })
    expect(s.getSnapshot().canCommand).toBe(true)
    s.chooseCommand()
    let snap = s.getSnapshot()
    expect(snap).toMatchObject({ mode: 'command', pendingTarget: null, ready: null })
    expect(snap.targets.map(tileName)).toEqual(['c3', 'e2'])

    s.input({ type: 'tapUnit', unit: 'A.m1' })
    snap = s.getSnapshot()
    expect(snap).toMatchObject({ pendingTarget: 'A.m1', pendingOption: null, ready: null })
    s.chooseCommandOption('advantage')
    snap = s.getSnapshot()
    const action: Action = { type: 'command', unit: 'A.tamer', target: 'A.m1', option: 'advantage' }
    expect(snap.ready).toEqual(action)
    expect(snap.preview).toBeNull()

    // Cancel steps back: the option, then the Monster, then Command itself.
    s.cancel()
    expect(s.getSnapshot()).toMatchObject({ mode: 'command', pendingTarget: 'A.m1', pendingOption: null })
    s.chooseCommandOption('move')
    s.confirmAttack()
    snap = s.getSnapshot()
    expect(snap.actions.at(-1)).toEqual({ ...action, option: 'move' })
    expect(snap.state.command).toMatchObject({ target: 'A.m1', option: 'move' })
    expect(snap.log.at(-1)).toEqual({ type: 'commandIssued', unit: 'A.tamer', target: 'A.m1', option: 'move' })
    // One per Turn: no more Command, but the Tamer stays selected with its Move and Action.
    expect(snap.selectedUnit).toBe('A.tamer')
    expect(snap.canCommand).toBe(false)
    expect(snap.reachable.length).toBeGreaterThan(0)
    expect(snap.skills.some((b) => b.usable)).toBe(true)
  })
})

describe('BattleSession: Tamer skills', () => {
  it('Attune: tiles next to the Tamer (a tap on a Unit picks its tile), then an element, then the preview', () => {
    const s = playingSession()
    s.input({ type: 'tapUnit', unit: 'A.tamer' })
    s.chooseSkill('attune')
    let snap = s.getSnapshot()
    expect(snap.tileChoices.map(tileName)).toEqual(['c1', 'd1', 'e1', 'c2', 'e2', 'c3', 'd3', 'e3'])
    expect(snap.elementChoices).toEqual([])
    s.input({ type: 'tapUnit', unit: 'A.m1' })
    snap = s.getSnapshot()
    expect(snap.pendingTile).toEqual(t('c3'))
    expect(snap.elementChoices).toEqual(['forest', 'water', 'mountain', 'desert', 'light', 'dark'])
    expect(snap.ready).toBeNull()
    s.chooseElement('forest')
    snap = s.getSnapshot()
    expect(snap.ready).toEqual({ type: 'useSkill', unit: 'A.tamer', skill: 'attune', tile: t('c3'), element: 'forest' })
    expect(snap.preview).toMatchObject({ type: 'terrain', from: 'normal', to: 'forest', turns: 3 })
    s.confirmAttack()
    snap = s.getSnapshot()
    expect(snap.state.terrain[2]?.[2]).toBe('forest')
    expect(snap.state.attuned).toHaveLength(1)
    expect(snap.log.at(-1)).toMatchObject({ type: 'terrainChanged', to: 'forest' })
  })

  it('First Aid lights up the Tamer and the allies next to it; Cover only the allied Monsters', () => {
    const s = playingSession()
    s.input({ type: 'tapUnit', unit: 'A.tamer' })
    s.chooseSkill('first_aid')
    expect(s.getSnapshot().targets.map(tileName)).toEqual(['d2', 'c3', 'e2'])
    s.input({ type: 'tapUnit', unit: 'A.m1' })
    expect(s.getSnapshot().preview).toMatchObject({ type: 'heal', target: 'A.m1', min: 0, max: 7 })
    s.cancel()
    s.cancel()
    s.chooseSkill('cover')
    expect(s.getSnapshot().targets.map(tileName)).toEqual(['c3', 'e2'])
    s.input({ type: 'tapUnit', unit: 'A.m2' })
    s.confirmAttack()
    expect(s.getSnapshot().state.units.find((u) => u.id === 'A.m2')?.coveredBy).toBe('A.tamer')
  })
})
