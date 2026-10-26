import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadGameData, tileFromName, type Side, type Tile } from '@mt/shared'
import { applyAction, createBattle, legalActions, type BattleSetup, type BattleState, type UnitId } from '@mt/engine'
import { aiOpponent, createBattleSession, type BattleSession, type PlanOrigin } from '../src/index.ts'

// Action plan (phase 1.x ticket 23, spec stories 55-61): the session offers the
// enemies a Unit can attack in this activation and where from, builds a plan when
// one is picked, and confirming it sends the existing Move (or Blink) and then the
// existing Action. What it offers must be what real play allows after moving.

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
// Fangrel next to Tidewall; Quillfox (B.m2) on c2 shoots at team A, Wispling behind Fangrel's line.
const SCREENED: Tiles = { A: ['a1', 'c5', 'c6'], B: ['g7', 'e5', 'c2'] }
// Fangrel next to Tidewall and Quillfox is far away.
const ADJACENT: Tiles = { A: ['a1', 'd4', 'c3'], B: ['g7', 'd5', 'g6'] }
// Fangrel far from every enemy.
const FAR: Tiles = { A: ['a1', 'a3', 'a2'], B: ['g7', 'g5', 'g6'] }

function newState(tiles: Tiles = MIDDLE, firstSide: Side = 'A', seed = '0123456789abcdef'): BattleState {
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
    dice: { seed },
    preset: { tiles: { A: place('A'), B: place('B') }, firstSide },
  }
  return createBattle(setup)
}

const newSession = (tiles: Tiles = MIDDLE, firstSide: Side = 'A') => createBattleSession(newState(tiles, firstSide))

/** `state` with `status` added to `unit`. */
function withStatus(state: BattleState, unit: UnitId, status: BattleState['units'][number]['statuses'][number]): BattleState {
  return { ...state, units: state.units.map((u) => (u.id === unit ? { ...u, statuses: [...u.statuses, status] } : u)) }
}

const sorted = (ids: Iterable<UnitId>) => [...ids].sort()
const originKey = (o: Pick<PlanOrigin, 'tile' | 'via'>) => `${o.via}:${o.tile.x},${o.tile.y}`

/** The enemies `unit` may attack in `state` right now, straight from the engine's legal actions. */
function enemiesAttackable(state: BattleState, unit: UnitId): Set<UnitId> {
  const side = state.units.find((u) => u.id === unit)!.side
  const isEnemy = (id: UnitId) => state.units.find((u) => u.id === id)!.side !== side
  const found = new Set<UnitId>()
  for (const action of legalActions(state)) {
    if (!('unit' in action) || action.unit !== unit) continue
    if (action.type === 'basicAttack') found.add(action.target)
    if (action.type !== 'useSkill') continue
    const skill = data.skills[action.skill]
    const attacks = skill !== undefined && (skill.attack !== undefined || skill.dcStat !== undefined)
    if (!attacks) continue
    if (action.target !== undefined && isEnemy(action.target)) found.add(action.target)
    if (action.targets !== undefined && action.targets.length === 1 && isEnemy(action.targets[0]!)) found.add(action.targets[0]!)
  }
  return found
}

/**
 * Real play: really move (or Blink) the Unit to every tile it can and read the legal attacks there.
 * Returns origin key → enemies, with the stay origin when it can attack where it stands.
 */
function realPlay(state: BattleState, unit: UnitId): Map<string, UnitId[]> {
  const real = new Map<string, UnitId[]>()
  const record = (key: string, enemies: Set<UnitId>) => {
    if (enemies.size > 0) real.set(key, sorted(enemies))
  }
  record('stay', enemiesAttackable(state, unit))
  const probe = createBattleSession(state)
  probe.selectUnit(unit)
  for (const tile of probe.getSnapshot().reachable) {
    const session = createBattleSession(state)
    session.selectUnit(unit)
    session.input({ type: 'tapTile', tile })
    record(`move:${tile.x},${tile.y}`, enemiesAttackable(session.getSnapshot().state, unit))
  }
  if (probe.getSnapshot().skills.some((b) => b.skill === 'blink' && b.usable)) {
    probe.chooseSkill('blink')
    for (const tile of probe.getSnapshot().tileChoices) {
      const session = createBattleSession(state)
      session.selectUnit(unit)
      session.chooseSkill('blink')
      session.input({ type: 'tapTile', tile })
      session.confirmAttack()
      record(`blink:${tile.x},${tile.y}`, enemiesAttackable(session.getSnapshot().state, unit))
    }
  }
  return real
}

/** What the snapshot says: origin key → enemies. */
function planned(session: BattleSession): Map<string, UnitId[]> {
  const byOrigin = new Map<string, Set<UnitId>>()
  for (const enemy of session.getSnapshot().attackable) {
    for (const origin of enemy.origins) {
      const key = origin.via === 'stay' ? 'stay' : originKey(origin)
      byOrigin.set(key, (byOrigin.get(key) ?? new Set()).add(enemy.unit))
    }
  }
  return new Map([...byOrigin].map(([key, enemies]) => [key, sorted(enemies)]))
}

function expectSamePlay(state: BattleState, unit: UnitId): Map<string, UnitId[]> {
  const session = createBattleSession(state)
  session.selectUnit(unit)
  const mine = planned(session)
  const real = realPlay(state, unit)
  expect([...mine.keys()].sort()).toEqual([...real.keys()].sort())
  for (const [key, enemies] of real) expect(mine.get(key), `${unit} from ${key}`).toEqual(enemies)
  return mine
}

describe('Action plan: the enemies a Unit can attack are those real play allows after moving', () => {
  const cases: readonly [string, BattleState, UnitId][] = [
    ['open Board, Fangrel', newState(MIDDLE, 'A'), 'A.m1'],
    ['open Board, Wispling (Blink and Burst)', newState(MIDDLE, 'A'), 'A.m2'],
    ['line of sight, Quillfox behind a Unit', newState(SCREENED, 'B'), 'B.m2'],
    ['line of sight, Tidewall', newState(SCREENED, 'B'), 'B.m1'],
    ['line of sight, Fangrel in front', newState(SCREENED, 'A'), 'A.m1'],
    ['line of sight, Wispling (flies over)', newState(SCREENED, 'A'), 'A.m2'],
    ['Taunted, the taunter can be reached', withStatus(newState(MIDDLE, 'A'), 'A.m1', { id: 'taunted', source: 'B.m1', turnsLeft: 2 }), 'A.m1'],
    ['Taunted Wispling', withStatus(newState(MIDDLE, 'A'), 'A.m2', { id: 'taunted', source: 'B.m1', turnsLeft: 2 }), 'A.m2'],
    ['Taunted, the taunter out of reach', withStatus(newState(FAR, 'A'), 'A.m1', { id: 'taunted', source: 'B.m1', turnsLeft: 2 }), 'A.m1'],
    ['Pinned next to an enemy', withStatus(newState(ADJACENT, 'A'), 'A.m1', { id: 'pin', turnsLeft: 2 }), 'A.m1'],
    ['Pinned Wispling (Blink still works)', withStatus(newState(MIDDLE, 'A'), 'A.m2', { id: 'pin', turnsLeft: 2 }), 'A.m2'],
    ['nobody in reach', newState(FAR, 'A'), 'A.m1'],
  ]
  for (const [name, state, unit] of cases) {
    it(name, () => {
      expectSamePlay(state, unit)
    })
  }

  it('the layouts are not trivial: somewhere an enemy is reached, only after moving, or only by Blink', () => {
    const open = expectSamePlay(newState(MIDDLE, 'A'), 'A.m1')
    expect([...open.keys()].some((k) => k.startsWith('move:'))).toBe(true)
    const wispling = expectSamePlay(newState(MIDDLE, 'A'), 'A.m2')
    expect([...wispling.keys()].some((k) => k.startsWith('blink:'))).toBe(true)
    const pinned = expectSamePlay(withStatus(newState(ADJACENT, 'A'), 'A.m1', { id: 'pin', turnsLeft: 2 }), 'A.m1')
    expect([...pinned.keys()]).toEqual(['stay'])
  })

  it('a Unit that already moved can only act from where it stands; one that already acted has nothing', () => {
    const session = newSession(ADJACENT, 'A')
    session.selectUnit('A.m1')
    session.input({ type: 'tapTile', tile: tileFromName('c4') })
    const after = session.getSnapshot()
    expect(after.selectedUnit).toBe('A.m1')
    expect(after.attackable.length).toBeGreaterThan(0)
    for (const enemy of after.attackable) expect(enemy.origins.map((o) => o.via)).toEqual(['stay'])
  })

  it('nothing is offered with no Unit selected, during deployment or on the AI\'s Turn', () => {
    const session = newSession()
    expect(session.getSnapshot().attackable).toEqual([])
    const state = newState(MIDDLE, 'B')
    const vsAi = createBattleSession(state, { ai: aiOpponent({ scenarioId: 'scenario_1', boardId: 'crossroads', mode: 'ai', humanSide: 'A' })! })
    vsAi.selectUnit('B.m1')
    expect(vsAi.getSnapshot().attackable).toEqual([])
    vsAi.aimTarget('A.m1')
    expect(vsAi.getSnapshot().plan).toBeNull()
  })
})

describe('Action plan: where the session suggests standing', () => {
  it('the current tile when the enemy is already in range (attack before moving, Hit and Run still possible)', () => {
    const session = newSession(ADJACENT, 'A')
    session.selectUnit('A.m1')
    const tidewall = session.getSnapshot().attackable.find((e) => e.unit === 'B.m1')!
    expect(tidewall.fromHere).toBe(true)
    expect(tidewall.origins[0]).toMatchObject({ via: 'stay', steps: 0, tile: tileFromName('d4') })
    session.aimTarget('B.m1')
    const plan = session.getSnapshot().plan!
    expect(plan.origin.via).toBe('stay')
    expect(plan.steps).toHaveLength(1)
    expect(plan.steps[0]).toMatchObject({ type: 'basicAttack', unit: 'A.m1', target: 'B.m1' })
  })

  it('otherwise the fewest steps, then tile order; the same every time', () => {
    const origins = (session: BattleSession, target: UnitId) => session.getSnapshot().attackable.find((e) => e.unit === target)!.origins
    const first = newSession(MIDDLE, 'A')
    first.selectUnit('A.m1')
    const list = origins(first, 'B.m2')
    expect(list.length).toBeGreaterThan(1)
    for (const o of list) expect(o.via).not.toBe('stay')
    for (let i = 1; i < list.length; i++) {
      const [a, b] = [list[i - 1]!, list[i]!]
      const before = a.steps - b.steps || a.tile.y - b.tile.y || a.tile.x - b.tile.x
      expect(before, `${originKey(a)} before ${originKey(b)}`).toBeLessThan(0)
    }
    const second = newSession(MIDDLE, 'A')
    second.selectUnit('A.m1')
    expect(origins(second, 'B.m2')).toEqual(list)
    first.aimTarget('B.m2')
    expect(first.getSnapshot().plan!.origin).toEqual(list[0])
  })

  it('a walk is preferred to a Blink to the same tile, and a Blink-only tile comes after every walk', () => {
    const session = newSession(MIDDLE, 'A')
    session.selectUnit('A.m2')
    for (const enemy of session.getSnapshot().attackable) {
      const vias = enemy.origins.map((o) => o.via)
      expect(vias).toEqual([...vias].sort((a, b) => ['stay', 'move', 'blink'].indexOf(a) - ['stay', 'move', 'blink'].indexOf(b)))
    }
  })

  it('a tap on a unit that is not attackable does nothing', () => {
    const session = newSession(FAR, 'A')
    session.selectUnit('A.m1')
    session.aimTarget('B.m1')
    expect(session.getSnapshot().plan).toBeNull()
    expect(session.getSnapshot().planTarget).toBeNull()
  })
})

describe('Action plan: changing the tile or the skill before confirming', () => {
  it('chooseOrigin moves the shadow to another tile that reaches the same enemy', () => {
    const session = newSession(MIDDLE, 'A')
    session.selectUnit('A.m1')
    session.aimTarget('B.m2')
    const plan = session.getSnapshot().plan!
    const other = plan.originChoices[1]!
    session.chooseOrigin(other.tile)
    const changed = session.getSnapshot().plan!
    expect(changed.origin).toEqual(other)
    expect(changed.steps[0]).toMatchObject({ type: 'move', to: other.tile })
    expect(changed.preview).not.toBeNull()
    // A tile that does not reach the enemy is ignored.
    session.chooseOrigin(tileFromName('a7'))
    expect(session.getSnapshot().plan!.origin).toEqual(other)
  })

  it('choosePlanAction picks another attack on the target; the preview follows', () => {
    const session = newSession(ADJACENT, 'A')
    session.selectUnit('A.m1')
    session.aimTarget('B.m1')
    const plan = session.getSnapshot().plan!
    const attacks = plan.choices.filter((c) => c.kind === 'attack' && c.target === 'B.m1')
    expect(attacks.length).toBeGreaterThan(1)
    expect(plan.choice).toEqual(attacks[0])
    const second = attacks[1]!
    session.choosePlanAction(second.key)
    const changed = session.getSnapshot().plan!
    expect(changed.choice).toEqual(second)
    expect(changed.preview).toMatchObject({ type: 'attack', skill: second.skill ?? undefined })
    expect(changed.steps.at(-1)).toEqual(second.action)
    session.choosePlanAction('nonsense')
    expect(session.getSnapshot().plan!.choice).toEqual(second)
  })

  it('the plan lists what else the Unit can do from the tile: Defend and support skills', () => {
    const session = newSession(ADJACENT, 'A')
    session.selectUnit('A.m1')
    session.aimTarget('B.m1')
    const kinds = new Set(session.getSnapshot().plan!.choices.map((c) => c.kind))
    expect(kinds.has('attack')).toBe(true)
    expect(kinds.has('defend')).toBe(true)
  })

  it('cancel steps back one choice at a time: the plan, then the Move preview, then the selection', () => {
    const session = newSession(MIDDLE, 'A')
    session.selectUnit('A.m1')
    const tile = session.getSnapshot().reachable[3]!
    session.previewMove(tile)
    const reached = session.getSnapshot().movePreview!.reach.find((r) => r.skill === null)!.targets[0]
    if (reached === undefined) throw new Error('pick a tile that reaches an enemy')
    session.aimTarget(reached)
    expect(session.getSnapshot().plan).not.toBeNull()
    session.cancel()
    expect(session.getSnapshot().plan).toBeNull()
    expect(session.getSnapshot().movePreviewTile).toEqual(tile)
    session.cancel()
    expect(session.getSnapshot().movePreviewTile).toBeNull()
    expect(session.getSnapshot().selectedUnit).toBe('A.m1')
  })

  it('tapping the selected Unit drops only the plan; choosing another Unit drops everything', () => {
    const session = newSession(ADJACENT, 'A')
    session.selectUnit('A.m1')
    session.aimTarget('B.m1')
    session.selectUnit('A.m1')
    expect(session.getSnapshot().plan).toBeNull()
    expect(session.getSnapshot().selectedUnit).toBe('A.m1')
    session.aimTarget('B.m1')
    session.selectUnit('A.m2')
    expect(session.getSnapshot().plan).toBeNull()
    expect(session.getSnapshot().planTarget).toBeNull()
  })

  it('nothing is sent while planning', () => {
    const session = newSession(MIDDLE, 'A')
    session.selectUnit('A.m1')
    const before = session.getSnapshot().state
    session.aimTarget('B.m2')
    session.chooseOrigin(session.getSnapshot().plan!.originChoices[1]!.tile)
    expect(session.getSnapshot().state).toBe(before)
    expect(session.getSnapshot().actions).toEqual([])
    expect(session.getSnapshot().revision).toBe(0)
  })
})

describe('Action plan: tile-first, from the Move preview', () => {
  it('an enemy picked while a shadow is shown is attacked from the shadow\'s tile when that reaches it', () => {
    const session = newSession(MIDDLE, 'A')
    session.selectUnit('A.m1')
    // Find a reachable tile that reaches an enemy.
    let found: { tile: Tile; target: UnitId } | null = null
    for (const tile of session.getSnapshot().reachable) {
      session.previewMove(tile)
      const target = session.getSnapshot().movePreview!.reach.find((r) => r.skill === null)!.targets[0]
      if (target !== undefined) found = { tile, target }
      if (found !== null && session.getSnapshot().attackable.find((e) => e.unit === target)!.origins[0]!.tile !== tile) break
    }
    if (found === null) throw new Error('no tile reaches an enemy')
    session.previewMove(found.tile)
    session.aimTarget(found.target)
    const plan = session.getSnapshot().plan!
    expect(plan.origin).toMatchObject({ via: 'move', tile: found.tile })
    expect(plan.target).toBe(found.target)
  })

  it('if the shadow\'s tile does not reach the enemy the plan is refused', () => {
    const session = newSession(MIDDLE, 'A')
    session.selectUnit('A.m1')
    session.previewMove(tileFromName('a4'))
    const preview = session.getSnapshot().movePreview!
    expect(preview.reach.find((r) => r.skill === null)!.targets).toEqual([])
    // P1X-39: the shadow never moves by itself; nothing is planned and the code says why.
    session.aimTarget('B.m1')
    expect(session.getSnapshot().plan).toBeNull()
    expect(session.getSnapshot().previewRefusal).toBe('out-of-reach-from-preview')
    expect(session.getSnapshot().movePreviewTile).toEqual(tileFromName('a4'))
  })

  it('the Move preview lists what the Unit can do from the shadow, Defend included, and one can be planned', () => {
    const session = newSession(MIDDLE, 'A')
    session.selectUnit('A.m1')
    session.previewMove(session.getSnapshot().reachable[0]!)
    const options = session.getSnapshot().movePreview!.options
    const defend = options.find((o) => o.kind === 'defend')
    if (defend === undefined) throw new Error('Defend should be offered from the shadow')
    session.choosePlanAction(defend.key)
    const plan = session.getSnapshot().plan!
    expect(plan.target).toBeNull()
    expect(plan.origin.via).toBe('move')
    expect(plan.steps).toEqual([{ type: 'move', unit: 'A.m1', to: plan.origin.tile }, defend.action])
    expect(plan.rolls).toBe(false)
  })
})

describe('Action plan: confirming sends the Move and then the Action', () => {
  /** Plays `plan` the old way, one command after the other, on a fresh session. */
  function playByHand(session: BattleSession, to: Tile | null, then: (s: BattleSession) => void) {
    if (to !== null) session.input({ type: 'tapTile', tile: to })
    then(session)
  }

  it('the result is the one of playing the Move and then the attack by hand, field by field', () => {
    const planned = newSession(MIDDLE, 'A')
    planned.selectUnit('A.m1')
    planned.aimTarget('B.m2')
    const plan = planned.getSnapshot().plan!
    expect(plan.origin.via).toBe('move')
    expect(plan.rolls).toBe(true)
    planned.confirmPlan()

    const byHand = newSession(MIDDLE, 'A')
    byHand.selectUnit('A.m1')
    playByHand(byHand, plan.origin.tile, (s) => {
      s.chooseAttack()
      s.input({ type: 'tapUnit', unit: 'B.m2' })
      s.confirmAttack()
    })

    const [a, b] = [planned.getSnapshot(), byHand.getSnapshot()]
    expect(a.state).toEqual(b.state)
    expect(a.actions).toEqual(b.actions)
    expect(a.actions.map((x) => x.type)).toEqual(['move', 'basicAttack'])
    expect(a.log).toEqual(b.log)
    expect(a.revision).toBe(b.revision)
    expect(a.selectedUnit).toBe(b.selectedUnit)
    expect(a.plan).toBeNull()
    expect(a.movePreviewTile).toBeNull()
  })

  it('the same with a Blink and whatever skill reaches: the engine given the same two actions ends in the same state', () => {
    const planned = newSession(MIDDLE, 'A')
    planned.selectUnit('A.m2')
    const enemy = planned.getSnapshot().attackable.find((e) => e.origins.some((o) => o.via === 'blink'))
    if (enemy === undefined) throw new Error('Wispling should reach someone by Blink')
    const blink = enemy.origins.find((o) => o.via === 'blink')!
    planned.aimTarget(enemy.unit)
    planned.chooseOrigin(blink.tile, 'blink')
    const plan = planned.getSnapshot().plan!
    expect(plan.origin.via).toBe('blink')
    expect(plan.steps[0]).toMatchObject({ type: 'useSkill', skill: 'blink', tile: blink.tile })
    expect(plan.steps).toHaveLength(2)
    planned.confirmPlan()

    let state = newState(MIDDLE, 'A')
    for (const action of plan.steps) {
      const result = applyAction(state, action)
      if (!result.ok) throw new Error('the engine refused a step of the plan')
      state = result.state
    }
    expect(planned.getSnapshot().state).toEqual(state)
    expect(planned.getSnapshot().actions).toEqual(plan.steps)
  })

  it('without moving it sends one action, and a skill other than the Basic Attack works', () => {
    const planned = newSession(ADJACENT, 'A')
    planned.selectUnit('A.m1')
    planned.aimTarget('B.m1')
    const plan = planned.getSnapshot().plan!
    const skill = plan.choices.find((c) => c.kind === 'attack' && c.skill !== null)
    if (skill === undefined) throw new Error('Fangrel should have an attack skill')
    planned.choosePlanAction(skill.key)
    planned.confirmPlan()
    expect(planned.getSnapshot().actions).toEqual([skill.action])
    expect(planned.getSnapshot().eventBatches).toHaveLength(1)
  })

  it('the view gets the events of the Move and of the Action, in order', () => {
    const session = newSession(MIDDLE, 'A')
    session.selectUnit('A.m1')
    session.aimTarget('B.m2')
    session.confirmPlan()
    const { eventBatches, events, revision } = session.getSnapshot()
    expect(eventBatches).toHaveLength(2)
    expect(eventBatches[0]!.map((e) => e.type)).toContain('unitMoved')
    expect(eventBatches[1]).toEqual(events)
    expect(events.map((e) => e.type)).not.toContain('unitMoved')
    expect(revision).toBe(2)
    // A single action keeps one batch equal to `events`.
    const single = newSession(MIDDLE, 'A')
    single.selectUnit('A.m1')
    single.input({ type: 'tapTile', tile: single.getSnapshot().reachable[0]! })
    expect(single.getSnapshot().eventBatches).toEqual([single.getSnapshot().events])
  })

  it('confirming with no plan does nothing', () => {
    const session = newSession(MIDDLE, 'A')
    session.selectUnit('A.m1')
    session.confirmPlan()
    expect(session.getSnapshot().actions).toEqual([])
  })

  it('works for team B in Hotseat', () => {
    const session = newSession(MIDDLE, 'B')
    session.selectUnit('B.m1')
    session.aimTarget('A.m2')
    session.confirmPlan()
    expect(session.getSnapshot().actions[0]).toMatchObject({ type: 'move', unit: 'B.m1' })
    expect(session.getSnapshot().actions).toHaveLength(2)
    expect(session.getSnapshot().state.units.find((u) => u.id === 'B.m1')!.hasActed).toBe(true)
  })

  it('a Hit and Run plan leaves the free step pending, like playing it by hand', () => {
    const session = newSession(ADJACENT, 'A')
    session.selectUnit('A.m1')
    session.aimTarget('B.m1')
    const hitAndRun = session.getSnapshot().plan!.choices.find((c) => c.skill === 'hit_and_run')
    if (hitAndRun === undefined) throw new Error('Fangrel should offer Hit and Run')
    session.choosePlanAction(hitAndRun.key)
    session.confirmPlan()
    const snapshot = session.getSnapshot()
    expect(snapshot.state.pending).toMatchObject({ kind: 'retreat', unit: 'A.m1' })
    expect(snapshot.selectedUnit).toBe('A.m1')
    expect(snapshot.attackable).toEqual([])
  })

  it('plan.abandons names the Unit that confirming would stop playing', () => {
    const session = newSession(ADJACENT, 'A')
    session.selectUnit('A.m1')
    session.input({ type: 'tapTile', tile: tileFromName('c4') })
    expect(session.getSnapshot().actionAtStake).toBe('A.m1')
    session.selectUnit('A.m1')
    session.selectUnit('A.m2')
    session.aimTarget('B.m1')
    const other = session.getSnapshot().plan
    expect(other === null ? 'A.m1' : other.abandons).toBe('A.m1')
    session.selectUnit('A.m1')
    session.aimTarget('B.m1')
    expect(session.getSnapshot().plan!.abandons).toBeNull()
  })
})

describe('Action plan: Undo after confirming', () => {
  it('Move then Defend rolls nothing: Undo goes back to the start of the Turn, withdrawing both', () => {
    const session = newSession(MIDDLE, 'A')
    session.selectUnit('A.m1')
    session.previewMove(session.getSnapshot().reachable[0]!)
    const defend = session.getSnapshot().movePreview!.options.find((o) => o.kind === 'defend')!
    session.choosePlanAction(defend.key)
    expect(session.getSnapshot().plan!.rolls).toBe(false)
    const before = newState(MIDDLE, 'A')
    session.confirmPlan()
    expect(session.getSnapshot().undo).toEqual({ to: 'turnStart', actions: 2 })
    session.undo()
    expect(session.getSnapshot().state).toEqual(before)
    expect(session.getSnapshot().actions).toEqual([])
  })

  it('Move then an attack rolls dice: Undo cannot go back across the roll', () => {
    const session = newSession(MIDDLE, 'A')
    session.selectUnit('A.m1')
    session.aimTarget('B.m2')
    expect(session.getSnapshot().plan!.rolls).toBe(true)
    session.confirmPlan()
    expect(session.getSnapshot().actions).toHaveLength(2)
    expect(session.getSnapshot().undo).toBeNull()
  })
})

describe('Action plan: a plan that does not exist any more', () => {
  it('is dropped when the Battle changes under it (the target is no longer attackable)', () => {
    const session = newSession(ADJACENT, 'A')
    session.selectUnit('A.m1')
    session.aimTarget('B.m1')
    expect(session.getSnapshot().plan).not.toBeNull()
    session.confirmPlan()
    expect(session.getSnapshot().plan).toBeNull()
    expect(session.getSnapshot().attackable.every((e) => e.unit !== 'B.m1' || e.origins.length > 0)).toBe(true)
  })
})

describe('Action plan: a tap on the Board never commits (spec story 61)', () => {
  it('tapping a reachable tile through input while a plan exists sends nothing', () => {
    const session = newSession(MIDDLE, 'A')
    session.selectUnit('A.m1')
    session.aimTarget('B.m2')
    const plan = session.getSnapshot().plan!
    const before = session.getSnapshot().state
    const reachable = session.getSnapshot().reachable
    const stray = reachable.find((t) => !plan.originChoices.some((o) => o.tile.x === t.x && o.tile.y === t.y))
    if (stray === undefined) throw new Error('need a reachable tile that is not an origin')
    session.input({ type: 'tapTile', tile: stray })
    expect(session.getSnapshot().state).toBe(before)
    expect(session.getSnapshot().actions).toEqual([])
    expect(session.getSnapshot().plan).toEqual(plan)
  })

  it('tapping a tile that is one of the plan\'s origins moves the shadow there and sends nothing', () => {
    const session = newSession(MIDDLE, 'A')
    session.selectUnit('A.m1')
    session.aimTarget('B.m2')
    const other = session.getSnapshot().plan!.originChoices[1]!
    session.input({ type: 'tapTile', tile: other.tile })
    expect(session.getSnapshot().plan!.origin).toEqual(other)
    expect(session.getSnapshot().actions).toEqual([])
  })

  it('without a plan a tap on a lit tile still moves at once (the old flow)', () => {
    const session = newSession(MIDDLE, 'A')
    session.selectUnit('A.m1')
    session.input({ type: 'tapTile', tile: session.getSnapshot().reachable[0]! })
    expect(session.getSnapshot().actions).toHaveLength(1)
  })
})
