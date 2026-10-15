import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadGameData, serializeReplay, tileFromName, type GameData, type Side } from '@mt/shared'
import { createBattle, decidingSide, legalActions, type Action } from '@mt/engine'
import { aiOpponent, battleSetup, type BattleChoice } from '../src/battleChoice.ts'
import { battleReplay, openReplay } from '../src/replay.ts'
import { createBattleSession, type BattleSession, type HotseatScreen } from '../src/session.ts'

// Playing against the AI through the session (ticket 15): the AI deploys first
// and hidden, plays its Turns one action per aiStep, answers its own decisions
// (Inspiration on a save during the human's Turn included) and never makes the
// human hand a device over. The human can act only on the human's decisions.

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
const SEED = '0badc0de12345678'
const META = { appVersion: 'v0.1.0-test', createdAt: '2026-10-16T09:30:05.000Z' }

function vsAi(humanSide: Side, scenarioId = 'scenario_1', boardId = 'crossroads'): { session: BattleSession; choice: BattleChoice } {
  const choice: BattleChoice = { scenarioId, boardId, mode: 'ai', humanSide }
  const ai = aiOpponent(choice)
  if (ai === undefined) throw new Error('expected an AI opponent')
  return { session: createBattleSession(createBattle(battleSetup(data, choice, SEED)), { ai }), choice }
}

/** The human places on the first free tiles of its zone by tapping, then confirms. */
function humanDeploys(session: BattleSession): void {
  for (let i = 0; i < 3; i++) {
    const { state, selectedUnit } = session.getSnapshot()
    const tile = legalActions(state).find((a) => a.type === 'deploy' && a.unit === selectedUnit)
    if (tile?.type !== 'deploy') throw new Error('nothing to place')
    session.input({ type: 'tapTile', tile: tile.to })
  }
  session.confirmDeployment()
}

/** One human decision through the UI: keep rolls, stay after Hit and Run, attack if possible, else end the Turn. */
function humanPlays(session: BattleSession): void {
  const { state } = session.getSnapshot()
  if (state.pending?.kind === 'inspiration') return session.declineInspiration()
  if (state.pending?.kind === 'retreat') return session.stayInPlace()
  const attack = legalActions(state).find((a) => a.type === 'basicAttack')
  if (attack?.type === 'basicAttack') {
    session.selectUnit(attack.unit)
    session.chooseAttack()
    session.input({ type: 'tapUnit', unit: attack.target })
    session.confirmAttack()
    return
  }
  session.endTurn()
}

/** Play to the end: the AI through aiStep, the human through the UI. Returns every screen seen. */
function playToTheEnd(session: BattleSession): { screens: Set<HotseatScreen>; aiSteps: number } {
  const screens = new Set<HotseatScreen>()
  let aiSteps = 0
  for (let i = 0; i < 3000 && session.getSnapshot().state.outcome === null; i++) {
    const snapshot = session.getSnapshot()
    screens.add(snapshot.screen)
    if (snapshot.screen === 'initiative' && !snapshot.aiToAct && snapshot.state.pending === null) {
      session.continueHotseat()
    } else if (snapshot.aiToAct) {
      const before = snapshot.actions.length
      expect(session.aiStep()).toBe(true)
      // One AI action per step: each one shows on the Board and in the log on its own.
      expect(session.getSnapshot().actions.length).toBe(before + 1)
      aiSteps++
    } else {
      humanPlays(session)
    }
  }
  return { screens, aiSteps }
}

describe('vs AI: deployment', () => {
  it('the AI (team A) places first and hidden; the human (B) places; both are revealed together', () => {
    const { session } = vsAi('B')
    const start = session.getSnapshot()
    expect(start.state.phase).toBe('deployment')
    expect(start.state.sideToAct).toBe('B')
    expect(start.state.deployment?.confirmed.A).toBe(true)
    expect(Object.keys(start.state.deployment?.placements.A ?? {})).toHaveLength(3)
    // The human sees none of team A's Units.
    expect(start.units.some((u) => u.side === 'A')).toBe(false)
    expect(start.screen).toBe('board')
    expect(start.selectedUnit).toBe('B.tamer')

    humanDeploys(session)
    const revealed = session.getSnapshot()
    expect(revealed.state.phase).toBe('play')
    expect(revealed.units.filter((u) => u.side === 'A')).toHaveLength(3)
    expect(revealed.log.some((e) => e.type === 'deploymentRevealed')).toBe(true)
    expect(revealed.screen).toBe('initiative')
  })

  it('the AI (team B) has its placements ready before the human (A) places; no hand-off screen', () => {
    const { session } = vsAi('A')
    const start = session.getSnapshot()
    expect(start.state.sideToAct).toBe('A')
    expect(start.actions).toEqual([])
    humanDeploys(session)
    const after = session.getSnapshot()
    expect(after.state.phase).toBe('play')
    expect(after.screen).toBe('initiative')
    const aiPlacements = after.actions.filter((a) => a.type === 'deploy' && a.unit.startsWith('B'))
    expect(aiPlacements).toHaveLength(3)
  })
})

describe('vs AI: a whole Battle', () => {
  for (const humanSide of ['A', 'B'] as const) {
    it(`human as team ${humanSide}: the AI plays every Turn step by step, to the end, with no hand-over screens`, () => {
      const { session, choice } = vsAi(humanSide, 'scenario_2', 'shallows')
      if (session.getSnapshot().state.phase === 'deployment') humanDeploys(session)
      const { screens, aiSteps } = playToTheEnd(session)
      const end = session.getSnapshot()
      expect(end.state.outcome).not.toBeNull()
      expect(aiSteps).toBeGreaterThan(10)
      expect(screens.has('handoff')).toBe(false)
      expect(screens.has('decisionHandoff')).toBe(false)
      // The human sees the Board from its own side throughout.
      expect(end.aiSide).toBe(humanSide === 'A' ? 'B' : 'A')

      // Replay of the AI Battle: every action (the AI's included) is recorded and plays back exactly.
      const replay = battleReplay(data, choice, SEED, end.actions, META)
      expect(replay).toMatchObject({ mode: 'ai', humanSide })
      const opened = openReplay(serializeReplay(replay), data)
      if (opened.kind !== 'ready') throw new Error(`expected a ready Replay, got ${opened.kind}`)
      expect(opened.steps).toHaveLength(end.actions.length)
      expect(opened.steps.at(-1)?.state).toEqual(end.state)
    }, 60000)
  }
})

describe("vs AI: decisions on the AI's side", () => {
  /** Human A's Tamer next to nobody, Distract range to B.m1; Inspiration on for both. */
  function distractSession(rolls: number[]) {
    const t = (names: [string, string, string]) => names.map((n) => tileFromName(n)) as [never, never, never]
    const choice: BattleChoice = { scenarioId: 'scenario_1', boardId: 'crossroads', mode: 'ai', humanSide: 'A' }
    const ai = aiOpponent(choice)!
    const state = createBattle({
      ...battleSetup(data, choice, SEED),
      dice: { rolls },
      preset: { tiles: { A: t(['d4', 'a1', 'g1']), B: t(['a7', 'd6', 'g7']) }, firstSide: 'A' },
    })
    return createBattleSession(state, { ai })
  }

  it("the AI answers its failed save during the human's Turn on its own (Inspiration), then the human plays on", () => {
    // B.m1 (Tidewall) fails its SPI save (3), the AI rerolls (18): Off-balance does not stick.
    const session = distractSession([3, 18])
    session.selectUnit('A.tamer')
    session.chooseSkill('distract')
    session.input({ type: 'tapUnit', unit: 'B.m1' })
    session.confirmAttack()
    const paused = session.getSnapshot()
    expect(paused.state.pending).toMatchObject({ kind: 'inspiration', side: 'B' })
    expect(paused.state.sideToAct).toBe('A')
    expect(paused.aiToAct).toBe(true)
    expect(paused.screen).toBe('board')

    // The human cannot answer for the AI.
    session.useInspiration()
    session.declineInspiration()
    expect(session.getSnapshot().actions).toHaveLength(1)

    expect(session.aiStep()).toBe(true)
    const after = session.getSnapshot()
    expect(after.actions.at(-1)).toEqual({ type: 'useInspiration', side: 'B' })
    expect(after.state.pending).toBeNull()
    expect(decidingSide(after.state)).toBe('A')
    expect(after.aiToAct).toBe(false)
    expect(after.screen).toBe('board')
    expect(after.log.some((e) => e.type === 'saveRolled' && e.rerolled === true && e.saved)).toBe(true)
  })

  it("the human cannot move or select the AI's Units on the AI's Turn", () => {
    const session = distractSession([])
    session.endTurn()
    const aiTurn = session.getSnapshot()
    expect(aiTurn.state.sideToAct).toBe('B')
    expect(aiTurn.aiToAct).toBe(true)
    session.selectUnit('B.m1')
    expect(session.getSnapshot().selectedUnit).toBeNull()
    session.endTurn()
    expect(session.getSnapshot().actions).toEqual([{ type: 'endTurn' }] satisfies Action[])
  })
})
