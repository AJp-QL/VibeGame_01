import '../src/styles.css'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { createBattle, createBattleSession } from '@mt/session'
import type { Board } from '@mt/shared'
import { BattleView } from '../src/BattleView.tsx'
import { MiniBoard } from '../src/Menu.tsx'
import { loadBundledGameData } from '../src/gameData.ts'

const data = loadBundledGameData()
const board: Board = {
  id: 'arena', name: 'Arena',
  terrain: Array.from({ length: 9 }, (_, y) => Array.from({ length: 9 }, (_, x) => (x + y) % 4 === 0 ? 'forest' : 'normal')),
}
const session = createBattleSession(createBattle({
  scenario: data.scenarios.scenario_1!, board, species: data.species, skills: data.skills,
  statuses: data.statuses, elementWheel: data.elementWheel,
  dice: { seed: '0123456789abcdef' }, inspiration: { A: false, B: false },
  preset: { tiles: { A: [{ x: 0, y: 0 }, { x: 6, y: 4 }, { x: 0, y: 1 }], B: [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 0, y: 8 }] }, firstSide: 'A' },
}))
Object.assign(window, { sizedSession: session })
createRoot(document.getElementById('root')!).render(createElement('main', { className: 'battle' },
  createElement(BattleView, { session }), createElement(MiniBoard, { board }),
  createElement(MiniBoard, { board: data.boards.crossroads! }),
))
