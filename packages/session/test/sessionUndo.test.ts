import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadGameData, tileFromName, type Side } from '@mt/shared'
import { GAME_PROFILES } from '@mt/ai'
import { createBattle, previewAction, recordReplay, replayBattle, type BattleSetup, type BattleState, type DiceSource } from '@mt/engine'
import { createBattleSession, type BattleSession } from '../src/index.ts'

// Undo in the session (phase 1.x ticket 05, rules §17.5, D-30, spec stories 14-22): the
// side to act goes back to the safe point of its Turn; dice and decisions stay.

const DATA_DIR = fileURLToPath(new URL('../../../data/', import.meta.url))

function gameData() {
  const files: Record<string, unknown> = {}
  for (const entry of readdirSync(DATA_DIR, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue
    const fullPath = join(entry.parentPath, entry.name)
    files[relative(DATA_DIR, fullPath).split(sep).join('/')] = JSON.parse(readFileSync(fullPath, 'utf8'))
  }
  return loadGameData(files)
}

const data = gameData()
const SEED = '0123456789abcdef'

// Fangrel (A.m1) d4 next to Tidewall (B.m1) d5.
const TILES: Readonly<Record<Side, readonly [string, string, string]>> = { A: ['a1', 'd4', 'c3'], B: ['a7', 'd5', 'f6'] }

const place = (side: Side) => {
  const [tamer, m1, m2] = TILES[side].map(tileFromName)
  return [tamer!, m1!, m2!] as const
}

function setup(dice: DiceSource = { seed: SEED }): BattleSetup {
  return {
    scenario: data.scenarios.scenario_1!,
    board: data.boards.crossroads!,
    species: data.species,
    skills: data.skills,
    statuses: data.statuses,
    elementWheel: data.elementWheel,
    dice,
    preset: { tiles: { A: place('A'), B: place('B') }, firstSide: 'A' },
  }
}

function withoutPreset({ preset: _preset, ...rest }: BattleSetup): BattleSetup {
  return rest
}

const newSession = (dice?: DiceSource) => createBattleSession(createBattle(setup(dice)))

/** Scripted dice for a basic attack by Fangrel on Tidewall that misses (a 1), then a reroll. */
function missDice(): DiceSource {
  const probe = previewAction(createBattle(setup({ rolls: [] })), { type: 'basicAttack', unit: 'A.m1', target: 'B.m1' })
  if (!probe.ok || probe.preview?.type !== 'attack') throw new Error('Fangrel cannot reach Tidewall')
  const count = probe.preview.rollMode === 'normal' ? 1 : 2
  return { rolls: [...Array<number>(count).fill(1), ...Array<number>(count).fill(2)] }
}

function attackTidewall(session: BattleSession) {
  session.selectUnit('A.m1')
  session.chooseAttack()
  session.input({ type: 'tapUnit', unit: 'B.m1' })
  session.confirmAttack()
}

function stepTo(session: BattleSession, unit: 'A.m1' | 'A.m2' | 'B.m1' | 'B.m2', index = 0) {
  session.selectUnit(unit)
  session.input({ type: 'tapTile', tile: session.getSnapshot().reachable[index]! })
}

describe('BattleSession: Undo availability', () => {
  it('is not offered at the start of a Turn', () => {
    expect(newSession().getSnapshot().undo).toBeNull()
  })

  it('is offered after moves and Defend, back to the start of the Turn', () => {
    const session = newSession()
    stepTo(session, 'A.m2')
    session.selectUnit('A.m1')
    session.defend()
    expect(session.getSnapshot().undo).toEqual({ to: 'turnStart', actions: 2 })
  })

  it('a dice roll is the safe point: not offered right after it, offered for what follows', () => {
    const session = newSession()
    attackTidewall(session)
    // Answer an Inspiration decision if the roll missed.
    while (session.getSnapshot().state.pending?.kind === 'inspiration') session.declineInspiration()
    expect(session.getSnapshot().undo).toBeNull()
    stepTo(session, 'A.m2')
    expect(session.getSnapshot().undo).toEqual({ to: 'lastRoll', actions: 1 })
  })

  it('an Inspiration answer is a safe point too', () => {
    const session = newSession(missDice())
    attackTidewall(session)
    expect(session.getSnapshot().state.pending).toMatchObject({ kind: 'inspiration', side: 'A' })
    expect(session.getSnapshot().undo).toBeNull()
    session.declineInspiration()
    expect(session.getSnapshot().undo).toBeNull()
    stepTo(session, 'A.m2')
    expect(session.getSnapshot().undo).toEqual({ to: 'lastRoll', actions: 1 })
  })

  it('is hidden for the side that has not acted yet in its Turn', () => {
    const session = newSession()
    stepTo(session, 'A.m2')
    expect(session.getSnapshot().undo).not.toBeNull()
    session.endTurn()
    expect(session.getSnapshot().undo).toBeNull()
    // Team B's Turn, nothing done yet: team A's moves are not B's to take back.
    expect(session.getSnapshot().undo).toBeNull()
    stepTo(session, 'B.m2')
    expect(session.getSnapshot().undo).toEqual({ to: 'turnStart', actions: 1 })
  })

  it('is hidden during the AI Turn', () => {
    const state = createBattle(setup())
    const session = createBattleSession(state, { ai: { side: 'B', profile: GAME_PROFILES.greedy } })
    stepTo(session, 'A.m2')
    expect(session.getSnapshot().undo).not.toBeNull()
    session.endTurn()
    const snapshot = session.getSnapshot()
    expect(snapshot.aiToAct).toBe(true)
    expect(snapshot.undo).toBeNull()
    session.undo()
    expect(session.getSnapshot().actions).toHaveLength(snapshot.actions.length)
  })
})

describe('BattleSession: Undo does it', () => {
  it('returns the Battle to the start of the Turn: same state, no actions, no log, a new revision', () => {
    const session = newSession()
    const start = session.getSnapshot()
    stepTo(session, 'A.m2')
    session.selectUnit('A.m1')
    session.defend()
    session.selectUnit('A.m1')
    session.undo()
    const snapshot = session.getSnapshot()
    expect(snapshot.state).toEqual(start.state)
    expect(snapshot.actions).toEqual([])
    expect(snapshot.log).toEqual(start.log)
    expect(snapshot.events).toEqual([])
    expect(snapshot.revision).toBeGreaterThan(start.revision)
    expect(snapshot.selectedUnit).toBeNull()
    expect(snapshot.mode).toBe('move')
    expect(snapshot.undo).toBeNull()
    // The Units that had started are free again (rules §17.4).
    expect(snapshot.state.activations).toEqual(start.state.activations)
  })

  it('returns to just after the last roll: the dice and the roll stay', () => {
    const session = newSession()
    attackTidewall(session)
    while (session.getSnapshot().state.pending?.kind === 'inspiration') session.declineInspiration()
    const afterRoll = session.getSnapshot()
    stepTo(session, 'A.m2')
    session.selectUnit('A.m2')
    session.defend()
    session.undo()
    const snapshot = session.getSnapshot()
    expect(snapshot.state).toEqual(afterRoll.state)
    expect(snapshot.state.dice).toEqual(afterRoll.state.dice)
    expect(snapshot.actions).toEqual(afterRoll.actions)
    expect(snapshot.log).toEqual(afterRoll.log)
  })

  it('keeps an Inspiration decision: Undo goes back to just after it', () => {
    const session = newSession(missDice())
    attackTidewall(session)
    session.declineInspiration()
    const afterDecision = session.getSnapshot()
    stepTo(session, 'A.m2')
    session.undo()
    expect(session.getSnapshot().state).toEqual(afterDecision.state)
    expect(session.getSnapshot().actions).toEqual(afterDecision.actions)
    expect(session.getSnapshot().state.inspiration).toEqual({ A: true, B: true })
  })

  it('does not cross into the other side Turn: B takes back only its own moves', () => {
    const session = newSession()
    stepTo(session, 'A.m2')
    session.endTurn()
    session.continueHotseat()
    const startOfB = session.getSnapshot()
    stepTo(session, 'B.m2')
    session.undo()
    const snapshot = session.getSnapshot()
    expect(snapshot.state).toEqual(startOfB.state)
    expect(snapshot.actions).toEqual(startOfB.actions)
    expect(snapshot.state.sideToAct).toBe('B')
    expect(snapshot.undo).toBeNull()
  })

  it('restores Attune: the tile and the element choice are gone', () => {
    const session = newSession()
    const start = session.getSnapshot().state
    session.selectUnit('A.tamer')
    session.chooseSkill('attune')
    const tile = session.getSnapshot().tileChoices[0]!
    session.input({ type: 'tapTile', tile })
    session.chooseElement(session.getSnapshot().elementChoices[0]!)
    session.confirmAttack()
    expect(session.getSnapshot().state.attuned).toHaveLength(1)
    expect(session.getSnapshot().undo).toEqual({ to: 'turnStart', actions: 1 })
    session.undo()
    expect(session.getSnapshot().state.attuned).toEqual([])
    expect(session.getSnapshot().state).toEqual(start)
  })

  it('does nothing when Undo is not offered', () => {
    const session = newSession()
    const before = session.getSnapshot()
    session.undo()
    expect(session.getSnapshot()).toBe(before)
  })

  it('can be used again and again, one safe point at a time', () => {
    const session = newSession()
    stepTo(session, 'A.m2')
    session.endTurn()
    session.continueHotseat()
    stepTo(session, 'B.m2')
    session.undo()
    stepTo(session, 'B.m2', 1)
    stepTo(session, 'B.m1')
    expect(session.getSnapshot().undo).toEqual({ to: 'turnStart', actions: 2 })
    session.undo()
    expect(session.getSnapshot().actions.map((a) => a.type)).toEqual(['move', 'endTurn'])
    expect(session.getSnapshot().undo).toBeNull()
  })

  it('the Replay of what is left plays to the same Battle', () => {
    const session = newSession()
    attackTidewall(session)
    while (session.getSnapshot().state.pending?.kind === 'inspiration') session.declineInspiration()
    stepTo(session, 'A.m2')
    session.undo()
    stepTo(session, 'A.m2', 1)
    const snapshot = session.getSnapshot()
    const header = {
      scenarioId: 'scenario_1',
      boardId: 'crossroads',
      mode: 'hotseat',
      diceSeed: SEED,
      preset: { tiles: { A: place('A'), B: place('B') }, firstSide: 'A' as const },
    } as const
    const replayed = replayBattle(recordReplay(header, data, snapshot.actions), data)
    if (!replayed.ok) throw new Error('replay failed')
    expect(replayed.final).toEqual(snapshot.state)
  })
})

describe('BattleSession: undoState (hidden, disabled with a reason, available)', () => {
  const available = (session: BattleSession) => {
    const { undo, undoState } = session.getSnapshot()
    expect(undo).not.toBeNull()
    expect(undoState).toEqual({ kind: 'available', offer: undo })
  }

  it('Hotseat, start of the Turn: disabled, turn-start', () => {
    const snapshot = newSession().getSnapshot()
    expect(snapshot.undo).toBeNull()
    expect(snapshot.undoState).toEqual({ kind: 'disabled', reason: 'turn-start' })
  })

  it('Hotseat: available after a move, and again for the other side after the hand-over', () => {
    const session = newSession()
    stepTo(session, 'A.m2')
    available(session)
    session.endTurn()
    session.continueHotseat()
    // Team B has not acted: the End Turn before it is not B's to take back.
    expect(session.getSnapshot().undoState).toEqual({ kind: 'disabled', reason: 'turn-start' })
    stepTo(session, 'B.m2')
    available(session)
    session.undo()
    expect(session.getSnapshot().undoState).toEqual({ kind: 'disabled', reason: 'turn-start' })
  })

  it('disabled with after-roll right after a dice roll, available once something follows', () => {
    const session = newSession()
    attackTidewall(session)
    while (session.getSnapshot().state.pending?.kind === 'inspiration') session.declineInspiration()
    expect(session.getSnapshot().undoState).toEqual({ kind: 'disabled', reason: 'after-roll' })
    stepTo(session, 'A.m2')
    available(session)
  })

  it('an Inspiration decision pending or answered is after-roll too', () => {
    const session = newSession(missDice())
    attackTidewall(session)
    expect(session.getSnapshot().state.pending).toMatchObject({ kind: 'inspiration' })
    expect(session.getSnapshot().undoState).toEqual({ kind: 'disabled', reason: 'after-roll' })
    session.declineInspiration()
    expect(session.getSnapshot().undoState).toEqual({ kind: 'disabled', reason: 'after-roll' })
  })

  it('an earlier roll does not make a fresh Turn after-roll', () => {
    const session = newSession()
    attackTidewall(session)
    while (session.getSnapshot().state.pending?.kind === 'inspiration') session.declineInspiration()
    session.endTurn()
    session.continueHotseat()
    expect(session.getSnapshot().undoState).toEqual({ kind: 'disabled', reason: 'turn-start' })
  })

  it('vs AI: the human side gets all three; the AI Turn is hidden', () => {
    const session = createBattleSession(createBattle(setup()), { ai: { side: 'B', profile: GAME_PROFILES.greedy } })
    expect(session.getSnapshot().undoState).toEqual({ kind: 'disabled', reason: 'turn-start' })
    stepTo(session, 'A.m2')
    available(session)
    session.endTurn()
    expect(session.getSnapshot().aiToAct).toBe(true)
    expect(session.getSnapshot().undoState).toEqual({ kind: 'hidden' })
  })

  it('hidden during deployment', () => {
    const session = createBattleSession(createBattle(withoutPreset(setup())))
    expect(session.getSnapshot().state.phase).not.toBe('play')
    expect(session.getSnapshot().undoState).toEqual({ kind: 'hidden' })
  })

  it('hidden on the initiative screen, shown once the Board is up', () => {
    const session = createBattleSession(createBattle(withoutPreset(setup({ rolls: [3, 17] }))))
    const place = (tiles: readonly string[]) => {
      for (const tile of tiles) session.input({ type: 'tapTile', tile: tileFromName(tile) })
    }
    place(['d1', 'c2', 'e2'])
    session.confirmDeployment()
    session.continueHotseat()
    place(['d7', 'e6', 'c6'])
    session.confirmDeployment()
    expect(session.getSnapshot().screen).toBe('initiative')
    expect(session.getSnapshot().undoState).toEqual({ kind: 'hidden' })
    session.continueHotseat()
    expect(session.getSnapshot().undoState).toEqual({ kind: 'disabled', reason: 'turn-start' })
  })

  it('hidden when the Battle is over', () => {
    const session = newSession()
    stepTo(session, 'A.m2')
    const state = { ...session.getSnapshot().state, outcome: { winner: 'A', reason: 'wipe' } } as unknown as BattleState
    const over = createBattleSession(state)
    expect(over.getSnapshot().undoState).toEqual({ kind: 'hidden' })
    expect(over.getSnapshot().undo).toBeNull()
  })

  it('undo() reports whether it went back', () => {
    const session = newSession()
    expect(session.undo()).toBe(false)
    stepTo(session, 'A.m2')
    expect(session.undo()).toBe(true)
    expect(session.undo()).toBe(false)
  })
})
