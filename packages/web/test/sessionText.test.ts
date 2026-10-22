import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { withMovePreview } from '../src/movePreviewSession.ts'
import { ActionPlanPanel } from '../src/ActionPlanPanel.tsx'
import { ThreatCount, ThreatZoneToggle } from '../src/ThreatZone.tsx'
import { UndoControls } from '../src/UndoControls.tsx'
import { MovePreviewPanel } from '../src/MovePreviewPanel.tsx'
import { createActionConfirmation } from '../src/actionConfirmation.ts'
import { StartUnitDialog } from '../src/StartUnitDialog.tsx'
import { TurnPanel } from '../src/TurnPanel.tsx'
import { SkillButtons } from '../src/SkillButtons.tsx'
import { TerrainLegend } from '../src/TerrainLegend.tsx'
import { PreviewCard } from '../src/ActionPreview.tsx'
import { logLines } from '../src/EventLog.tsx'
import { GAME_RANGE_RULES, LINE_OF_SIGHT_FROM, createBattleSession, createBattle, menuBoards, menuScenarios, type BattleState } from '@mt/session'
import { dataHash, loadGameData, tileFromName, type Board, type Side } from '@mt/shared'
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

/** A Scenario 1 Battle on the chosen Board (Crossroads by default); Tamer, m1, m2 per side. */
function playing(tiles: Readonly<Record<Side, readonly [string, string, string]>>, board: Board = data.boards.crossroads!): BattleState {
  const placed = (side: Side) => {
    const [tamer, m1, m2] = tiles[side].map(t)
    return [tamer!, m1!, m2!] as const
  }
  return createBattle({
    scenario: data.scenarios.scenario_1!,
    board,
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
      // Disable ticket 09's range rules for text tests; spread also accepts pre-09 BattleSetup.
      ...{ rangeRules: {} },
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


describe('phase 1.x activation warnings', () => {
  function movedSession() {
    const s = createBattleSession(playing({ A: ['a1', 'd4', 'g1'], B: ['a7', 'd5', 'g7'] }))
    s.selectUnit('A.m1')
    s.input({ type: 'tapTile', tile: s.getSnapshot().reachable[0]! })
    expect(s.getSnapshot().actionAtStake).toBe('A.m1')
    return s
  }

  it('holds a Move until confirmed, permits inspection, and starts the chosen Unit once', () => {
    const s = movedSession()
    const c = createActionConfirmation(s)
    c.session.input({ type: 'tapUnit', unit: 'B.m1' })
    expect(c.getPending()).toBeNull()
    c.session.input({ type: 'tapUnit', unit: 'A.m2' })
    expect(c.getPending()).toBeNull()
    const before = s.getSnapshot()
    c.session.input({ type: 'tapTile', tile: before.reachable[0]! })
    expect(s.getSnapshot()).toBe(before)
    expect(c.getPending()).toMatchObject({ current: 'A.m1', next: 'A.m2' })
    const html = renderToStaticMarkup(createElement(StartUnitDialog, { confirmation: c, data }))
    expect(html).toContain(th.startUnitBody('Fangrel', 'Wispling'))
    expect(html).toContain(th.startUnit('Wispling'))
    expect(html).toContain(th.returnToUnit('Fangrel'))
    c.confirm()
    expect(s.getSnapshot().state.activations.current).toBe('A.m2')
    expect(s.getSnapshot().revision).toBe(before.revision + 1)
    c.confirm()
    expect(s.getSnapshot().revision).toBe(before.revision + 1)
  })

  it('cancel returns to the original Unit without using its Action; Defend is guarded too', () => {
    const s = movedSession()
    const c = createActionConfirmation(s)
    c.session.selectUnit('A.m2')
    c.session.defend()
    const revision = s.getSnapshot().revision
    c.cancel()
    expect(s.getSnapshot()).toMatchObject({ selectedUnit: 'A.m1', actionAtStake: 'A.m1', revision })
    c.session.defend()
    expect(c.getPending()).toBeNull()
    expect(s.getSnapshot().state.units.find(u => u.id === 'A.m1')?.hasActed).toBe(true)
    c.session.selectUnit('A.m2')
    c.session.defend()
    expect(c.getPending()).toBeNull()
    expect(s.getSnapshot().state.activations.current).toBe('A.m2')
  })

  it('guards a confirmed skill, and discards a stale queued command', () => {
    const s = movedSession()
    const c = createActionConfirmation(s)
    c.session.selectUnit('A.m2')
    c.session.chooseSkill('blink')
    c.session.input({ type: 'tapTile', tile: s.getSnapshot().tileChoices[0]! })
    expect(s.getSnapshot().ready).toMatchObject({ type: 'useSkill', skill: 'blink' })
    c.session.confirmAttack()
    expect(c.getPending()).not.toBeNull()
    s.endTurn()
    const after = s.getSnapshot()
    c.confirm()
    expect(s.getSnapshot()).toBe(after)
  })

  it('also warns before Command starts the Tamer activation', () => {
    const s = createBattleSession(playing({ A: ['d2', 'c3', 'e2'], B: ['d7', 'c5', 'e6'] }))
    s.endTurn()
    s.continueHotseat()
    s.endTurn()
    s.continueHotseat()
    s.selectUnit('A.m1')
    s.input({ type: 'tapTile', tile: s.getSnapshot().reachable[0]! })
    const c = createActionConfirmation(s)
    c.session.selectUnit('A.tamer')
    c.session.chooseCommand()
    c.session.input({ type: 'tapUnit', unit: 'A.m2' })
    c.session.chooseCommandOption('advantage')
    expect(s.getSnapshot().ready).toMatchObject({ type: 'command' })
    c.session.confirmAttack()
    expect(c.getPending()).toMatchObject({ current: 'A.m1', next: 'A.tamer' })
    expect(s.getSnapshot().state.command).toBeNull()
    c.confirm()
    expect(s.getSnapshot().state.activations.current).toBe('A.tamer')
    expect(s.getSnapshot().state.command?.target).toBe('A.m2')
  })

  it('does not warn without an Action at stake or for an invalid action', () => {
    const s = createBattleSession(playing({ A: ['a1', 'd4', 'g1'], B: ['a7', 'd5', 'g7'] }))
    const c = createActionConfirmation(s)
    c.session.confirmAttack()
    c.session.defend()
    expect(c.getPending()).toBeNull()
    c.session.selectUnit('A.m1')
    c.session.defend()
    expect(c.getPending()).toBeNull()
    expect(s.getSnapshot().actionAtStake).toBeNull()
  })

  it('End Turn copy covers moved Units and Camouflage explains adjacent targeting', () => {
    expect(th.endTurnWarnBody('Fangrel')).toContain('เดินแล้วแต่ยังไม่ใช้ Action')
    expect(skillSummary(data.skills.camouflage!, data.statuses)).toContain(th.hiddenAdjacent)
    expect(skillSummary(data.skills.blink!, data.statuses)).not.toContain(th.hiddenAdjacent)
  })
})


describe('push-blocked log on a 9×9 Board', () => {
  it('keeps the destination name beyond the old seventh column', () => {
    const board: Board = { id: 'arena', name: 'Arena', terrain: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => 'normal')) }
    const state = playing({ A: ['a1', 'h5', 'a2'], B: ['i9', 'i5', 'a9'] }, board)
    expect(state.terrain).toHaveLength(9)
    expect(logLines({ type: 'pushBlocked', unit: 'A.m1', by: 'B.m2', tile: t('i5'), blockedBy: 'B.m1' }, id => id, state, data))
      .toEqual([th.logPushBlocked('A.m1', 'i5', 'B.m1')])
    expect(logLines({ type: 'pushBlocked', unit: 'A.m1', by: 'B.m2', tile: t('j5'), blockedBy: 'offBoard' }, id => id, state, data))
      .toEqual([th.logPushBlocked('A.m1', '', null)])
  })
})

describe('phase 1.x Move preview UI', () => {
  function previewSession() {
    return withMovePreview(createBattleSession(playing({ A: ['a1', 'd4', 'c3'], B: ['a7', 'e5', 'b6'] })))
  }

  it('Board taps preview and replace destinations, then confirmMove commits through the switch guard', () => {
    const raw = createBattleSession(playing({ A: ['a1', 'd4', 'c3'], B: ['a7', 'e5', 'b6'] }))
    raw.selectUnit('A.m1')
    raw.input({ type: 'tapTile', tile: raw.getSnapshot().reachable[0]! })
    const confirmation = createActionConfirmation(raw)
    const s = withMovePreview(confirmation.session)
    s.selectUnit('A.m2')
    const before = s.getSnapshot()
    s.input({ type: 'tapTile', tile: before.reachable[0]! })
    s.input({ type: 'tapTile', tile: before.reachable[1]! })
    expect(s.getSnapshot().movePreview?.tile).toEqual(before.reachable[1])
    expect(s.getSnapshot().state).toBe(before.state)
    expect(confirmation.getPending()).toBeNull()
    s.confirmMove()
    expect(confirmation.getPending()).toMatchObject({ current: 'A.m1', next: 'A.m2' })
    confirmation.confirm()
    expect(s.getSnapshot().state.units.find(unit => unit.id === 'A.m2')?.tile).toEqual(before.reachable[1])
  })

  it('renders the engine-provided attack reach and blocked targets without calculating them', () => {
    const s = previewSession()
    s.selectUnit('A.m2')
    s.input({ type: 'tapTile', tile: s.getSnapshot().reachable[0]! })
    const snapshot = s.getSnapshot()
    const panel = renderToStaticMarkup(createElement(MovePreviewPanel, { snapshot, session: s, data }))
    expect(panel).toContain(th.movePreviewNote)
    expect(panel).toContain(th.confirmMove)
    for (const reach of snapshot.movePreview!.reach) {
      expect(panel).toContain(reach.skill === null ? th.attack : data.skills[reach.skill]!.name)
    }
    const blocked = { ...snapshot, movePreview: { ...snapshot.movePreview!, options: [{ key: 'basicAttack::B.m1', kind: 'attack' as const, skill: null, target: 'B.m1', action: { type: 'basicAttack' as const, unit: 'A.m2', target: 'B.m1' } }], reach: [{ skill: null, targets: ['B.m1'], blocked: [{ unit: 'B.m2', tile: t('b6')!, reason: 'no-line-of-sight' as const, blockedBy: ['B.m1'] }] }] } }
    const blockedPanel = renderToStaticMarkup(createElement(MovePreviewPanel, { snapshot: blocked, session: s, data }))
    expect(blockedPanel).toMatch(/<button[^>]*>Tidewall \(ทีม B\)/)
    expect(blockedPanel).toContain(th.blockedBy('Quillfox (ทีม B)', 'Tidewall (ทีม B)', false))
  })

  it('Blink uses the preview panel and its own confirmation button', () => {
    const s = previewSession()
    s.selectUnit('A.m2')
    s.chooseSkill('blink')
    s.input({ type: 'tapTile', tile: s.getSnapshot().tileChoices[0]! })
    const snapshot = s.getSnapshot()
    const html = renderToStaticMarkup(createElement(TurnPanel, { snapshot, session: s, data }))
    expect(html).toContain(th.hintMovePreview)
    expect(html).toContain('>Blink</button>')
    expect(html).not.toContain(th.confirmSkill)
    s.input({ type: 'tapUnit', unit: 'A.m2' })
    expect(s.getSnapshot().movePreview).toBeNull()
  })

  it('never hints movement with no reachable tiles, including after Action with a free skill', () => {
    const s = previewSession()
    s.selectUnit('A.m2')
    const snapshot = s.getSnapshot()
    const noMove = { ...snapshot, reachable: [] }
    const html = renderToStaticMarkup(createElement(TurnPanel, { snapshot: noMove, session: s, data }))
    expect(html).not.toContain(th.hintMoveOrAttack)
    expect(html).not.toContain(th.hintMoveOrDefend)
    expect(html).not.toContain(th.hintMove)
    const acted = { ...noMove, state: { ...snapshot.state, units: snapshot.state.units.map(unit => unit.id === snapshot.selectedUnit ? { ...unit, hasActed: true } : unit) }, skills: [{ ...snapshot.skills[0]!, skill: 'camouflage', free: true as const, usable: true }] }
    const free = renderToStaticMarkup(createElement(TurnPanel, { snapshot: acted, session: s, data }))
    expect(free).toContain(th.hintFreeSkill('Camouflage'))
    expect(free).not.toContain(th.hintMoveAndFreeSkill('Camouflage'))
  })
})


describe('phase 1.x range rules text', () => {
  function markPreview(terrain: 'normal' | 'water', target = 'e2') {
    const board: Board = { id: 'range-text', name: 'Range text', terrain: Array.from({ length: 7 }, () => Array.from({ length: 7 }, () => terrain)) }
    const s = createBattleSession(playing({ A: [target, 'g2', 'g1'], B: ['g7', 'f7', 'a2'] }, board))
    s.endTurn()
    s.selectUnit('B.m2')
    s.chooseSkill('mark')
    s.input({ type: 'tapUnit', unit: 'A.tamer' })
    const snapshot = s.getSnapshot()
    expect(snapshot.preview?.type).toBe('attack')
    if (snapshot.preview?.type !== 'attack') throw new Error('Expected Mark attack preview')
    return snapshot.preview
  }

  it('shows long-range disadvantage even when rollModeSources is empty', () => {
    const preview = markPreview('normal')
    expect(preview.longRangeDisadvantage).toBe(true)
    expect(preview.rollModeSources).toEqual([])
    expect(preview.rollMode).toBe('disadvantage')
    const html = renderToStaticMarkup(createElement(PreviewCard, { preview, action: null, name: id => id, data }))
    expect(html).toContain(th.sourceLongRange(GAME_RANGE_RULES.longRangeDisadvantageFrom!))
    expect(html).toContain(th.previewNet.disadvantage)
    expect(html).not.toContain(th.previewNoSources)
  })

  it('shows the long-range cause and the net cancellation alongside terrain advantage', () => {
    const preview = markPreview('water')
    expect(preview.longRangeDisadvantage).toBe(true)
    expect(preview.rollMode).toBe('normal')
    const html = renderToStaticMarkup(createElement(PreviewCard, { preview, action: null, name: id => id, data }))
    expect(html).toContain(th.sourceLongRange(GAME_RANGE_RULES.longRangeDisadvantageFrom!))
    expect(html).toContain(th.sourceTerrainMatch(th.terrain.water))
    expect(html).toContain(th.previewNet.cancelled)
    const near = markPreview('normal', 'd2')
    expect(near.longRangeDisadvantage).toBeUndefined()
    const nearHtml = renderToStaticMarkup(createElement(PreviewCard, { preview: near, action: null, name: id => id, data }))
    expect(nearHtml).not.toContain(th.sourceLongRange(GAME_RANGE_RULES.longRangeDisadvantageFrom!))
    expect(nearHtml).toContain(th.previewNoSources)
  })

  it('names mountains when the session reports terrain-blocked targets without Unit blockers', () => {
    const raw = createBattleSession(playing({ A: ['e2', 'g2', 'g1'], B: ['g7', 'f7', 'a2'] }))
    raw.endTurn()
    const s = withMovePreview(raw)
    s.selectUnit('B.m2')
    s.chooseSkill('mark')
    expect(s.getSnapshot().blocked).toContainEqual(expect.objectContaining({ unit: 'A.tamer', reason: 'no-line-of-sight', blockedBy: [], blockedByTerrain: expect.arrayContaining([expect.any(Object)]) }))
    const targeting = renderToStaticMarkup(createElement(TurnPanel, { snapshot: s.getSnapshot(), session: s, data }))
    expect(targeting).toContain(th.blockedBy('Tamer (ทีม A)', '', true))
    s.cancel()
    s.input({ type: 'tapTile', tile: t('b3')! })
    const snapshot = s.getSnapshot()
    expect(snapshot.movePreview?.reach.flatMap(option => option.blocked)).toContainEqual(expect.objectContaining({ unit: 'A.tamer', reason: 'no-line-of-sight', blockedBy: [], blockedByTerrain: expect.arrayContaining([expect.any(Object)]) }))
    const panel = renderToStaticMarkup(createElement(MovePreviewPanel, { snapshot, session: s, data }))
    expect(panel).toContain(th.blockedBy('Tamer (ทีม A)', '', true))
  })

  it.each([
    { units: true, terrain: false, expected: 'Tamer (ทีม A): Tidewall (ทีม B) ขวางแนวเล็ง (line of sight)' },
    { units: false, terrain: true, expected: 'Tamer (ทีม A): ภูเขา ขวางแนวเล็ง (line of sight)' },
    { units: true, terrain: true, expected: 'Tamer (ทีม A): Tidewall (ทีม B), ภูเขา ขวางแนวเล็ง (line of sight)' },
    { units: false, terrain: false, expected: 'Tamer (ทีม A):  ขวางแนวเล็ง (line of sight)' },
  ])('renders session blockers in targeting and Move preview: $units Units, $terrain terrain', ({ units, terrain, expected }) => {
    const s = withMovePreview(createBattleSession(playing({ A: ['a1', 'd4', 'c3'], B: ['a7', 'e5', 'b6'] })))
    s.selectUnit('A.m2')
    s.input({ type: 'tapTile', tile: s.getSnapshot().reachable[0]! })
    const snapshot = s.getSnapshot()
    const blocked = [{ unit: 'A.tamer', tile: t('e2')!, reason: 'no-line-of-sight' as const,
      blockedBy: units ? ['B.m1'] : [], blockedByTerrain: terrain ? [t('c2')!, t('d2')!] : [] }]
    const targeting = renderToStaticMarkup(createElement(TurnPanel, { snapshot: { ...snapshot, movePreview: null, mode: 'attack', blocked }, session: s, data }))
    const panel = renderToStaticMarkup(createElement(MovePreviewPanel, {
      snapshot: { ...snapshot, movePreview: { ...snapshot.movePreview!, reach: [{ skill: null, targets: [], blocked }] } }, session: s, data,
    }))
    expect(targeting).toContain(expected)
    expect(panel).toContain(expected)
    if (!terrain) {
      expect(targeting).not.toContain('ภูเขา ขวางแนวเล็ง')
      expect(panel).not.toContain('ภูเขา ขวางแนวเล็ง')
    }
  })

  it('uses session thresholds at the skill description boundaries and parameterizes range strings', () => {
    const longRangeFrom = GAME_RANGE_RULES.longRangeDisadvantageFrom!
    const mark = data.skills.mark!
    expect(skillSummary({ ...mark, range: longRangeFrom - 1 }, data.statuses)).not.toContain(th.skillLongRange(longRangeFrom))
    expect(skillSummary({ ...mark, range: longRangeFrom }, data.statuses)).toContain(th.skillLongRange(longRangeFrom))
    expect(skillSummary({ ...mark, range: LINE_OF_SIGHT_FROM - 1 }, data.statuses)).not.toContain(th.skillLineOfSight)
    expect(skillSummary({ ...mark, range: LINE_OF_SIGHT_FROM }, data.statuses)).toContain(th.skillLineOfSight)
    expect(th.skillLongRange(7)).toBe('attack roll จากระยะ 7 ขึ้นไปได้ disadvantage')
    expect(th.sourceLongRange(7)).toBe('โจมตีจากระยะ 7 ขึ้นไป: ได้ disadvantage')
    expect(th.legendLongRange(7)).toBe('attack roll จากระยะ 7 ขึ้นไปได้ disadvantage รวมถึงการโจมตีแต่ละเป้าของ Burst')
    expect(th.legendLineOfSight(5)).toBe('โจมตีจากระยะ 5 ขึ้นไป: Unit และภูเขาที่อยู่บนเส้นระหว่างผู้โจมตีกับเป้าจะบัง ยกเว้นผู้โจมตีเป็น Flying')
    const legend = renderToStaticMarkup(createElement(TerrainLegend))
    expect(legend).toContain(th.legendLineOfSight(LINE_OF_SIGHT_FROM))
  })

  it('describes current ranges, distant attacks and mountain sight blockers', () => {
    for (const id of ['long_shot', 'element_bolt', 'pin']) expect(skillSummary(data.skills[id]!, data.statuses)).toContain(th.skillRange(3))
    expect(skillSummary(data.skills.mark!, data.statuses)).toContain(th.skillRange(4))
    for (const id of ['mark', 'burst']) expect(skillSummary(data.skills[id]!, data.statuses)).toContain(th.skillLongRange(GAME_RANGE_RULES.longRangeDisadvantageFrom!))
    expect(skillSummary(data.skills.mark!, data.statuses)).toContain(th.skillLineOfSight)
    expect(skillSummary(data.skills.blink!, data.statuses)).not.toContain(th.skillLongRange(GAME_RANGE_RULES.longRangeDisadvantageFrom!))
    const legend = renderToStaticMarkup(createElement(TerrainLegend))
    expect(legend).toContain(th.legendLongRange(GAME_RANGE_RULES.longRangeDisadvantageFrom!))
    expect(legend).toContain('Unit และภูเขา')
    expect(legend).toContain('Flying')
    expect(legend).not.toContain('terrain ไม่บังแนวเล็ง')
    expect(th.blockedBy('Quillfox', '', true)).toBe('Quillfox: ภูเขา ขวางแนวเล็ง (line of sight)')
    expect(th.rejection['no-line-of-sight']).toContain('ภูเขา')
  })
})


describe('Action plan UI', () => {
  function previewSession() {
    return withMovePreview(createBattleSession(playing({ A: ['a1', 'c5', 'c6'], B: ['g7', 'e5', 'c2'] })))
  }
  it('aims a badged enemy and changes origins without committing; the button sends the session plan', () => {
    const s = previewSession()
    s.selectUnit('A.m1')
    const before = s.getSnapshot()
    const enemy = before.attackable[0]!
    expect(enemy).toBeDefined()
    s.input({ type: 'tapUnit', unit: enemy.unit })
    let snapshot = s.getSnapshot()
    expect(snapshot.plan?.target).toBe(enemy.unit)
    expect(snapshot.state).toBe(before.state)
    const origin = snapshot.plan!.originChoices.find(origin => origin.via === 'move')!
    expect(origin).toBeDefined()
    s.input({ type: 'tapTile', tile: origin.tile })
    snapshot = s.getSnapshot()
    expect(snapshot.plan?.origin.tile).toEqual(origin.tile)
    expect(snapshot.state).toBe(before.state)
    const panel = renderToStaticMarkup(createElement(ActionPlanPanel, { snapshot, session: s, data }))
    expect(panel).toContain(th.actionPlan.title)
    expect(panel).toContain(th.actionPlan.rolls)
    expect(panel).toContain(th.actionPlan.confirm)
    const steps = snapshot.plan!.steps.length
    s.confirmPlan()
    expect(s.getSnapshot().actions.length).toBe(before.actions.length + steps)
    expect(s.getSnapshot().eventBatches).toHaveLength(steps)
  })

  it('tapping the planning Unit cancels even when staying cannot attack', () => {
    const s = previewSession()
    s.selectUnit('A.m1')
    const before = s.getSnapshot()
    const enemy = before.attackable.find(enemy => {
      s.aimTarget(enemy.unit)
      return !s.getSnapshot().plan!.originChoices.some(origin => origin.via === 'stay')
    })
    expect(enemy).toBeDefined()
    expect(s.getSnapshot().plan).not.toBeNull()
    s.input({ type: 'tapUnit', unit: 'A.m1' })
    expect(s.getSnapshot().plan).toBeNull()
    expect(s.getSnapshot().selectedUnit).toBe('A.m1')
    expect(s.getSnapshot().state).toBe(before.state)
    expect(s.getSnapshot().actions).toEqual(before.actions)
  })

  it('cancels only the tile-first plan, retaining its Move preview and selection', () => {
    const s = previewSession()
    s.selectUnit('A.m1')
    const destination = s.getSnapshot().reachable.find(tile => {
      s.previewMove(tile)
      return s.getSnapshot().movePreview!.options.some(option => option.kind === 'attack')
    })
    expect(destination).toBeDefined()
    const before = s.getSnapshot()
    const choice = before.movePreview!.options.find(option => option.kind === 'attack')!
    s.choosePlanAction(choice.key)
    expect(s.getSnapshot().plan).not.toBeNull()
    s.input({ type: 'tapUnit', unit: 'A.m1' })
    const after = s.getSnapshot()
    expect(after.plan).toBeNull()
    expect(after.movePreview?.tile).toEqual(destination)
    expect(after.selectedUnit).toBe(before.selectedUnit)
    expect(after.state).toBe(before.state)
    expect(after.actions).toEqual(before.actions)
  })

  it('asks before a confirmed plan abandons another Unit with an Action left', () => {
    const raw = previewSession()
    raw.selectUnit('A.m1')
    raw.input({ type: 'tapTile', tile: raw.getSnapshot().reachable[0]! })
    raw.confirmMove()
    const confirmation = createActionConfirmation(raw)
    const s = withMovePreview(confirmation.session)
    s.selectUnit('A.m2')
    const enemy = s.getSnapshot().attackable[0]!
    s.aimTarget(enemy.unit)
    const before = s.getSnapshot().state
    const origin = s.getSnapshot().plan!.originChoices.find(origin =>
      s.getSnapshot().reachable.some(tile => tile.x === origin.tile.x && tile.y === origin.tile.y))!
    expect(origin).toBeDefined()
    s.input({ type: 'tapTile', tile: origin.tile })
    expect(s.getSnapshot().plan?.origin.tile).toEqual(origin.tile)
    expect(s.getSnapshot().state).toBe(before)
    expect(confirmation.getPending()).toBeNull()
    s.confirmPlan()
    expect(s.getSnapshot().state).toBe(before)
    expect(confirmation.getPending()).toMatchObject({ current: 'A.m1', next: 'A.m2' })
    confirmation.confirm()
    expect(s.getSnapshot().state).not.toBe(before)
  })
})

describe('Threat zone advice', () => {
  it('renders the session count and estimate, with zero muted and overlay off by default', () => {
    const session = withMovePreview(createBattleSession(playing({ A: ['a1', 'c5', 'c6'], B: ['g7', 'e5', 'c2'] })))
    session.selectUnit('A.m2')
    session.previewMove(session.getSnapshot().reachable[0]!)
    const snapshot = session.getSnapshot()
    const panel = renderToStaticMarkup(createElement(MovePreviewPanel, { snapshot: { ...snapshot, movePreview: { ...snapshot.movePreview!, threat: 42 } }, session, data }))
    expect(panel).toContain(th.threatZone.count(42))
    expect(panel).toContain(th.threatZone.estimate)
    const zero = renderToStaticMarkup(createElement(ThreatCount, { count: 0 }))
    expect(zero).toContain('muted')
    expect(zero).toContain(th.threatZone.count(0))
    const toggle = renderToStaticMarkup(createElement(ThreatZoneToggle, { visible: false, onChange() {} }))
    expect(toggle).toContain('aria-pressed="false"')
    expect(toggle).toContain(th.threatZone.toggle)
    expect(toggle).not.toContain(th.threatZone.legend)
    expect(toggle).toContain(th.threatZone.boardEstimate)
    const previewToggle = renderToStaticMarkup(createElement(ThreatZoneToggle, { visible: true, previewOpen: true, onChange() {} }))
    expect(previewToggle).not.toContain(th.threatZone.boardEstimate)
    expect(previewToggle).not.toContain(th.threatZone.estimate)
  })
})

describe('Undo text', () => {
  it('names the session safe point, disables unavailable Undo, and hides it during AI Turns', () => {
    const session = createBattleSession(playing({ A: ['a1', 'd4', 'g1'], B: ['a7', 'd5', 'g7'] }))
    const render = (snapshot: ReturnType<typeof session.getSnapshot>) => renderToStaticMarkup(createElement(UndoControls, { snapshot, onUndo() {} }))
    const snapshot = session.getSnapshot()
    expect(render(snapshot)).toContain(th.undo.unavailable)
    expect(render(snapshot)).toContain('disabled')
    expect(render({ ...snapshot, undo: { to: 'turnStart', actions: 1 } })).toContain(th.undo.to.turnStart)
    expect(render({ ...snapshot, undo: { to: 'lastRoll', actions: 1 } })).toContain(th.undo.to.lastRoll)
    expect(render({ ...snapshot, aiSide: snapshot.state.sideToAct })).toBe('')
    expect(th.battleMenu.startOverConfirm).toContain('Dice Seed ใหม่')
    expect(th.replay.showUndone).toContain('Undo')
  })
})
