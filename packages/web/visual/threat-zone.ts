import '@fontsource/noto-sans-mono/400.css'
import '@fontsource/noto-sans-mono/700.css'
import '@fontsource/noto-sans-thai/400.css'
import '@fontsource/noto-sans-thai/700.css'
import '../src/styles.css'
import { createElement, useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { createBattle, createBattleSession } from '@mt/session'
import { tileFromName as tile } from '@mt/shared'
import { ThreatZoneToggle } from '../src/ThreatZone.tsx'
import { BattleScene } from '@mt/battle'
import { BattleView } from '../src/BattleView.tsx'
import { isActionSheetOpen } from '../src/ActionsFromHere.tsx'
import { TurnPanel } from '../src/TurnPanel.tsx'
import { StartUnitDialog } from '../src/StartUnitDialog.tsx'
import { createActionConfirmation } from '../src/actionConfirmation.ts'
import { withMovePreview } from '../src/movePreviewSession.ts'
import { loadBundledGameData } from '../src/gameData.ts'

let mountedScene: BattleScene
const createScene = BattleScene.prototype.create
BattleScene.prototype.create = function () { mountedScene = this; createScene.call(this) }

document.documentElement.style.fontFamily = '"Noto Sans Mono", "Noto Sans Thai"'
const data = loadBundledGameData()
const side = new URLSearchParams(location.search).get('side') === 'B' ? 'B' : 'A'
const source = createBattleSession(createBattle({
  scenario: data.scenarios.scenario_1!, board: data.boards.crossroads!, species: data.species,
  skills: data.skills, statuses: data.statuses, elementWheel: data.elementWheel,
  dice: { seed: '0123456789abcdef' }, inspiration: { A: false, B: false },
  preset: { tiles: { A: [tile('a1'), tile('c5'), tile('c6')], B: [tile('g7'), tile('e5'), tile('c2')] }, firstSide: side },
}))
const confirmation = createActionConfirmation(source)
const session = withMovePreview(confirmation.session)
session.selectUnit(`${side}.m2`)
Object.assign(window, { threatSession: session })
function Review() {
  const [visible, setVisible] = useState(false)
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot)
  const sheetOpen = isActionSheetOpen(snapshot)
  const tools = createElement(ThreatZoneToggle, { visible, previewOpen: snapshot.plan === null && snapshot.movePreview !== null, onChange: setVisible })
  return createElement('main', { className: 'battle' },
    createElement(StartUnitDialog, { confirmation, data }),
    !sheetOpen && tools,
    createElement(BattleView, { session, showThreatZone: visible }),
    createElement(TurnPanel, { key: snapshot.revision, snapshot, session, data, tools: sheetOpen ? tools : null }),
  )
}
await document.fonts.ready
createRoot(document.getElementById('root')!).render(createElement(Review))

// Exercise a live React toggle while the real renderer owns an in-flight walk.
Object.assign(window, { startThreatAnimation: async () => {
  const scene = mountedScene
  const game = scene.game
  const observed = scene as unknown as { unitViews: Map<string, { container: { x: number; y: number } }> }
  game.loop.stop()
  let now = 1_000_000
  Date.now = () => now
  scene.tweens.startTime = now; scene.tweens.prevTime = now; scene.tweens.time = 0; scene.tweens.nextTime = 0
  const destination = session.getSnapshot().reachable.at(-1)!
  session.previewMove(destination)
  session.confirmMove()
  now += 10; game.step(now, 10)
  const view = observed.unitViews.get('A.m2')!.container
  const tweens = scene.tweens.getTweensOf(view)
  const position = { x: view.x, y: view.y }
  Object.assign(window, { checkThreatAnimation: () => {
    const preserved = tweens.length > 0 && tweens.every(tween => scene.tweens.getTweensOf(view).includes(tween))
      && view.x === position.x && view.y === position.y
    for (let elapsed = 0; elapsed < 2_000; elapsed += 10) { now += 10; game.step(now, 10) }
    return { preserved, landed: view.x === (destination.x + .5) * 32 && view.y === (destination.y + .5) * 32 }
  } })
} })
