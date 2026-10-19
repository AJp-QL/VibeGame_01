import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { createPlayStats, legalActions, openReplay, type BattleChoice, type BattleSession } from '@mt/session'
import { loadGameData, serializeReplay } from '@mt/shared'
import { boardZoom } from '@mt/battle/boardFit'
import { App } from '../src/App.tsx'
import { replayToExport, startBattle, startOver, undoBattle } from '../src/appScreens.ts'
import { FEEDBACK_FORM_URL, feedbackFormUrl } from '../src/config.ts'
import { FeedbackLink, Guide } from '../src/Playtest.tsx'
import { th } from '../src/strings.ts'

// Phaser needs a browser; the menu only needs the Board colours from @mt/battle.
vi.mock('@mt/battle', () => ({
  TERRAIN_COLOURS: new Proxy({}, { get: () => 0x336633 }),
  TERRAIN_GLYPHS: new Proxy({}, { get: () => null }),
  GLYPH_ALPHA: 0.5,
  glyphColour: () => 0xffffff,
  mountBattleGame: () => () => {},
}))

const DATA_DIR = fileURLToPath(new URL('../../../data/', import.meta.url))
function nodeGameData() {
  const files: Record<string, unknown> = {}
  for (const entry of readdirSync(DATA_DIR, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue
    const fullPath = join(entry.parentPath, entry.name)
    files[relative(DATA_DIR, fullPath).split(sep).join('/')] = JSON.parse(readFileSync(fullPath, 'utf8'))
  }
  return loadGameData(files)
}
const data = nodeGameData()

const FORM = 'https://forms.example.com/playtest'
const html = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element)

describe('feedback form link', () => {
  it('is hidden while no form URL is configured (the default)', () => {
    expect(FEEDBACK_FORM_URL).toBe('')
    expect(feedbackFormUrl('')).toBeNull()
    expect(feedbackFormUrl('   ')).toBeNull()
    expect(feedbackFormUrl('javascript:alert(1)')).toBeNull()
    expect(html(createElement(FeedbackLink, { url: null }))).toBe('')
    const menu = html(createElement(App, { stats: createPlayStats(null, () => new Date()), feedbackUrl: null }))
    expect(menu).not.toContain(th.playtest.feedback)
  })

  it('opens the form in a new tab when set, from the menu, the guide and the result screen', () => {
    expect(feedbackFormUrl(` ${FORM} `)).toBe(FORM)
    const link = html(createElement(FeedbackLink, { url: FORM }))
    expect(link).toContain(`href="${FORM}"`)
    expect(link).toContain('target="_blank"')
    expect(link).toContain('rel="noopener noreferrer"')
    expect(html(createElement(App, { stats: createPlayStats(null, () => new Date()), feedbackUrl: FORM }))).toContain(th.playtest.feedback)
    expect(html(createElement(Guide, { feedbackUrl: FORM, onBack: () => {} }))).toContain(th.playtest.feedback)
    // The result screen renders the same component (BattleScreen.tsx, its result panel).
    expect(readFileSync(new URL('../src/BattleScreen.tsx', import.meta.url), 'utf8')).toMatch(/<FeedbackLink url=\{feedbackUrl\} \/>/)
  })
})

describe('menu: playtester guide and stats export', () => {
  it('the menu offers the guide (วิธีเล่น), the stats export and the stats so far', () => {
    const stats = createPlayStats(null, () => new Date())
    stats.recordAppOpen()
    const menu = html(createElement(App, { stats, feedbackUrl: null }))
    expect(th.menu.guide).toBe('วิธีเล่น')
    expect(th.playtest.exportStats).toBe('ส่งออกสถิติการเล่น')
    expect(menu).toContain(th.menu.guide)
    expect(menu).toContain(th.playtest.exportStats)
    expect(menu).toContain(th.playtest.statsSummary(1, 0, 0, 1))
    expect(menu).toContain(th.playtest.statsMemoryOnly)
  })

  it('the guide covers how to play, exporting a Replay and the stats, and where to send them', () => {
    const guide = html(createElement(Guide, { feedbackUrl: null, onBack: () => {} }))
    for (const section of th.guide.sections) expect(guide).toContain(section.title)
    expect(guide).toContain(th.replay.export)
    expect(guide).toContain(th.playtest.exportStats)
    expect(guide).toContain(th.guide.back)
    // The Markdown copy says the same.
    const markdown = readFileSync(new URL('../../../docs/playtest/playtester-guide.md', import.meta.url), 'utf8')
    for (const section of th.guide.sections) {
      expect(markdown).toContain(section.title)
      for (const paragraph of section.body) expect(markdown).toContain(paragraph)
    }
  })
})

/** The human places on the first free tiles of its zone, then confirms. */
function humanDeploys(session: BattleSession): void {
  for (let i = 0; i < 3; i++) {
    const { state, selectedUnit } = session.getSnapshot()
    const deploy = legalActions(state).find((a) => a.type === 'deploy' && a.unit === selectedUnit)
    if (deploy?.type !== 'deploy') throw new Error('nothing to place')
    session.input({ type: 'tapTile', tile: deploy.to })
  }
  session.confirmDeployment()
}

/** Play to the end: the AI through aiStep, the human attacking when it can. */
function playToTheEnd(session: BattleSession): void {
  for (let i = 0; i < 3000 && session.getSnapshot().state.outcome === null; i++) {
    const snapshot = session.getSnapshot()
    const { state } = snapshot
    if (snapshot.screen === 'initiative' && !snapshot.aiToAct && state.pending === null) session.continueHotseat()
    else if (snapshot.aiToAct) session.aiStep()
    else if (state.pending?.kind === 'inspiration') session.declineInspiration()
    else if (state.pending?.kind === 'retreat') session.stayInPlace()
    else {
      const attack = legalActions(state).find((a) => a.type === 'basicAttack')
      if (attack?.type === 'basicAttack') {
        session.selectUnit(attack.unit)
        session.chooseAttack()
        session.input({ type: 'tapUnit', unit: attack.target })
        session.confirmAttack()
      } else session.endTurn()
    }
  }
}

describe('smoke: menu → Battle vs AI → result, with stats in the exported Replay', () => {
  // The session has no layout; the widths check the Board fits and stays crisp there (styles.css `.board`).
  for (const [label, viewportWidth, viewportHeight] of [
    ['desktop', 1280, 800],
    ['360 px', 360, 640],
  ] as const) {
    it(`${label}: plays to the result, counts the Battle, exports a Replay that opens`, () => {
      const box = Math.min(viewportWidth - 32, Math.max(224, Math.min(viewportWidth - 32, 0.75 * viewportHeight)))
      const zoom = boardZoom(box, box, 2, 224)
      expect(224 * zoom).toBeLessThanOrEqual(box)
      expect(Number.isInteger(zoom * 2)).toBe(true)

      const stats = createPlayStats(null, () => new Date('2026-10-16T10:00:00'))
      stats.recordAppOpen()
      const choice: BattleChoice = { scenarioId: 'scenario_1', boardId: 'crossroads', mode: 'ai', humanSide: 'A' }
      const screen = startBattle(data, choice, stats)
      if (screen.kind !== 'battle') throw new Error(`expected a Battle, got ${screen.kind}`)
      if (screen.session.getSnapshot().state.phase === 'deployment') humanDeploys(screen.session)
      playToTheEnd(screen.session)
      const { state } = screen.session.getSnapshot()
      expect(state.outcome).not.toBeNull()
      stats.recordBattleFinished(screen.statsIndex, state.outcome!, state.round)

      const replay = replayToExport(screen, stats, new Date('2026-10-16T10:30:00Z'))
      expect(replay.meta?.stats).toMatchObject({ appOpens: 1, battlesStarted: 1, battlesFinished: 1, daysPlayed: ['2026-10-16'] })
      expect(replay.meta?.stats).toMatchObject({ battles: [{ mode: 'ai', scenarioId: 'scenario_1', boardId: 'crossroads', humanSide: 'A' }] })
      const opened = openReplay(serializeReplay(replay), data)
      if (opened.kind !== 'ready') throw new Error(`expected a ready Replay, got ${opened.kind}`)
      expect(opened.replay.meta?.stats).toEqual(stats.read())
      expect(opened.steps.at(-1)?.state).toEqual(state)
    }, 60000)
  }
})

// Exercise the web boundary: a Start over is a new Battle, and Undo history survives export.
describe('Undo and Start over', () => {
  for (const mode of ['hotseat', 'ai'] as const) {
    it(`${mode}: preserves choices, changes Dice Seed and records abandonment`, () => {
      const stats = createPlayStats(null, () => new Date('2026-10-19T10:00:00Z'))
      const choice: BattleChoice = { scenarioId: 'scenario_1', boardId: 'shallows', mode, humanSide: 'B' }
      const screen = startBattle(data, choice, stats)
      if (screen.kind !== 'battle') throw new Error('expected Battle')
      const next = startOver(screen, stats)
      if (next.kind !== 'battle') throw new Error('expected new Battle')
      expect(next.choice).toEqual(choice)
      expect(next.diceSeed).not.toBe(screen.diceSeed)
      expect(next.session).not.toBe(screen.session)
      expect(stats.read().battles).toMatchObject([{ abandonedAt: '2026-10-19T10:00:00.000Z' }, { mode, boardId: 'shallows' }])
    })
  }

  it('counts accepted Undos and exports withdrawn actions in a ready format 2 Replay', () => {
    const stats = createPlayStats(null, () => new Date())
    const choice: BattleChoice = { scenarioId: 'scenario_1', boardId: 'crossroads', mode: 'hotseat', humanSide: 'A' }
    const screen = startBattle(data, choice, stats)
    if (screen.kind !== 'battle') throw new Error('expected Battle')
    const session = screen.session
    for (let i = 0; i < 30; i++) {
      const s = session.getSnapshot()
      if (s.screen !== 'board') session.continueHotseat()
      else if (s.state.phase === 'deployment') humanDeploys(session)
      else if (s.state.pending?.kind === 'inspiration') session.declineInspiration()
      else break
    }
    const move = legalActions(session.getSnapshot().state).find(a => a.type === 'move')
    if (move?.type !== 'move') throw new Error('expected Move')
    session.selectUnit(move.unit)
    session.input({ type: 'tapTile', tile: move.to })
    expect(session.getSnapshot().undo).not.toBeNull()
    undoBattle(screen, stats)
    undoBattle(screen, stats) // no offer: must not count a second Undo
    expect(stats.read().battles[0]?.undos).toBe(1)
    const replay = replayToExport(screen, stats, new Date())
    expect(replay.formatVersion).toBe(2)
    expect(replay.actions.at(-1)?.type).toBe('undo')
    const opened = openReplay(serializeReplay(replay), data)
    if (opened.kind !== 'ready') throw new Error('expected ready Replay')
    expect(opened.steps.some(step => step.undone)).toBe(true)
  })
})
