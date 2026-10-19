import { createBattleGame, fitBattleGame } from '@mt/battle'
import { createBattle, createBattleSession, type UnitId } from '@mt/session'
import { tileFromName as tile } from '@mt/shared'
import { loadBundledGameData } from '../src/gameData.ts'
import { th } from '../src/strings.ts'
const data = loadBundledGameData()
const session = createBattleSession(createBattle({
  scenario: data.scenarios.scenario_1!, board: data.boards.crossroads!, species: data.species,
  skills: data.skills, statuses: data.statuses, elementWheel: data.elementWheel, dice: { seed: '0123456789abcdef' },
  inspiration: { A: false, B: false },
  preset: { tiles: { A: [tile('a1'), tile('c5'), tile('c6')], B: [tile('g7'), tile('e5'), tile('c2')] }, firstSide: 'A' },
}))
session.selectUnit('A.m1')
session.aimTarget('B.m1')
const origin = session.getSnapshot().plan!.originChoices.find(origin => origin.via === 'move' && origin.steps >= 2)!
if (!origin) throw new Error('Expected a multi-step Move before attacking')
session.chooseOrigin(origin.tile, origin.via)
const parent = document.querySelector<HTMLElement>('#board')!
const game = createBattleGame(parent, session, { miss: th.boardMiss, critical: th.boardCritical, counter: th.boardCounter, pushBlocked: th.boardPushBlocked })
await new Promise<void>(resolve => {
  const ready = () => { if (!game.scene.isActive('battle')) requestAnimationFrame(ready); else { game.loop.stop(); resolve() } }
  requestAnimationFrame(ready)
})
fitBattleGame(game, parent)
const scene = game.scene.getScene('battle')
let now = 1_000_000
Date.now = () => now
scene.tweens.startTime = now; scene.tweens.prevTime = now; scene.tweens.time = 0; scene.tweens.nextTime = 0
// Observe actual lunge starts in the real renderer, using the same fixed clock as Board captures.
const observed = scene as unknown as {
  walk(unit: UnitId, path: readonly { x: number; y: number }[], onComplete: () => void): void
  teleport(unit: UnitId, to: { x: number; y: number }, onComplete: () => void): void
  lunge(attacker: UnitId, target: UnitId): void
  unitViews: Map<UnitId, { container: { x: number; y: number } }>
}
const lunges: { at: number; x: number; y: number }[] = []
const lunge = observed.lunge.bind(scene)
observed.lunge = (attacker, target) => {
  const view = observed.unitViews.get(attacker)!.container
  lunges.push({ at: now - 1_000_000, x: view.x, y: view.y })
  lunge(attacker, target)
}
// A removed view must not strand the next batch in either animation path.
let missingViewCompletions = 0
observed.walk('missing', [], () => missingViewCompletions++)
observed.teleport('missing', { x: 0, y: 0 }, () => missingViewCompletions++)
session.confirmPlan()
const move = session.getSnapshot().eventBatches[0]!.find(event => event.type === 'unitMoved')
if (move?.type !== 'unitMoved') throw new Error('Expected Move events first')
const walkMs = move.path.length * 90
for (let elapsed = 0; elapsed < walkMs + 50; elapsed += 10) { now += 10; game.step(now, 10) }
Object.assign(window, { planAnimation: { missingViewCompletions, lunges, walkMs, origin: origin.tile, batches: session.getSnapshot().eventBatches.map(batch => batch.map(event => event.type)) } })
