import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { withMovePreview } from '../src/movePreviewSession.ts'
import { MovePreviewPanel } from '../src/MovePreviewPanel.tsx'
import { createActionConfirmation } from '../src/actionConfirmation.ts'
import { StartUnitDialog } from '../src/StartUnitDialog.tsx'
import { TurnPanel } from '../src/TurnPanel.tsx'
import { SkillButtons } from '../src/SkillButtons.tsx'
import { PreviewCard } from '../src/ActionPreview.tsx'
import { logLines } from '../src/EventLog.tsx'
import { createBattleSession, createBattle, menuBoards, menuScenarios, type BattleState } from '@mt/session'
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
    const blocked = { ...snapshot, movePreview: { ...snapshot.movePreview!, reach: [{ skill: null, targets: ['B.m1'], blocked: [{ unit: 'B.m2', tile: t('b6')!, reason: 'no-line-of-sight' as const, blockedBy: ['B.m1'] }] }] } }
    const blockedPanel = renderToStaticMarkup(createElement(MovePreviewPanel, { snapshot: blocked, session: s, data }))
    expect(blockedPanel).toContain(th.movePreviewTargets('Tidewall (ทีม B)'))
    expect(blockedPanel).toContain(th.blockedBy('Quillfox (ทีม B)', 'Tidewall (ทีม B)'))
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
