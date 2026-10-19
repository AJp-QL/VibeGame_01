import '@fontsource/noto-sans-mono/400.css'
import '@fontsource/noto-sans-mono/700.css'
import '@fontsource/noto-sans-thai/400.css'
import '@fontsource/noto-sans-thai/700.css'
import '../src/styles.css'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { createBattle, createBattleSession, createPlayStats } from '@mt/session'
import { App } from '../src/App.tsx'
import { BattleView } from '../src/BattleView.tsx'
import { TerrainLegend } from '../src/TerrainLegend.tsx'
import { MiniBoard } from '../src/Menu.tsx'
import { loadBundledGameData } from '../src/gameData.ts'

document.documentElement.style.fontFamily = '"Noto Sans Mono", "Noto Sans Thai"'
const data = loadBundledGameData()
const boardId = new URLSearchParams(location.search).get('board') ?? 'grand_crossroads'
const board = data.boards[boardId]!
const session = createBattleSession(createBattle({
  scenario: data.scenarios.scenario_1!, board, species: data.species, skills: data.skills,
  statuses: data.statuses, elementWheel: data.elementWheel,
  dice: { seed: '0123456789abcdef' }, inspiration: { A: false, B: false },
  preset: { tiles: { A: [{ x: 0, y: 0 }, { x: 6, y: 4 }, { x: 0, y: 1 }], B: [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 0, y: 8 }] }, firstSide: 'A' },
}))
// The isolated visual server does not load the production Vite version define.
Object.assign(window, { sizedSession: session, __APP_VERSION__: 'visual' })
createRoot(document.getElementById('root')!).render(new URLSearchParams(location.search).has('menu')
  ? createElement(App, { stats: createPlayStats(null, () => new Date('2026-10-19T00:00:00Z')), feedbackUrl: null })
  : createElement('main', { className: 'battle' },
    createElement(BattleView, { session }), createElement(TerrainLegend), createElement(MiniBoard, { board }),
    createElement(MiniBoard, { board: data.boards.crossroads! }),
  ))
