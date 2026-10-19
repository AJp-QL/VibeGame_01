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
import { BattleView } from '../src/BattleView.tsx'
import { TurnPanel } from '../src/TurnPanel.tsx'
import { StartUnitDialog } from '../src/StartUnitDialog.tsx'
import { createActionConfirmation } from '../src/actionConfirmation.ts'
import { withMovePreview } from '../src/movePreviewSession.ts'
import { loadBundledGameData } from '../src/gameData.ts'

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
  return createElement('main', { className: 'battle' },
    createElement(StartUnitDialog, { confirmation, data }),
    createElement(ThreatZoneToggle, { visible, onChange: setVisible }),
    createElement(BattleView, { session, showThreatZone: visible }),
    createElement(TurnPanel, { key: snapshot.revision, snapshot, session, data }),
  )
}
await document.fonts.ready
createRoot(document.getElementById('root')!).render(createElement(Review))
