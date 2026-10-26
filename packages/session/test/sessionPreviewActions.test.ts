import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadGameData, tileFromName, type Side, type Tile } from '@mt/shared'
import { applyAction, createBattle, type Action, type BattleSetup, type BattleState, type UnitId } from '@mt/engine'
import { aiOpponent, createBattleSession, type BattleSession } from '../src/index.ts'

// P1X-39: while a Move preview is shown, every action chosen is worked out from the shadow's tile and
// planned as Move (or Blink) + that action, confirmed once. Out of reach: no plan, the shadow stays.

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

// Fangrel (A.m1) d4, Wispling (A.m2) c3; Tidewall (B.m1) e5 and Quillfox (B.m2) b6.
const MIDDLE: Tiles = { A: ['a1', 'd4', 'c3'], B: ['a7', 'e5', 'b6'] }
// Quillfox (B.m2) on e7 (forest) so it can Camouflage; team A far away.
const FOREST: Tiles = { A: ['a1', 'a3', 'a2'], B: ['g7', 'f3', 'e7'] }

function newState(tiles: Tiles = MIDDLE, firstSide: Side = 'A'): BattleState {
  const place = (side: Side) => {
    const [tamer, m1, m2] = tiles[side].map(tileFromName)
    return [tamer!, m1!, m2!] as const
  }
  const setup: BattleSetup = {
    scenario: data.scenarios.scenario_1!,
    board: data.boards.crossroads!,
    species: data.species,
    skills: data.skills,
    statuses: data.statuses,
    elementWheel: data.elementWheel,
    dice: { seed: '0123456789abcdef' },
    preset: { tiles: { A: place('A'), B: place('B') }, firstSide },
  }
  return createBattle(setup)
}

function play(state: BattleState, actions: readonly Action[]): BattleState {
  let current = state
  for (const action of actions) {
    const result = applyAction(current, action)
    if (!result.ok) throw new Error(`the engine refused ${JSON.stringify(action)}: ${result.rejection.code}`)
    current = result.state
  }
  return current
}

const sameTile = (a: Tile, b: Tile) => a.x === b.x && a.y === b.y

/** A tile `unit` can walk to from which the Basic Attack reaches an enemy. */
function tileReaching(state: BattleState, unit: UnitId): { tile: Tile; target: UnitId } {
  const session = createBattleSession(state)
  session.selectUnit(unit)
  for (const tile of session.getSnapshot().reachable) {
    session.previewMove(tile)
    const target = session.getSnapshot().movePreview!.reach.find((r) => r.skill === null)!.targets[0]
    if (target !== undefined) return { tile, target }
  }
  throw new Error('no tile reaches an enemy')
}

describe('Move preview: actions are planned from the shadow', () => {
  it.each([
    ['team A', 'A' as Side, 'A.m1'],
    ['team B', 'B' as Side, 'B.m1'],
  ])('%s: Defend does not dispatch; it plans Move + Defend and confirming plays them', (_name, side, unit) => {
    const state = newState(MIDDLE, side)
    const session = createBattleSession(state)
    session.selectUnit(unit)
    const tile = session.getSnapshot().reachable[0]!
    session.previewMove(tile)
    session.defend()
    const snapshot = session.getSnapshot()
    expect(snapshot.actions).toEqual([])
    expect(snapshot.state).toBe(state)
    expect(snapshot.movePreviewTile).toEqual(tile)
    expect(snapshot.plan).toMatchObject({ unit, target: null, origin: { tile, via: 'move' } })
    const steps: Action[] = [{ type: 'move', unit, to: tile }, { type: 'defend', unit }]
    expect(snapshot.plan!.steps).toEqual(steps)
    session.confirmPlan()
    const done = session.getSnapshot()
    expect(done.state).toEqual(play(state, steps))
    expect(done.actions).toEqual(steps)
    expect(done.recorded).toEqual(steps)
  })

  it('Basic Attack, a skill and a tap on an enemy all plan from the shadow; confirming equals playing by hand', () => {
    const state = newState(MIDDLE, 'A')
    const { tile, target } = tileReaching(state, 'A.m1')
    const ways: [string, (s: BattleSession) => void][] = [
      ['chooseAttack', (s) => s.chooseAttack()],
      ['tap on the enemy', (s) => s.input({ type: 'tapUnit', unit: target })],
      ['aimTarget', (s) => s.aimTarget(target)],
    ]
    for (const [name, choose] of ways) {
      const session = createBattleSession(state)
      session.selectUnit('A.m1')
      session.previewMove(tile)
      choose(session)
      const snapshot = session.getSnapshot()
      expect(snapshot.plan, name).not.toBeNull()
      expect(snapshot.plan!.origin, name).toMatchObject({ tile, via: 'move' })
      expect(snapshot.plan!.choice, name).toMatchObject({ kind: 'attack', target })
      expect(snapshot.movePreviewTile, name).toEqual(tile)
      expect(snapshot.actions, name).toEqual([])
      session.confirmPlan()
      const steps = [{ type: 'move', unit: 'A.m1', to: tile }, snapshot.plan!.choice!.action] as Action[]
      expect(session.getSnapshot().state, name).toEqual(play(state, steps))
      expect(session.getSnapshot().actions, name).toEqual(steps)
    }
  })

  it('a skill button plans that skill from the shadow, on the plan\'s target when it reaches', () => {
    const state = newState(MIDDLE, 'A')
    const { tile, target } = tileReaching(state, 'A.m1')
    const session = createBattleSession(state)
    session.selectUnit('A.m1')
    session.previewMove(tile)
    const reach = session.getSnapshot().movePreview!.reach.find((r) => r.skill !== null && r.targets.length > 0)
    if (reach === undefined) throw new Error('Fangrel should have an attack skill that reaches from the shadow')
    expect(session.getSnapshot().skills.find((b) => b.skill === reach.skill)!.fromMovePreview).toBe('plannable')
    session.chooseSkill(reach.skill!)
    const plan = session.getSnapshot().plan!
    expect(plan.origin).toMatchObject({ tile, via: 'move' })
    expect(plan.choice).toMatchObject({ skill: reach.skill, target: reach.targets[0] })
    expect(session.getSnapshot().mode).toBe('move')
    expect(target).toBeDefined()
    session.confirmPlan()
    expect(session.getSnapshot().state).toEqual(play(state, plan.steps))
  })

  it('works against the AI for the human side', () => {
    const state = newState(MIDDLE, 'A')
    const ai = aiOpponent({ scenarioId: 'scenario_1', boardId: 'crossroads', mode: 'ai', humanSide: 'A' })!
    const session = createBattleSession(state, { ai })
    session.selectUnit('A.m1')
    const tile = session.getSnapshot().reachable[0]!
    session.previewMove(tile)
    session.defend()
    expect(session.getSnapshot().actions).toEqual([])
    session.confirmPlan()
    expect(session.getSnapshot().actions).toEqual([{ type: 'move', unit: 'A.m1', to: tile }, { type: 'defend', unit: 'A.m1' }])
  })

  it('a Blink shadow: Defend and an attack plan Blink + action, and cancel steps back to the shadow, then the aim', () => {
    const state = newState(MIDDLE, 'A')
    const session = createBattleSession(state)
    session.selectUnit('A.m2')
    session.chooseSkill('blink')
    const tile = session.getSnapshot().tileChoices[0]!
    session.input({ type: 'tapTile', tile })
    expect(session.getSnapshot().movePreview).toMatchObject({ skill: 'blink', tile })
    session.defend()
    let snapshot = session.getSnapshot()
    expect(snapshot.actions).toEqual([])
    expect(snapshot.plan).toMatchObject({ origin: { tile, via: 'blink' } })
    expect(snapshot.plan!.steps[0]).toMatchObject({ type: 'useSkill', skill: 'blink', tile })
    expect(snapshot.movePreview).toMatchObject({ skill: 'blink', tile })
    session.cancel()
    snapshot = session.getSnapshot()
    expect(snapshot.plan).toBeNull()
    expect(snapshot.movePreview).toMatchObject({ skill: 'blink', tile })
    session.defend()
    session.confirmPlan()
    const steps = session.getSnapshot().actions
    expect(steps).toHaveLength(2)
    expect(session.getSnapshot().state).toEqual(play(state, steps))
  })

  it('a Blink shadow that reaches an enemy plans the attack from the Blink tile', () => {
    const state = newState(MIDDLE, 'A')
    const probe = createBattleSession(state)
    probe.selectUnit('A.m2')
    probe.chooseSkill('blink')
    let found: { tile: Tile; target: UnitId } | null = null
    for (const tile of probe.getSnapshot().tileChoices) {
      probe.input({ type: 'tapTile', tile })
      const target = probe.getSnapshot().movePreview?.reach.find((r) => r.skill === null)?.targets[0]
      if (target !== undefined) {
        found = { tile, target }
        break
      }
    }
    if (found === null) throw new Error('no Blink tile reaches an enemy')
    probe.chooseAttack()
    const plan = probe.getSnapshot().plan!
    expect(plan.origin).toMatchObject({ tile: found.tile, via: 'blink' })
    expect(plan.target).toBe(found.target)
    probe.confirmPlan()
    expect(probe.getSnapshot().state).toEqual(play(state, plan.steps))
    expect(probe.getSnapshot().actions).toEqual(plan.steps)
  })

  it('choosing another origin of the plan moves the shadow with it', () => {
    const session = createBattleSession(newState(MIDDLE, 'A'))
    session.selectUnit('A.m1')
    const state = session.getSnapshot().state
    const { tile, target } = tileReaching(state, 'A.m1')
    session.previewMove(tile)
    session.aimTarget(target)
    const other = session.getSnapshot().plan!.originChoices.find((o) => o.via === 'move' && !sameTile(o.tile, tile))
    if (other === undefined) throw new Error('the enemy should be reachable from another tile')
    session.chooseOrigin(other.tile)
    const snapshot = session.getSnapshot()
    expect(snapshot.movePreviewTile).toEqual(other.tile)
    expect(snapshot.movePreview!.tile).toEqual(other.tile)
    expect(snapshot.plan!.origin).toMatchObject({ tile: other.tile, via: 'move' })
  })
})

describe('Move preview: out of reach from the shadow', () => {
  function farShadow() {
    const state = newState(MIDDLE, 'A')
    const session = createBattleSession(state)
    session.selectUnit('A.m1')
    session.previewMove(tileFromName('a4'))
    expect(session.getSnapshot().movePreview!.reach.find((r) => r.skill === null)!.targets).toEqual([])
    return { state, session }
  }

  it('aimTarget and a tap on an enemy: no plan, the shadow stays, the selection stays, the code says why', () => {
    for (const aim of [(s: BattleSession) => s.aimTarget('B.m1'), (s: BattleSession) => s.input({ type: 'tapUnit', unit: 'B.m1' })]) {
      const { session } = farShadow()
      aim(session)
      const snapshot = session.getSnapshot()
      expect(snapshot.previewRefusal).toBe('out-of-reach-from-preview')
      expect(snapshot.plan).toBeNull()
      expect(snapshot.movePreviewTile).toEqual(tileFromName('a4'))
      expect(snapshot.selectedUnit).toBe('A.m1')
      expect(snapshot.rejection).toBeNull()
      expect(snapshot.actions).toEqual([])
    }
  })

  it('Basic Attack and a skill the shadow cannot reach are refused too; the next command clears the code', () => {
    const { session } = farShadow()
    session.chooseAttack()
    expect(session.getSnapshot()).toMatchObject({ previewRefusal: 'out-of-reach-from-preview', plan: null, mode: 'move' })
    const attack = session.getSnapshot().skills.find((b) => b.fromMovePreview === 'out-of-reach')
    if (attack === undefined) throw new Error('some skill should be out of reach from a4')
    session.chooseSkill(attack.skill)
    expect(session.getSnapshot()).toMatchObject({ previewRefusal: 'out-of-reach-from-preview', plan: null, movePreviewTile: tileFromName('a4') })
    session.defend()
    expect(session.getSnapshot().previewRefusal).toBeNull()
    expect(session.getSnapshot().plan).not.toBeNull()
  })

  it('without a Move preview the code is null', () => {
    const session = createBattleSession(newState(MIDDLE, 'A'))
    session.selectUnit('A.m1')
    expect(session.getSnapshot().previewRefusal).toBeNull()
    expect(session.getSnapshot().skills.every((b) => b.fromMovePreview === null)).toBe(true)
  })
})

describe('Move preview: Camouflage', () => {
  it('is disabled during a preview, chooseSkill does nothing, and it works again once the preview is cancelled', () => {
    const session = createBattleSession(newState(FOREST, 'B'))
    session.selectUnit('B.m2')
    expect(session.getSnapshot().skills.find((b) => b.skill === 'camouflage')).toMatchObject({ usable: true, fromMovePreview: null })
    session.previewMove(session.getSnapshot().reachable[0]!)
    const during = session.getSnapshot()
    expect(during.skills.find((b) => b.skill === 'camouflage')!.fromMovePreview).toBe('move-first')
    session.chooseSkill('camouflage')
    const after = session.getSnapshot()
    expect(after.actions).toEqual([])
    expect(after.plan).toBeNull()
    expect(after.mode).toBe('move')
    expect(after.movePreviewTile).toEqual(during.movePreviewTile)
    session.cancelMovePreview()
    session.chooseSkill('camouflage')
    expect(session.getSnapshot()).toMatchObject({ mode: 'skill', pendingSkill: 'camouflage' })
  })
})

describe('Move preview: cancelling restores acting from the real tile', () => {
  it('cancelMovePreview then Attack aims from where the Unit stands (attack before moving)', () => {
    const session = createBattleSession(newState(MIDDLE, 'A'))
    session.selectUnit('A.m1')
    session.previewMove(session.getSnapshot().reachable[0]!)
    session.cancelMovePreview()
    session.defend()
    expect(session.getSnapshot().actions).toEqual([{ type: 'defend', unit: 'A.m1' }])
  })

  it('cancel steps back from a planned action to the preview, then to the real tile', () => {
    const session = createBattleSession(newState(MIDDLE, 'A'))
    session.selectUnit('A.m1')
    const tile = session.getSnapshot().reachable[0]!
    session.previewMove(tile)
    session.defend()
    session.cancel()
    expect(session.getSnapshot()).toMatchObject({ plan: null, movePreviewTile: tile })
    session.cancel()
    expect(session.getSnapshot().movePreviewTile).toBeNull()
    expect(session.getSnapshot().selectedUnit).toBe('A.m1')
    session.chooseAttack()
    const snapshot = session.getSnapshot()
    expect(snapshot.mode === 'attack' || !snapshot.canAttack).toBe(true)
  })

  it('Hit and Run still works from the real tile after cancelling a preview', () => {
    const state = newState({ A: ['a1', 'd4', 'c3'], B: ['g7', 'd5', 'g6'] }, 'A')
    const session = createBattleSession(state)
    session.selectUnit('A.m1')
    session.previewMove(session.getSnapshot().reachable[0]!)
    session.cancelMovePreview()
    session.chooseSkill('hit_and_run')
    expect(session.getSnapshot()).toMatchObject({ mode: 'skill', pendingSkill: 'hit_and_run', plan: null })
    session.input({ type: 'tapUnit', unit: 'B.m1' })
    session.confirmAttack()
    expect(session.getSnapshot().state.pending).toMatchObject({ kind: 'retreat', unit: 'A.m1' })
  })
})

describe('Move preview: after confirming the move alone', () => {
  it('the Unit stays selected and its actions come from the new tile', () => {
    const state = newState(MIDDLE, 'A')
    const { tile, target } = tileReaching(state, 'A.m1')
    const session = createBattleSession(state)
    session.selectUnit('A.m1')
    session.previewMove(tile)
    session.confirmMove()
    const snapshot = session.getSnapshot()
    expect(snapshot.selectedUnit).toBe('A.m1')
    expect(snapshot.state.units.find((u) => u.id === 'A.m1')!.tile).toEqual(tile)
    expect(snapshot.movePreview).toBeNull()
    expect(snapshot.attackable.map((e) => e.unit)).toContain(target)
    expect(snapshot.attackable.find((e) => e.unit === target)!.fromHere).toBe(true)
    session.chooseAttack()
    expect(session.getSnapshot().mode).toBe('attack')
  })
})

describe('Move preview: Command from the shadow (Tamer)', () => {
  it('plans Move + Command from the shadow and confirming equals playing them', () => {
    const tiles: Tiles = { A: ['d2', 'c3', 'e2'], B: ['d7', 'c5', 'e6'] }
    const session = createBattleSession(newState(tiles, 'A'))
    session.endTurn()
    session.endTurn()
    session.selectUnit('A.tamer')
    const tile = session.getSnapshot().reachable.find((t) => t.x === tileFromName('d3').x && t.y === tileFromName('d3').y)!
    session.previewMove(tile)
    session.chooseCommand()
    const snapshot = session.getSnapshot()
    expect(snapshot.plan).toMatchObject({ origin: { tile, via: 'move' }, choice: { kind: 'command' } })
    const before = snapshot.state
    const steps = snapshot.plan!.steps
    expect(steps[0]).toEqual({ type: 'move', unit: 'A.tamer', to: tile })
    expect(steps[1]!.type).toBe('command')
    session.confirmPlan()
    expect(session.getSnapshot().state).toEqual(play(before, steps))
  })
})
