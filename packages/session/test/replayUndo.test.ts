import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadGameData, serializeReplay, tileFromName, type Side } from '@mt/shared'
import { createBattle, recordReplay, type BattleSetup } from '@mt/engine'
import { createBattleSession, createPlayStats, createReplayPlayer, openReplay, type BattleSession } from '../src/index.ts'

// Replay format 2 (phase 1.x ticket 06): Undo is recorded, replays to the same Battle, and
// playback skips the withdrawn actions unless asked to show them.

const DATA_DIR = fileURLToPath(new URL('../../../data/', import.meta.url))
const FIXTURES = fileURLToPath(new URL('../../web/visual/fixtures/', import.meta.url))

function readData() {
  const files: Record<string, unknown> = {}
  for (const entry of readdirSync(DATA_DIR, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue
    const fullPath = join(entry.parentPath, entry.name)
    files[relative(DATA_DIR, fullPath).split(sep).join('/')] = JSON.parse(readFileSync(fullPath, 'utf8'))
  }
  return loadGameData(files)
}

const data = readData()
const SEED = '0123456789abcdef'
const TILES: Readonly<Record<Side, readonly [string, string, string]>> = { A: ['a1', 'd4', 'c3'], B: ['a7', 'd5', 'f6'] }
const place = (side: Side) => {
  const [tamer, m1, m2] = TILES[side].map(tileFromName)
  return [tamer!, m1!, m2!] as const
}
const PRESET = { tiles: { A: place('A'), B: place('B') }, firstSide: 'A' as const }

function setup(): BattleSetup {
  return {
    scenario: data.scenarios.scenario_1!,
    board: data.boards.crossroads!,
    species: data.species,
    skills: data.skills,
    statuses: data.statuses,
    elementWheel: data.elementWheel,
    dice: { seed: SEED },
    preset: PRESET,
  }
}

const HEADER = { scenarioId: 'scenario_1', boardId: 'crossroads', mode: 'hotseat', diceSeed: SEED, preset: PRESET } as const

const newSession = () => createBattleSession(createBattle(setup()))

function stepTo(session: BattleSession, unit: 'A.m1' | 'A.m2' | 'B.m2', index = 0) {
  session.selectUnit(unit)
  session.input({ type: 'tapTile', tile: session.getSnapshot().reachable[index]! })
}

/** Undo used twice: A moves and takes it back, moves again, B moves after End Turn. */
function playedWithUndo() {
  const session = newSession()
  stepTo(session, 'A.m2')
  session.undo()
  stepTo(session, 'A.m2', 1)
  stepTo(session, 'A.m1', 0)
  session.undo()
  stepTo(session, 'A.m1', 1)
  session.endTurn()
  stepTo(session, 'B.m2')
  return session
}

const textOf = (session: BattleSession) =>
  serializeReplay(recordReplay(HEADER, data, session.getSnapshot().recorded, { appVersion: 'test' }))

function ready(text: string) {
  const opened = openReplay(text, data)
  if (opened.kind !== 'ready') throw new Error(`replay is ${opened.kind}`)
  return opened
}

describe('BattleSession: what the Replay records', () => {
  it('without Undo, recorded equals actions', () => {
    const session = newSession()
    stepTo(session, 'A.m2')
    const { recorded, actions, undos } = session.getSnapshot()
    expect(recorded).toEqual(actions)
    expect(undos).toBe(0)
  })

  it('keeps the withdrawn actions and puts an undo entry after them', () => {
    const session = newSession()
    stepTo(session, 'A.m2')
    stepTo(session, 'A.m1')
    session.undo()
    const { recorded, actions, undos } = session.getSnapshot()
    expect(actions).toHaveLength(0)
    expect(recorded.map((a) => a.type)).toEqual(['move', 'move', 'undo'])
    expect(recorded[2]).toEqual({ type: 'undo', withdraw: 2 })
    expect(undos).toBe(1)
  })
})

describe('Replay format 2', () => {
  it('replays to the final state of the Battle as it was played, with the withdrawn actions marked', () => {
    const session = playedWithUndo()
    const opened = ready(textOf(session))
    const snapshot = session.getSnapshot()
    expect(opened.replay.formatVersion).toBe(2)
    expect(opened.final).toEqual(snapshot.state)
    expect(opened.steps.filter((s) => !s.undone)).toHaveLength(snapshot.actions.length)
    expect(opened.steps.filter((s) => s.undone)).toHaveLength(3)
  })

  it('gives the same result every time', () => {
    const text = textOf(playedWithUndo())
    expect(openReplay(text, data)).toEqual(openReplay(text, data))
  })

  it('refuses an Undo that goes back past a roll', () => {
    const session = newSession()
    session.selectUnit('A.m1')
    session.chooseAttack()
    session.input({ type: 'tapUnit', unit: 'B.m1' })
    session.confirmAttack()
    while (session.getSnapshot().state.pending?.kind === 'inspiration') session.declineInspiration()
    const { recorded, actions } = session.getSnapshot()
    expect(actions.length).toBeGreaterThan(0)
    const bad = [...recorded, { type: 'undo', withdraw: actions.length } as const]
    const opened = openReplay(serializeReplay(recordReplay(HEADER, data, bad)), data)
    expect(opened.kind).toBe('broken')
  })

  it('refuses an Undo that does not go back to the safe point', () => {
    const session = newSession()
    stepTo(session, 'A.m2')
    stepTo(session, 'A.m1')
    const bad = [...session.getSnapshot().recorded, { type: 'undo', withdraw: 1 } as const]
    const opened = openReplay(serializeReplay(recordReplay(HEADER, data, bad)), data)
    expect(opened.kind).toBe('broken')
    if (opened.kind === 'broken' && opened.error.kind === 'rejected') expect(opened.error.index).toBe(2)
  })

  it('refuses an Undo with nothing to take back', () => {
    const opened = openReplay(serializeReplay(recordReplay(HEADER, data, [{ type: 'undo', withdraw: 1 }])), data)
    expect(opened.kind).toBe('broken')
  })

  it('does not accept an undo in a format 1 file', () => {
    const text = serializeReplay({ ...recordReplay(HEADER, data, [{ type: 'undo', withdraw: 1 }]), formatVersion: 1 })
    expect(openReplay(text, data).kind).toBe('invalid')
  })
})

describe('Replay format 1 (v0.1.x)', () => {
  it('still opens and plays: the visual fixtures', () => {
    const names = readdirSync(FIXTURES).filter((n) => n.endsWith('.json'))
    expect(names.length).toBeGreaterThan(0)
    for (const name of names) {
      const opened = openReplay(readFileSync(join(FIXTURES, name), 'utf8'), data)
      // A fixture recorded by an older build is reported, not converted; the check-replays tool lists those.
      expect(opened.kind === 'ready' || opened.kind === 'incompatible', name).toBe(true)
      if (opened.kind !== 'ready') continue
      expect(opened.replay.formatVersion).toBe(1)
      expect(opened.steps.some((s) => s.undone)).toBe(false)
      const player = createReplayPlayer(opened.initial, opened.steps)
      player.last()
      expect(player.getSnapshot().state).toEqual(opened.final)
      expect(player.getSnapshot().hasUndone).toBe(false)
    }
  })
})

describe('Playback of a Replay with Undo', () => {
  function playerOf(showUndone?: boolean) {
    const opened = ready(textOf(playedWithUndo()))
    return { opened, player: createReplayPlayer(opened.initial, opened.steps, showUndone === undefined ? {} : { showUndone }) }
  }

  it('skips the withdrawn actions by default and ends where the Battle ended', () => {
    const { opened, player } = playerOf()
    expect(player.getSnapshot().total).toBe(opened.steps.filter((s) => !s.undone).length)
    expect(player.getSnapshot().hasUndone).toBe(true)
    expect(player.getSnapshot().showUndone).toBe(false)
    player.last()
    expect(player.getSnapshot().state).toEqual(opened.final)
  })

  it('shows them when asked, marking each one', () => {
    const { opened, player } = playerOf(true)
    expect(player.getSnapshot().total).toBe(opened.steps.length)
    const marks: boolean[] = []
    for (let i = 0; i < opened.steps.length; i++) {
      player.forward()
      marks.push(player.getSnapshot().undone)
    }
    expect(marks).toEqual(opened.steps.map((s) => s.undone))
    expect(player.getSnapshot().state).toEqual(opened.final)
  })

  it('toggling keeps the position on the same action', () => {
    const { opened, player } = playerOf()
    player.last()
    const action = player.getSnapshot().action
    player.setShowUndone(true)
    expect(player.getSnapshot().step).toBe(opened.steps.length)
    expect(player.getSnapshot().action).toEqual(action)
    player.setShowUndone(false)
    expect(player.getSnapshot().step).toBe(player.getSnapshot().total)
    player.first()
    player.setShowUndone(true)
    expect(player.getSnapshot().step).toBe(0)
  })

  it('a Replay without Undo ignores the toggle', () => {
    const session = newSession()
    stepTo(session, 'A.m2')
    const opened = ready(textOf(session))
    const player = createReplayPlayer(opened.initial, opened.steps)
    player.setShowUndone(true)
    expect(player.getSnapshot().showUndone).toBe(false)
  })
})

describe('Play stats: Undo and abandoned Battles', () => {
  const choice = { scenarioId: 'scenario_1', boardId: 'crossroads', mode: 'hotseat', humanSide: 'A' } as const
  const memory = () => {
    const map = new Map<string, string>()
    return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) }
  }
  const clock = () => new Date(2026, 9, 18, 10, 0, 0)

  it('counts Undo uses per Battle', () => {
    const stats = createPlayStats(memory(), clock)
    const first = stats.recordBattleStarted(choice)
    const second = stats.recordBattleStarted(choice)
    stats.recordUndo(first)
    stats.recordUndo(first)
    stats.recordUndo(second)
    expect(stats.read().battles.map((b) => b.undos)).toEqual([2, 1])
  })

  it('marks an unfinished Battle abandoned, once, and never a finished one', () => {
    const stats = createPlayStats(memory(), clock)
    const first = stats.recordBattleStarted(choice)
    stats.recordBattleAbandoned(first)
    stats.recordBattleAbandoned(first)
    expect(stats.read().battlesAbandoned).toBe(1)
    expect(stats.read().battles[0]!.abandonedAt).toBeDefined()
    const second = stats.recordBattleStarted(choice)
    stats.recordBattleFinished(second, { winner: 'A', cause: 'tamerDown' }, 3)
    stats.recordBattleAbandoned(second)
    expect(stats.read().battlesAbandoned).toBe(1)
  })

  it('reads stats saved before this ticket', () => {
    const storage = memory()
    const old = {
      format: 'monster-tactics-play-stats',
      version: 1,
      appOpens: 3,
      battlesStarted: 1,
      battlesFinished: 0,
      daysPlayed: ['2026-10-17'],
      battles: [{ startedAt: '2026-10-17T09:00:00.000Z', mode: 'hotseat', scenarioId: 'scenario_1', boardId: 'crossroads' }],
    }
    storage.setItem('monster-tactics.play-stats.v1', JSON.stringify(old))
    const stats = createPlayStats(storage, clock)
    expect(stats.read().appOpens).toBe(3)
    expect(stats.read().battlesAbandoned).toBe(0)
    stats.recordUndo(0)
    expect(stats.read().battles[0]!.undos).toBe(1)
  })
})

describe('Undo inside a Replay: Turn boundaries and the AI Turn', () => {
  it('never crosses a Turn boundary: an undo that would withdraw the End Turn is refused', () => {
    const session = newSession()
    stepTo(session, 'A.m2')
    session.endTurn()
    // B's Turn has begun; taking back A's End Turn (and move) is not B's to do.
    const { recorded } = session.getSnapshot()
    for (const withdraw of [1, 2]) {
      const bad = [...recorded, { type: 'undo', withdraw } as const]
      expect(openReplay(serializeReplay(recordReplay(HEADER, data, bad)), data).kind).toBe('broken')
    }
  })

  it('refuses an undo while the AI is to act', () => {
    const aiHeader = { ...HEADER, mode: 'ai', humanSide: 'B' } as const
    const session = newSession()
    stepTo(session, 'A.m2')
    const bad = [...session.getSnapshot().recorded, { type: 'undo', withdraw: 1 } as const]
    // Team A (the AI here) is to act and has moved: its undo is refused...
    expect(openReplay(serializeReplay(recordReplay(aiHeader, data, bad)), data).kind).toBe('broken')
    // ...the same file as a human Turn is fine.
    expect(openReplay(serializeReplay(recordReplay({ ...aiHeader, humanSide: 'A' }, data, bad)), data).kind).toBe('ready')
  })
})
