// Explicit maintenance command. Uses only public replay/session APIs, never state mutation.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dataHash, loadGameData, serializeReplay } from '@mt/shared'
import { ENGINE_VERSION, openReplay } from '@mt/session'

const root = new URL('../../../data/', import.meta.url)
const files = Object.fromEntries(readdirSync(root, { recursive: true }).filter(p => p.endsWith('.json')).map(p => [p, JSON.parse(readFileSync(new URL(p, root), 'utf8'))]))
const data = loadGameData(files)
const tile = (x, y) => ({ x, y })
const positions = { A: [tile(1, 2), tile(2, 3), tile(2, 2)], B: [tile(5, 4), tile(3, 3), tile(4, 2)] }
const skill = (unit, skill, extra = {}) => ({ type: 'useSkill', unit, skill, ...extra })
const end = { type: 'endTurn' }
const status = (unit, id) => s => s.units.find(u => u.id === unit)?.statuses.some(s => s.id === id)
const event = type => (_, steps) => steps.some(s => s.events.some(e => e.type === type))
const cases = [
  { name: 'burst', actions: [], check: () => true },
  { name: 'blink', actions: [skill('A.m2', 'blink', { tile: tile(2, 4) })], check: event('unitTeleported') },
  { name: 'push', first: 'B', actions: [skill('B.m1', 'shield_bash', { target: 'A.m1' })], check: event('unitPushed') },
  { name: 'counter', first: 'B', actions: [skill('B.m1', 'counter'), end, { type: 'basicAttack', unit: 'A.m1', target: 'B.m1' }], check: event('counterattack') },
  { name: 'bleed', actions: [skill('A.m1', 'rend', { target: 'B.m1' }), end], check: (s, steps) => status('B.m1', 'bleed')(s) && event('statusTicked')(s, steps) },
  { name: 'attune', actions: [skill('A.tamer', 'attune', { tile: tile(1, 3), element: 'water' })], check: s => s.attuned.length === 1 },
  { name: 'command-cover', actions: [end, end, { type: 'command', unit: 'A.tamer', target: 'A.m2', option: 'advantage' }, skill('A.tamer', 'cover', { target: 'A.m2' })], check: s => s.command?.target === 'A.m2' && s.units.find(u => u.id === 'A.m2')?.coveredBy === 'A.tamer' },
  { name: 'guarded', actions: [{ type: 'defend', unit: 'A.m1' }], check: status('A.m1', 'guarded') },
  { name: 'rallied', actions: [skill('A.m1', 'pack_howl')], check: status('A.m1', 'rallied') },
  { name: 'pin', first: 'B', actions: [skill('B.m2', 'pin', { target: 'A.m2' })], check: status('A.m2', 'pin') },
  { name: 'marked', first: 'B', actions: [skill('B.m2', 'mark', { target: 'A.m2' })], check: status('A.m2', 'marked') },
  { name: 'hidden', first: 'B', positions: { ...positions, B: [tile(5, 4), tile(3, 3), tile(5, 3)] }, actions: [skill('B.m2', 'camouflage')], check: status('B.m2', 'hidden') },
  { name: 'countering', first: 'B', actions: [skill('B.m1', 'counter')], check: status('B.m1', 'countering') },
  { name: 'weakened', actions: [skill('A.m2', 'hex', { target: 'B.m2' })], check: status('B.m2', 'weakened') },
  { name: 'off-balance', positions: { ...positions, A: [tile(2, 1), tile(2, 3), tile(2, 2)] }, actions: [skill('A.tamer', 'distract', { target: 'B.m2' })], check: status('B.m2', 'off_balance') },
  { name: 'taunted', first: 'B', actions: [skill('B.m1', 'taunt', { target: 'A.m1' })], check: status('A.m1', 'taunted') },
]
for (const c of cases) {
  let found = false
  for (let seed = 1; seed <= 1000 && !found; seed++) {
    const replay = { format: 'monster-tactics-replay', formatVersion: 1, engineVersion: ENGINE_VERSION, dataHash: dataHash(data), scenarioId: 'scenario_2', boardId: 'crossroads', mode: 'hotseat', diceSeed: seed.toString(16).padStart(16, '0'), preset: { tiles: c.positions ?? positions, firstSide: c.first ?? 'A' }, actions: [] }
    let opened = openReplay(serializeReplay(replay), data)
    for (const action of c.actions) {
      replay.actions.push(action)
      opened = openReplay(serializeReplay(replay), data)
      if (opened.kind !== 'ready') break
      let state = opened.steps.at(-1)?.state ?? opened.initial
      while (state.pending !== null) {
        replay.actions.push({ type: 'declineInspiration', side: state.pending.side })
        opened = openReplay(serializeReplay(replay), data)
        if (opened.kind !== 'ready') break
        state = opened.steps.at(-1).state
      }
    }
    if (opened.kind !== 'ready') {
      if (seed === 1000) console.error(c.name, opened)
      continue
    }
    const state = opened.steps.at(-1)?.state ?? opened.initial
    if (!c.check(state, opened.steps)) continue
    writeFileSync(new URL(`fixtures/${c.name}.json`, import.meta.url), serializeReplay(replay))
    console.log(c.name, 'seed', seed, 'steps', replay.actions.length, 'events', opened.steps.at(-1)?.events.map(e => e.type).join(','))
    found = true
  }
  if (!found) throw new Error(`No valid fixture for ${c.name}`)
}
