import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadGameData, tileFromName, type Side } from '@mt/shared'
import { createBattle, previewAction, type BattleSetup, type DiceSource } from '@mt/engine'
import { describeAction, openReplay, battleReplay } from '../src/replay.ts'
import { createBattleSession, type BattleSession } from '../src/session.ts'
import { th } from '../src/strings.ts'

// Inspiration in the Hotseat UI (rules §18): the session asks the deciding
// side after a d20, and covers the Board to hand the device over when that
// side is not the one playing (a save on the other side's Turn), and back.

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

type Tiles = Readonly<Record<Side, readonly [string, string, string]>>

// Fangrel (A.m1) on d4 next to Tidewall (B.m1) on d5.
const NEAR: Tiles = { A: ['a1', 'd4', 'g1'], B: ['a7', 'd5', 'g7'] }

function setup(dice: DiceSource, preset = true): BattleSetup {
  const tiles = (side: Side) => {
    const [tamer, m1, m2] = NEAR[side].map(tileFromName)
    return [tamer!, m1!, m2!] as const
  }
  return {
    scenario: data.scenarios.scenario_1!,
    board: data.boards.crossroads!,
    species: data.species,
    skills: data.skills,
    statuses: data.statuses,
    elementWheel: data.elementWheel,
    dice,
    ...(preset ? { preset: { tiles: { A: tiles('A'), B: tiles('B') }, firstSide: 'A' as const } } : {}),
  }
}

/** Scripted dice for Rend on Tidewall: attack 15 (one or two d20s, as the roll mode needs), damage 4, save 5, reroll 15. */
function rendDice(): DiceSource {
  const probe = previewAction(createBattle(setup({ rolls: [] })), { type: 'useSkill', unit: 'A.m1', skill: 'rend', target: 'B.m1' })
  if (!probe.ok || probe.preview?.type !== 'attack') throw new Error('Rend cannot reach Tidewall')
  const attack = probe.preview.rollMode === 'normal' ? [15] : [15, 15]
  return { rolls: [...attack, 4, 5, 15] }
}

function useRend(session: BattleSession) {
  session.selectUnit('A.m1')
  session.chooseSkill('rend')
  session.input({ type: 'tapUnit', unit: 'B.m1' })
  session.confirmAttack()
}

describe('BattleSession: Inspiration prompt', () => {
  it('after an attack roll the attacking side is asked; using it rerolls and spends it', () => {
    const session = createBattleSession(createBattle(setup({ seed: '0123456789abcdef' })))
    session.selectUnit('A.m1')
    session.chooseAttack()
    session.input({ type: 'tapUnit', unit: 'B.m1' })
    session.confirmAttack()
    let snapshot = session.getSnapshot()
    expect(snapshot.state.pending).toMatchObject({ kind: 'inspiration', side: 'A', roll: { type: 'attackRolled' } })
    // Team A is holding the device already: no hand-over.
    expect(snapshot.screen).toBe('board')
    expect(snapshot.log.at(-1)?.type).toBe('inspirationOffered')

    session.useInspiration()
    snapshot = session.getSnapshot()
    expect(snapshot.state.pending).toBeNull()
    expect(snapshot.state.inspiration).toEqual({ A: false, B: true })
    expect(snapshot.events[0]).toEqual({ type: 'inspirationUsed', side: 'A' })
    expect(snapshot.actions.at(-1)).toEqual({ type: 'useInspiration', side: 'A' })
  })

  it('while the decision is pending, taps and other buttons do nothing', () => {
    const session = createBattleSession(createBattle(setup({ seed: '0123456789abcdef' })))
    session.selectUnit('A.m1')
    session.chooseAttack()
    session.input({ type: 'tapUnit', unit: 'B.m1' })
    session.confirmAttack()
    const actions = session.getSnapshot().actions.length
    session.input({ type: 'tapTile', tile: tileFromName('c3') })
    session.selectUnit('A.m2')
    session.stayInPlace()
    session.endTurn()
    const snapshot = session.getSnapshot()
    expect(snapshot.actions).toHaveLength(actions)
    expect(snapshot.rejection).toBe('decision-pending')
    expect(snapshot.state.pending?.kind).toBe('inspiration')
  })

  it("a save on team A's Turn hands the device to team B, then back to team A", () => {
    const session = createBattleSession(createBattle(setup(rendDice())))
    useRend(session)
    expect(session.getSnapshot().state.pending).toMatchObject({ side: 'A' })
    session.declineInspiration()
    let snapshot = session.getSnapshot()
    expect(snapshot.state.pending).toMatchObject({ kind: 'inspiration', side: 'B', roll: { type: 'saveRolled', saved: false } })
    expect(snapshot.state.sideToAct).toBe('A')
    expect(snapshot.screen).toBe('decisionHandoff')

    session.continueHotseat()
    expect(session.getSnapshot().screen).toBe('board')
    session.useInspiration()
    snapshot = session.getSnapshot()
    expect(snapshot.events.map((e) => e.type)).toEqual(['inspirationUsed', 'saveRolled'])
    expect(snapshot.state.inspiration).toEqual({ A: true, B: false })
    // Back to team A, whose Turn it still is.
    expect(snapshot.screen).toBe('decisionHandoff')
    session.continueHotseat()
    expect(session.getSnapshot().screen).toBe('board')
  })

  it('Inspiration on initiative is answered on the initiative screen', () => {
    const session = createBattleSession(createBattle(setup({ rolls: [15, 10] }, false)))
    const place = (side: Side) => {
      for (const tile of (side === 'A' ? ['d1', 'c2', 'e2'] : ['d7', 'e6', 'c6'])) {
        session.input({ type: 'tapTile', tile: tileFromName(tile) })
      }
    }
    place('A')
    session.confirmDeployment()
    session.continueHotseat()
    place('B')
    session.confirmDeployment()
    let snapshot = session.getSnapshot()
    expect(snapshot.screen).toBe('initiative')
    expect(snapshot.state.pending).toMatchObject({ kind: 'inspiration', side: 'B' })
    expect(snapshot.state.initiative).toBeNull()

    session.declineInspiration()
    snapshot = session.getSnapshot()
    expect(snapshot.screen).toBe('initiative')
    expect(snapshot.state.initiative?.firstSide).toBe('A')
    session.continueHotseat()
    expect(session.getSnapshot().screen).toBe('board')
  })

  it('the Replay holds the decisions, plays back, and describes them', () => {
    const seed = 'fedcba9876543210'
    const session = createBattleSession(createBattle(setup({ seed }, false)))
    for (const side of ['A', 'B'] as const) {
      for (const tile of side === 'A' ? ['d1', 'c2', 'e2'] : ['d7', 'e6', 'c6']) {
        session.input({ type: 'tapTile', tile: tileFromName(tile) })
      }
      session.confirmDeployment()
      session.continueHotseat()
    }
    // Initiative: the losing side uses its Inspiration; a side asked again declines.
    for (let i = 0; session.getSnapshot().state.pending?.kind === 'inspiration'; i++) {
      if (i === 0) session.useInspiration()
      else session.declineInspiration()
    }
    session.endTurn()
    const { actions, state } = session.getSnapshot()
    expect(actions.some((a) => a.type === 'useInspiration')).toBe(true)

    const choice = { scenarioId: 'scenario_1', boardId: 'crossroads', mode: 'hotseat', humanSide: 'A' } as const
    const replay = battleReplay(data, choice, seed, actions, { appVersion: 'test', createdAt: '2026-10-15T00:00:00.000Z' })
    const opened = openReplay(JSON.stringify(replay), data)
    if (opened.kind !== 'ready') throw new Error(`replay not ready: ${opened.kind}`)
    expect(opened.steps.at(-1)?.state).toEqual(state)

    const index = actions.findIndex((a) => a.type === 'useInspiration')
    const before = index === 0 ? opened.initial : opened.steps[index - 1]!.state
    const used = actions[index]!
    if (used.type !== 'useInspiration') throw new Error('unreachable')
    expect(describeAction(used, used.side, before, data)).toBe(th.replay.action.useInspiration(used.side))
    expect(describeAction({ type: 'declineInspiration', side: 'A' }, 'A', state, data)).toBe(
      th.replay.action.declineInspiration('A'),
    )
  })
})
