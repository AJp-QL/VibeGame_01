import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { TurnPanel } from '../src/TurnPanel.tsx'
import { SkillButtons } from '../src/SkillButtons.tsx'
import { PreviewCard } from '../src/ActionPreview.tsx'
import { logLines } from '../src/EventLog.tsx'
import { createBattleSession, createBattle, menuBoards, menuScenarios, type BattleState } from '@mt/session'
import { dataHash, loadGameData, tileFromName, type Side } from '@mt/shared'
import { loadBundledGameData } from '../src/gameData.ts'
import { describeAction } from '../src/replay.ts'
import { skillSummary } from '../src/skillText.ts'
import { th } from '../src/strings.ts'

// The words web puts on what @mt/session exposes as data (ADR 0004: session
// has no player-facing text): Replay action lines, refusal reasons, skill
// text and the menu's names. The behaviour behind them is tested in
// packages/session/test.

// Rendering text in Node only needs the palette, not Phaser's browser runtime.
vi.mock('@mt/battle', () => import('../../battle/src/palette.ts'))

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

describe('Camouflage free skill text (ticket 28)', () => {
  function session(quillfoxTile = 'd7') {
    return createBattleSession(createBattle({
      scenario: data.scenarios.scenario_1!, board: data.boards.crossroads!,
      species: data.species, skills: data.skills, statuses: data.statuses,
      elementWheel: data.elementWheel, dice: { seed: '0123456789abcdef' },
      preset: { tiles: { A: [t('a1')!, t('e4')!, t('c3')!], B: [t('g7')!, t('f3')!, t(quillfoxTile)!] }, firstSide: 'B' },
      inspiration: { A: false, B: false },
    }))
  }

  it('mentions both Move and the free skill after Long Shot before moving (ticket 30)', () => {
    const s = session('e7')
    s.selectUnit('B.m2')
    s.chooseSkill('long_shot')
    s.input({ type: 'tapUnit', unit: 'A.m1' })
    expect(s.getSnapshot().ready).toMatchObject({ type: 'useSkill', skill: 'long_shot' })
    s.confirmAttack()
    const snapshot = s.getSnapshot()
    expect(snapshot.rejection).toBeNull()
    expect(snapshot.units.find(u => u.id === 'B.m2')).toMatchObject({ hasMoved: false, hasActed: true })
    expect(snapshot.skills.find(b => b.skill === 'camouflage')).toMatchObject({ free: true, usable: true })
    expect(th.hintMoveAndFreeSkill('Camouflage')).toBe('ยังเดินได้ และยังใช้ Camouflage ได้ (ไม่ใช้ Action)')
    const panel = renderToStaticMarkup(createElement(TurnPanel, { snapshot, session: s, data }))
    expect(panel).toContain(`<p class="hint">${th.hintMoveAndFreeSkill('Camouflage')}</p>`)

    s.input({ type: 'tapTile', tile: t('f7')! })
    const moved = s.getSnapshot()
    expect(moved.units.find(u => u.id === 'B.m2')).toMatchObject({ hasMoved: true, hasActed: true })
    expect(renderToStaticMarkup(createElement(TurnPanel, { snapshot: moved, session: s, data }))).not.toContain(th.hintMoveAndFreeSkill('Camouflage'))
  })

  it('offers the remaining free skill after Move and Action, then previews and logs its cost', () => {
    const s = session()
    s.selectUnit('B.m2')
    s.input({ type: 'tapTile', tile: t('e7')! })
    s.defend()
    const snapshot = s.getSnapshot()
    expect(snapshot.units.find(u => u.id === 'B.m2')).toMatchObject({ hasMoved: true, hasActed: true })
    expect(snapshot.skills.find(b => b.skill === 'camouflage')).toMatchObject({ free: true, usable: true })
    const panel = renderToStaticMarkup(createElement(TurnPanel, { snapshot, session: s, data }))
    expect(panel).toContain(th.hintFreeSkill('Camouflage'))
    expect(panel).not.toContain(th.hintNothingLeft)
    expect(panel).toContain(th.skillFree)
    s.chooseSkill('camouflage')
    const aimed = s.getSnapshot()
    expect(aimed.preview?.type).toBe('effect')
    const preview = renderToStaticMarkup(createElement(PreviewCard, {
      preview: aimed.preview!, action: aimed.ready, name: id => id, data,
    }))
    expect(preview).toContain(`Camouflage ${th.noAction}`)
    s.confirmAttack()
    const after = s.getSnapshot()
    const lines = after.log.flatMap(event => logLines(event, id => id, after.state, data))
    expect(lines).toContain(`B.m2 ใช้ Camouflage ${th.noAction}`)
  })

  it('explains the disabled zero-cooldown button after using Camouflage', () => {
    const s = session()
    s.selectUnit('B.m2')
    s.input({ type: 'tapTile', tile: t('e7')! })
    s.chooseSkill('camouflage')
    s.confirmAttack()
    const snapshot = s.getSnapshot()
    expect(snapshot.skills.find(b => b.skill === 'camouflage')).toMatchObject({ usedThisActivation: true, usable: false, cooldown: 0 })
    const buttons = renderToStaticMarkup(createElement(SkillButtons, { snapshot, session: s, data }))
    expect(buttons).toMatch(/disabled=""[^>]*><span class="skill-name">Camouflage/)
    expect(buttons).toContain(th.skillUsedThisActivation)
    expect(renderToStaticMarkup(createElement(TurnPanel, { snapshot, session: s, data }))).not.toContain(th.hintFreeSkill('Camouflage'))
  })

  it('only describes free skills as free, and only hints when one is usable', () => {
    expect(skillSummary(data.skills.camouflage!, data.statuses)).toContain('ไม่ใช้ Action และไม่ใช้การเดิน, 1 ครั้งต่อ activation')
    expect(skillSummary(data.skills.long_shot!, data.statuses)).not.toContain(th.skillFree)
    const s = session()
    s.selectUnit('B.m2')
    s.defend() // d7 is outside forest: no legal Camouflage remains.
    expect(s.getSnapshot().skills.some(b => b.free === true && b.usable)).toBe(false)
    expect(renderToStaticMarkup(createElement(TurnPanel, { snapshot: s.getSnapshot(), session: s, data }))).not.toContain(th.hintFreeSkill('Camouflage'))
    const state = s.getSnapshot().state
    expect(logLines({ type: 'skillUsed', unit: 'B.m1', skill: 'counter', targets: ['B.m1'] }, id => id, state, data).join('')).not.toContain(th.noAction)
  })
})
