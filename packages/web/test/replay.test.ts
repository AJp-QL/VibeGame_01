import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { dataHash, loadGameData, serializeReplay, type GameData } from '@mt/shared'
import { createBattle, ENGINE_VERSION, legalActions, type Action } from '@mt/engine'
import { battleSetup, type BattleChoice } from '../src/battleChoice.ts'
import { loadBundledGameData } from '../src/gameData.ts'
import { battleReplay, createReplayPlayer, openReplay, replayFileName } from '../src/replay.ts'
import { createBattleSession, type BattleSession } from '../src/session.ts'

const DATA_DIR = fileURLToPath(new URL('../../../data/', import.meta.url))

function nodeGameData(): GameData {
  const files: Record<string, unknown> = {}
  for (const entry of readdirSync(DATA_DIR, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue
    const fullPath = join(entry.parentPath, entry.name)
    files[relative(DATA_DIR, fullPath).split(sep).join('/')] = JSON.parse(readFileSync(fullPath, 'utf8'))
  }
  return loadGameData(files)
}

const data = nodeGameData()
const CHOICE: BattleChoice = { scenarioId: 'scenario_2', boardId: 'shallows', mode: 'hotseat', humanSide: 'A' }
const SEED = '00c0ffee00c0ffee'
const META = { appVersion: 'v0.1.0-test', createdAt: '2026-10-15T09:30:05.000Z' }

/** Carry out an engine action the way a player would, through the session's taps and buttons. */
function play(session: BattleSession, action: Action): void {
  switch (action.type) {
    case 'deploy':
      session.selectUnit(action.unit)
      session.input({ type: 'tapTile', tile: action.to })
      return
    case 'confirmDeployment':
      session.confirmDeployment()
      session.continueHotseat()
      return
    case 'move':
      session.selectUnit(action.unit)
      session.input({ type: 'tapTile', tile: action.to })
      return
    case 'basicAttack':
      session.selectUnit(action.unit)
      session.chooseAttack()
      session.input({ type: 'tapUnit', unit: action.target })
      session.confirmAttack()
      return
    case 'endTurn':
      session.endTurn()
  }
}

/** A Hotseat Battle played through the session for `count` actions: attack when possible, else Move, else end the Turn. */
function playedSession(count: number): BattleSession {
  const session = createBattleSession(createBattle(battleSetup(data, CHOICE, SEED)))
  for (let i = 0; i < count; i++) {
    const { state } = session.getSnapshot()
    const legal = legalActions(state)
    if (legal.length === 0) break
    const placed = state.deployment?.placements[state.sideToAct] ?? {}
    const action =
      legal.find((a) => a.type === 'confirmDeployment') ??
      legal.find((a) => a.type === 'deploy' && placed[a.unit] === undefined) ??
      legal.find((a) => a.type === 'basicAttack') ??
      (i % 3 === 0 ? undefined : legal.find((a) => a.type === 'move' || a.type === 'deploy')) ??
      legal.find((a) => a.type === 'endTurn') ??
      legal[0]!
    play(session, action)
  }
  return session
}

describe('Replay export from a Battle', () => {
  it('the session records every accepted action, and only those', () => {
    const session = playedSession(0)
    session.input({ type: 'tapTile', tile: { x: 3, y: 3 } }) // outside the start zone: nothing happens
    session.input({ type: 'tapTile', tile: { x: 3, y: 0 } })
    expect(session.getSnapshot().actions).toEqual([{ type: 'deploy', unit: 'A.tamer', to: { x: 3, y: 0 } }])
  })

  it('a Replay exported part-way through opens to the exact state the Battle was in', () => {
    const session = playedSession(60)
    const { state, actions } = session.getSnapshot()
    expect(state.phase).toBe('play')
    const replay = battleReplay(data, CHOICE, SEED, actions, META)
    expect(replay).toMatchObject({
      engineVersion: ENGINE_VERSION,
      dataHash: dataHash(data),
      scenarioId: 'scenario_2',
      boardId: 'shallows',
      mode: 'hotseat',
      diceSeed: SEED,
      meta: META,
    })
    expect(replay).not.toHaveProperty('humanSide')

    const opened = openReplay(serializeReplay(replay), data)
    if (opened.kind !== 'ready') throw new Error(`expected a ready Replay, got ${opened.kind}`)
    expect(opened.steps).toHaveLength(actions.length)
    expect(opened.steps.at(-1)?.state).toEqual(state)
  })

  it('names the file after the Scenario, Board, Dice Seed and export time', () => {
    const replay = battleReplay(data, CHOICE, SEED, [], META)
    expect(replayFileName(replay)).toBe('replay_scenario_2_shallows_00c0ffee00c0ffee_20261015-093005.json')
  })

  it('the bundled game data (as the browser loads it) has the same data hash as data/ read by Node', () => {
    expect(dataHash(loadBundledGameData())).toBe(dataHash(data))
  })
})

describe('Opening a Replay file', () => {
  const session = playedSession(40)
  const replay = battleReplay(data, CHOICE, SEED, session.getSnapshot().actions, META)

  it('says what is wrong with a file that is not a Replay', () => {
    expect(openReplay('hello', data)).toMatchObject({ kind: 'invalid' })
    const opened = openReplay(JSON.stringify({ ...replay, diceSeed: 'xyz' }), data)
    expect(opened.kind === 'invalid' && opened.issues[0]).toMatch(/^diceSeed:/)
  })

  it('reports a version mismatch and does not replay when the data hash or engine version differ', () => {
    const otherData = openReplay(serializeReplay({ ...replay, dataHash: 'a'.repeat(64) }), data)
    expect(otherData).toMatchObject({
      kind: 'incompatible',
      mismatches: [{ field: 'dataHash', replay: 'a'.repeat(64), current: dataHash(data) }],
    })
    const otherEngine = openReplay(serializeReplay({ ...replay, engineVersion: '9.9.9' }), data)
    expect(otherEngine).toMatchObject({
      kind: 'incompatible',
      mismatches: [{ field: 'engineVersion', replay: '9.9.9', current: ENGINE_VERSION }],
    })
  })

  it('reports the action that no longer fits in a changed Replay', () => {
    const changed = { ...replay, actions: replay.actions.map((a, i) => (i === 7 ? { type: 'endTurn' } : a)) }
    const opened = openReplay(serializeReplay(changed), data)
    expect(opened).toMatchObject({ kind: 'broken', error: { kind: 'rejected', index: 7 } })
  })
})

describe('Replay playback', () => {
  const session = playedSession(40)
  const { actions, state: finalState, log } = session.getSnapshot()
  const opened = openReplay(serializeReplay(battleReplay(data, CHOICE, SEED, actions, META)), data)
  if (opened.kind !== 'ready') throw new Error('expected a ready Replay')

  it('starts before the first action, with nothing to undo', () => {
    const player = createReplayPlayer(opened.initial, opened.steps)
    const snapshot = player.getSnapshot()
    expect(snapshot).toMatchObject({ step: 0, total: actions.length, action: null, actor: null, events: [], log: [] })
    expect(snapshot.state.phase).toBe('deployment')
    player.back()
    expect(player.getSnapshot().step).toBe(0)
  })

  it('steps forward one action at a time, animating just that action', () => {
    const player = createReplayPlayer(opened.initial, opened.steps)
    player.forward()
    const snapshot = player.getSnapshot()
    expect(snapshot).toMatchObject({ step: 1, action: actions[0], actor: 'A', events: opened.steps[0]!.events })
    expect(snapshot.units.map((u) => u.id)).toEqual(['A.tamer'])
  })

  it('shows both sides placing during deployment', () => {
    const player = createReplayPlayer(opened.initial, opened.steps)
    const confirmB = actions.findIndex((a, i) => a.type === 'confirmDeployment' && i > 3)
    for (let i = 0; i < confirmB; i++) player.forward()
    const { state, units } = player.getSnapshot()
    expect(state.phase).toBe('deployment')
    expect(units.map((u) => u.id)).toEqual(['A.tamer', 'A.m1', 'A.m2', 'B.tamer', 'B.m1', 'B.m2'])
  })

  it('jumps to the end: the final state, HP and the whole log of the Battle', () => {
    const player = createReplayPlayer(opened.initial, opened.steps)
    player.last()
    const snapshot = player.getSnapshot()
    expect(snapshot.step).toBe(actions.length)
    expect(snapshot.state).toEqual(finalState)
    expect(snapshot.log).toEqual(log)
    expect(snapshot.events).toEqual([]) // a jump redraws without animating
    player.forward()
    expect(player.getSnapshot().step).toBe(actions.length)
  })

  it('steps back and jumps to the start, each time a new revision for the Board to redraw', () => {
    const player = createReplayPlayer(opened.initial, opened.steps)
    let notified = 0
    player.subscribe(() => notified++)
    player.last()
    player.back()
    const back = player.getSnapshot()
    expect(back.step).toBe(actions.length - 1)
    expect(back.state).toEqual(opened.steps[actions.length - 2]!.state)
    expect(back.events).toEqual([])
    player.first()
    expect(player.getSnapshot()).toMatchObject({ step: 0, revision: 3 })
    expect(player.getSnapshot().state).toBe(opened.initial)
    expect(notified).toBe(3)
  })

  it('is read-only: taps on the Board do nothing', () => {
    const player = createReplayPlayer(opened.initial, opened.steps)
    player.last()
    const before = player.getSnapshot()
    player.input({ type: 'tapTile', tile: { x: 0, y: 0 } })
    player.input({ type: 'tapUnit', unit: 'A.tamer' })
    expect(player.getSnapshot()).toBe(before)
  })
})
