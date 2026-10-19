import '@fontsource/noto-sans-mono/400.css'
import '@fontsource/noto-sans-thai/400.css'
import '../src/styles.css'
import { createElement, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createBattle, createBattleSession, createPlayStats, openReplay, ENGINE_VERSION } from '@mt/session'
import { tileFromName as tile, dataHash } from '@mt/shared'
import { BattleScreen } from '../src/BattleScreen.tsx'
import { ReplayScreen } from '../src/ReplayScreen.tsx'
import { startOver, undoBattle, type Screen } from '../src/appScreens.ts'
import { loadBundledGameData } from '../src/gameData.ts'

const data = loadBundledGameData()
const choice = { scenarioId: 'scenario_1', boardId: 'crossroads', mode: 'hotseat', humanSide: 'A' } as const
const diceSeed = '0123456789abcdef'
const preset = { tiles: { A: [tile('a1'), tile('c5'), tile('c6')], B: [tile('g7'), tile('e5'), tile('c2')] }, firstSide: 'A' } as const
const session = createBattleSession(createBattle({
  scenario: data.scenarios.scenario_1!, board: data.boards.crossroads!, species: data.species,
  skills: data.skills, statuses: data.statuses, elementWheel: data.elementWheel,
  dice: { seed: diceSeed }, inspiration: { A: false, B: false }, preset,
}))
const stats = createPlayStats(null, () => new Date('2026-10-19T00:00:00Z'))
const initial: Extract<Screen, { kind: 'battle' }> = { kind: 'battle', data, choice, diceSeed, session, statsIndex: stats.recordBattleStarted(choice) }
let current: Screen = initial
Object.assign(window, { undoReview: { getScreen: () => current, stats, session } })
function Review() {
  const [screen, setScreen] = useState<Screen>(initial)
  current = screen
  if (screen.kind !== 'battle') return null
  return createElement(BattleScreen, {
    key: screen.diceSeed, data, session: screen.session, diceSeed: screen.diceSeed,
    onPlayAgain() {}, onMenu() {}, onExportReplay() {}, onFinished() {}, feedbackUrl: null,
    onUndo: () => undoBattle(screen, stats), onStartOver: () => setScreen(startOver(screen, stats)),
  })
}
if (new URLSearchParams(location.search).has('replay')) {
  session.selectUnit('A.m2')
  session.input({ type: 'tapTile', tile: tile('d5')! })
  session.undo()
  const replay = { format: 'monster-tactics-replay', formatVersion: 2, engineVersion: ENGINE_VERSION, dataHash: dataHash(data), ...choice, diceSeed, preset, actions: session.getSnapshot().recorded } as const
  const opened = openReplay(JSON.stringify(replay), data)
  if (opened.kind !== 'ready') throw new Error(JSON.stringify(opened))
  createRoot(document.getElementById('root')!).render(createElement(ReplayScreen, { data, opened, onMenu() {} }))
} else createRoot(document.getElementById('root')!).render(createElement(Review))
