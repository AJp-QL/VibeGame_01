import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createBattle, menuBoards, menuScenarios, type BattleState } from '@mt/session'
import { dataHash, loadGameData, tileFromName, type Side } from '@mt/shared'
import { loadBundledGameData } from '../src/gameData.ts'
import { describeAction } from '../src/replay.ts'
import { skillSummary } from '../src/skillText.ts'
import { th } from '../src/strings.ts'

// The words web puts on what @mt/session exposes as data (ADR 0004: session
// has no player-facing text): Replay action lines, refusal reasons, skill
// text and the menu's names. The behaviour behind them is tested in
// packages/session/test.

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

/** A Battle in play on Scenario 1 / crossroads with the Units on `tiles` (Tamer, m1, m2 per side). */
function playing(tiles: Readonly<Record<Side, readonly [string, string, string]>>): BattleState {
  const placed = (side: Side) => {
    const [tamer, m1, m2] = tiles[side].map(t)
    return [tamer!, m1!, m2!] as const
  }
  return createBattle({
    scenario: data.scenarios.scenario_1!,
    board: data.boards.crossroads!,
    species: data.species,
    skills: data.skills,
    statuses: data.statuses,
    elementWheel: data.elementWheel,
    dice: { seed: '0123456789abcdef' },
    preset: { tiles: { A: placed('A'), B: placed('B') }, firstSide: 'A' },
    inspiration: { A: false, B: false },
  })
}

describe('Replay viewer lines', () => {
  it('Inspiration decisions name the side that answered', () => {
    const state = playing({ A: ['a1', 'd4', 'g1'], B: ['a7', 'd5', 'g7'] })
    expect(describeAction({ type: 'useInspiration', side: 'B' }, 'B', state, data)).toBe(th.replay.action.useInspiration('B'))
    expect(describeAction({ type: 'declineInspiration', side: 'A' }, 'A', state, data)).toBe(
      th.replay.action.declineInspiration('A'),
    )
  })

  it('Command and the Tamer skills', () => {
    const state = playing({ A: ['d2', 'c3', 'e2'], B: ['d7', 'c5', 'e6'] })
    expect(describeAction({ type: 'command', unit: 'A.tamer', target: 'A.m1', option: 'advantage' }, 'A', state, data)).toContain('Command')
    expect(describeAction({ type: 'useSkill', unit: 'A.tamer', skill: 'attune', tile: t('c3'), element: 'water' }, 'A', state, data)).toContain(
      'c3',
    )
    expect(describeAction({ type: 'useSkill', unit: 'A.tamer', skill: 'first_aid', target: 'A.m1' }, 'A', state, data)).toContain('First Aid')
  })

  it("names Burst's centre and target order, and Blink's destination", () => {
    const state = playing({ A: ['a1', 'c3', 'd2'], B: ['g7', 'd4', 'e5'] })
    const burst = describeAction({ type: 'useSkill', unit: 'A.m2', skill: 'burst', tile: t('d4'), targets: ['B.m2', 'B.m1'] }, 'A', state, data)
    expect(burst).toContain('d4')
    expect(burst.indexOf('Quillfox')).toBeLessThan(burst.indexOf('Tidewall'))
    expect(describeAction({ type: 'useSkill', unit: 'A.m2', skill: 'blink', tile: t('f3') }, 'A', state, data)).toContain('f3')
  })
})

describe('Quillfox text (ticket 10)', () => {
  it('a Hidden target says why it cannot be picked', () => {
    expect(th.rejection['target-hidden']).toContain('Hidden')
    expect(th.blockedHidden('Quillfox')).toContain('ระยะ 1')
  })

  it('skill text says Mark deals no damage and Camouflage needs forest', () => {
    expect(skillSummary(data.skills.mark!, data.statuses)).toContain(th.skillNoDamage)
    expect(skillSummary(data.skills.camouflage!, data.statuses)).toContain(th.skillRequiresTerrain(th.terrain.forest))
  })
})

describe('menu names (spec user stories 8–9)', () => {
  it('each Scenario has a Thai stage name', () => {
    expect(menuScenarios(data).map((s) => [s.id, th.menu.stage[s.id]])).toEqual([
      ['scenario_1', 'ต้นเกม'],
      ['scenario_2', 'กลางเกม'],
    ])
  })

  it('each Board has a Thai description', () => {
    for (const board of menuBoards(data)) expect(th.menu.boardBlurb[board.id], board.id).toBeTruthy()
  })
})

describe('bundled game data', () => {
  it('the bundled game data (as the browser loads it) has the same data hash as data/ read by Node', () => {
    expect(dataHash(loadBundledGameData())).toBe(dataHash(data))
  })
})
