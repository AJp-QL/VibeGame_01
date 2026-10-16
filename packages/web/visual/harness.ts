import '@fontsource/noto-sans-mono/700.css'
import '@fontsource/noto-sans-thai/700.css'
import { createBattleGame, fitBattleGame, type BattleScene } from '@mt/battle'
import { createBattleSession, createReplayPlayer, openReplay, type BattleSessionPort } from '@mt/session'
import { loadBundledGameData } from '../src/gameData.ts'
import { th } from '../src/strings.ts'
import { cases } from './cases.ts'

const fixtures = import.meta.glob<string>('./fixtures/*.json', { eager: true, query: '?raw', import: 'default' })
const data = loadBundledGameData()
const name = new URLSearchParams(location.search).get('case')
const capture = cases.find(c => c.name === name)
if (!capture) throw new Error(`Unknown visual case: ${name}`)
const opened = openReplay(fixtures[`./fixtures/${capture.fixture}.json`]!, data)
if (opened.kind !== 'ready') throw new Error(`${capture.fixture}: ${JSON.stringify(opened)}`)
const player = createReplayPlayer(opened.initial, opened.steps)
const event = 'event' in capture ? capture.event : null
const index = event ? opened.steps.findIndex(s => s.events.some(e => e.type === event)) : -1
if (event && index < 0) throw new Error(`${capture.fixture} has no ${event}`)
// Move the genuine Replay player to just BEFORE the animated action, before mounting.
if (index >= 0) for (let i = 0; i < index; i++) player.forward()
else player.last()

let port: BattleSessionPort = player
if ('mode' in capture && capture.mode === 'burst') {
  const session = createBattleSession(player.getSnapshot().state)
  session.selectUnit('A.m2')
  session.chooseSkill('burst')
  session.input({ type: 'tapTile', tile: { x: 4, y: 3 } })
  session.input({ type: 'tapUnit', unit: 'B.m2' })
  session.input({ type: 'tapUnit', unit: 'B.m1' })
  port = session
}

await document.fonts.load('bold 10px "Noto Sans Mono"')
await document.fonts.load('bold 10px "Noto Sans Thai"', th.boardCounter)
await document.fonts.ready
const parent = document.querySelector<HTMLElement>('#board')!
const game = createBattleGame(parent, port, {
  miss: th.boardMiss, critical: th.boardCritical, counter: th.boardCounter, pushBlocked: th.boardPushBlocked,
  fontFamily: '"Noto Sans Mono", "Noto Sans Thai"',
})
// Stop the normal RAF loop as soon as the scene exists. Only explicit fixed steps run below.
await new Promise<void>(resolve => {
  const ready = () => {
    if (!game.scene.isActive('battle')) { requestAnimationFrame(ready); return }
    game.loop.stop()
    resolve()
  }
  requestAnimationFrame(ready)
})
fitBattleGame(game, parent)
const scene = game.scene.getScene('battle') as BattleScene
let now = 1_000_000
Date.now = () => now
// TweenManager uses Date.now, while the scene Clock takes the supplied delta.
// Reset its wall-clock origin once; no state/events/view objects are fabricated.
scene.tweens.startTime = now
scene.tweens.prevTime = now
scene.tweens.time = 0
scene.tweens.nextTime = 0
if (index >= 0) player.forward()
for (let elapsed = 0; elapsed < capture.at; elapsed += 10) {
  now += 10
  game.step(now, 10)
}
// Render still frames too, without advancing a tween.
if (capture.at === 0) game.step(now, 0)
const snapshot = port.getSnapshot()
const diagnostics = {
  name: capture.name,
  step: player.getSnapshot().step,
  events: snapshot.events,
  area: snapshot.area,
  chosenTargets: snapshot.chosenTargets,
  state: snapshot.state,
  labels: scene.children.list.filter(child => child.type === 'Text').map(child => (child as unknown as { text: string }).text),
}
Object.assign(window, { visualReady: diagnostics })
