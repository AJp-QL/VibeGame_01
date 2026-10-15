/**
 * The engine's public seam (spec "Interface ของ engine", Seam A):
 * createBattle → legalActions / applyAction → new state + events.
 */
import {
  isOnBoard,
  SIDES,
  tileFromName,
  tileName,
  type Board,
  type Dice,
  type Scenario,
  type Side,
  type Skill,
  type Species,
  type Tile,
} from '@mt/shared'
import {
  BASIC_ATTACK,
  checkAttack,
  isRejection,
  previewAttack,
  resolveAttack,
  type AttackPreview,
  type RollMode,
} from './combat.ts'
import { diceStream, type DiceSource } from './dice.ts'
import { derive, type DerivedValues } from './derived.ts'
import { pathTo, reachableTiles } from './movement.ts'
import {
  findAnyUnit,
  findUnit,
  type BattleEndCause,
  type BattleState,
  type UnitId,
  type UnitState,
} from './state.ts'

// ----------------------------------------------------------------- actions

export type Action =
  /** Move a Unit of the side to act to `to` (rules §6.1). */
  | { readonly type: 'move'; readonly unit: UnitId; readonly to: Tile }
  /** Basic Attack (rules §15.1): the Unit's Action, against one enemy in range. */
  | { readonly type: 'basicAttack'; readonly unit: UnitId; readonly target: UnitId }
  /** End the current Turn; the other side starts its Turn (rules §17.4). */
  | { readonly type: 'endTurn' }

// ------------------------------------------------------------------ events

/** What happened, in order. UI and log are built from these only. */
export type BattleEvent =
  | {
      readonly type: 'unitMoved'
      readonly unit: UnitId
      readonly from: Tile
      readonly to: Tile
      /** Every tile stepped on after `from`, ending with `to`. */
      readonly path: readonly Tile[]
    }
  | {
      /** An attack roll (rules §10.2): the d20s rolled, the one that counts, hit or miss, critical. */
      readonly type: 'attackRolled'
      readonly attacker: UnitId
      readonly target: UnitId
      readonly skill: string
      readonly rollMode: RollMode
      /** Every d20 rolled, in order (two with advantage or disadvantage). */
      readonly rolls: readonly number[]
      /** The d20 that counts. 20 = critical and always hits; 1 always misses. */
      readonly natural: number
      readonly attackBonus: number
      readonly total: number
      readonly defence: number
      readonly defenceKind: 'guard' | 'ward'
      readonly hit: boolean
      readonly critical: boolean
    }
  | {
      /** Damage rolled and taken off the target's HP (rules §10.3). */
      readonly type: 'damageDealt'
      readonly source: UnitId
      readonly target: UnitId
      readonly skill: string
      /** Dice rolled, already doubled on a critical. */
      readonly dice: Dice
      readonly rolls: readonly number[]
      readonly modifier: number
      /** Full damage, even past the HP left (rules §10.3, D-11). */
      readonly amount: number
      readonly hpBefore: number
      readonly hpAfter: number
    }
  /** A Unit reached 0 HP and left the Board (rules §10.4). */
  | { readonly type: 'unitDown'; readonly unit: UnitId; readonly tile: Tile }
  /** The Battle is over (rules §19.1); nothing more can happen. */
  | { readonly type: 'battleEnded'; readonly winner: Side; readonly cause: BattleEndCause; readonly round: number }
  | { readonly type: 'turnEnded'; readonly side: Side; readonly turn: number }
  | { readonly type: 'turnStarted'; readonly side: Side; readonly turn: number; readonly round: number }

// -------------------------------------------------------------- rejections

export type RejectionCode =
  | 'unknown-action'
  | 'unknown-unit'
  | 'not-your-turn'
  | 'already-moved'
  | 'off-board'
  | 'tile-occupied'
  | 'out-of-reach'
  | 'battle-over'
  | 'already-acted'
  | 'unknown-skill'
  | 'not-an-enemy'
  | 'out-of-range'

export interface Rejection {
  readonly code: RejectionCode
  /** Developer-facing explanation (English); the UI shows its own text per code. */
  readonly message: string
}

export type ApplyResult =
  | { readonly ok: true; readonly state: BattleState; readonly events: readonly BattleEvent[] }
  /** Illegal action: `state` is the unchanged input state. */
  | { readonly ok: false; readonly state: BattleState; readonly rejection: Rejection }

// ------------------------------------------------------------------ create

export interface BattleSetup {
  readonly scenario: Scenario
  readonly board: Board
  /** Species by id; must contain every species the Scenario uses. */
  readonly species: Readonly<Record<string, Species>>
  /** Skills by id; must contain Basic Attack. */
  readonly skills: Readonly<Record<string, Skill>>
  /** Dice Seed for play, or scripted roll results for tests. */
  readonly dice: DiceSource
}

/**
 * Create a Battle from a Scenario, Board and dice source.
 *
 * Until deployment exists (ticket 04) Units start on the Scenario's starting
 * tiles and team A plays first. Throws on setup that does not fit together
 * (wrong Board, unknown species, bad Dice Seed): that is a data or programming
 * error, not an illegal action.
 */
export function createBattle(setup: BattleSetup): BattleState {
  const { scenario, board, species, skills } = setup
  if (scenario.board !== board.id) {
    throw new Error(`Scenario "${scenario.id}" uses Board "${scenario.board}", got "${board.id}"`)
  }
  if (skills[BASIC_ATTACK] === undefined) throw new Error(`Skills must include "${BASIC_ATTACK}"`)

  const units: UnitState[] = []
  for (const side of SIDES) {
    const team = scenario.teams[side]
    const [tamerTile, ...monsterTiles] = team.startingTiles.map(tileFromName)
    units.push({
      id: `${side}.tamer`,
      side,
      kind: 'tamer',
      level: team.tamer.level,
      stats: team.tamer.stats,
      skills: team.tamer.skills,
      tile: tamerTile ?? { x: -1, y: -1 },
      hp: 0,
      hasMoved: false,
      hasActed: false,
    })
    team.monsters.forEach((monster, index) => {
      const speciesData = species[monster.species]
      if (speciesData === undefined) throw new Error(`Unknown species "${monster.species}"`)
      units.push({
        id: `${side}.m${index + 1}`,
        side,
        kind: 'monster',
        species: monster.species,
        element: monster.element,
        star: monster.star,
        stats: monster.stats,
        skills: monster.skills,
        build: speciesData.build,
        movement: speciesData.movement,
        guardBonus: speciesData.guardBonus,
        tile: monsterTiles[index] ?? { x: -1, y: -1 },
        hp: 0,
        hasMoved: false,
        hasActed: false,
      })
    })
  }

  const taken = new Set<string>()
  for (const unit of units) {
    const name = tileName(unit.tile)
    if (!isOnBoard(unit.tile) || taken.has(name)) {
      throw new Error(`Unit ${unit.id} cannot start on ${name}`)
    }
    taken.add(name)
  }

  return {
    scenarioId: scenario.id,
    boardId: board.id,
    terrain: board.terrain,
    // Every Unit starts at full HP.
    units: units.map((unit) => ({ ...unit, hp: derive(unit).maxHp })),
    fallen: [],
    firstSide: 'A',
    sideToAct: 'A',
    turnNumber: { A: 1, B: 0 },
    round: 1,
    dice: diceStream(setup.dice),
    skills,
    outcome: null,
  }
}

// ------------------------------------------------------------------- query

/**
 * Every legal action for the side to act: Moves, then Basic Attacks, End Turn
 * last. None once the Battle is over.
 */
export function legalActions(state: BattleState): Action[] {
  if (state.outcome !== null) return []
  const actions: Action[] = []
  for (const unit of state.units) {
    if (unit.side !== state.sideToAct || unit.hasMoved) continue
    for (const path of reachableTiles(state, unit).values()) {
      const to = path[path.length - 1]
      if (to !== undefined) actions.push({ type: 'move', unit: unit.id, to })
    }
  }
  for (const unit of state.units) {
    if (unit.side !== state.sideToAct || unit.hasActed) continue
    for (const target of state.units) {
      if (!isRejection(checkAttack(state, unit.id, BASIC_ATTACK, target.id))) {
        actions.push({ type: 'basicAttack', unit: unit.id, target: target.id })
      }
    }
  }
  actions.push({ type: 'endTurn' })
  return actions
}

/**
 * Values computed from a Unit's data (rules §3.2), for a Unit on the Board or
 * one that has fallen. Throws on an unknown id.
 */
export function derivedValues(state: BattleState, unitId: UnitId): DerivedValues {
  const unit = findAnyUnit(state, unitId)
  if (unit === undefined) throw new Error(`Unknown Unit "${unitId}"`)
  return derive(unit)
}

// ------------------------------------------------------------------- apply

/** Apply an action: new state + ordered events, or a rejection with the state unchanged. */
export function applyAction(state: BattleState, action: Action): ApplyResult {
  if (state.outcome !== null) return reject(state, 'battle-over', 'The Battle is over')
  switch (action.type) {
    case 'move':
      return applyMove(state, action.unit, action.to)
    case 'basicAttack':
      return applyBasicAttack(state, action.unit, action.target)
    case 'endTurn':
      return applyEndTurn(state)
    default:
      return reject(state, 'unknown-action', `Unknown action ${JSON.stringify(action)}`)
  }
}

function reject(state: BattleState, code: RejectionCode, message: string): ApplyResult {
  return { ok: false, state, rejection: { code, message } }
}

function applyMove(state: BattleState, unitId: UnitId, to: Tile): ApplyResult {
  const unit = findUnit(state, unitId)
  if (unit === undefined) return reject(state, 'unknown-unit', `No Unit "${unitId}"`)
  if (unit.side !== state.sideToAct) {
    return reject(state, 'not-your-turn', `${unitId} belongs to side ${unit.side}; side ${state.sideToAct} is to act`)
  }
  if (unit.hasMoved) return reject(state, 'already-moved', `${unitId} already moved this Turn`)
  if (!isOnBoard(to)) return reject(state, 'off-board', `(${to.x}, ${to.y}) is not on the Board`)
  const occupant = state.units.find((u) => u.tile.x === to.x && u.tile.y === to.y)
  if (occupant !== undefined) {
    return reject(state, 'tile-occupied', `${tileName(to)} is occupied by ${occupant.id}`)
  }
  const path = pathTo(state, unit, to)
  if (path === undefined) return reject(state, 'out-of-reach', `${unitId} cannot reach ${tileName(to)}`)

  const moved: UnitState = { ...unit, tile: to, hasMoved: true }
  return {
    ok: true,
    state: { ...state, units: state.units.map((u) => (u.id === unitId ? moved : u)) },
    events: [{ type: 'unitMoved', unit: unitId, from: unit.tile, to, path }],
  }
}

function applyBasicAttack(state: BattleState, unitId: UnitId, targetId: UnitId): ApplyResult {
  const plan = checkAttack(state, unitId, BASIC_ATTACK, targetId)
  if (isRejection(plan)) return { ok: false, state, rejection: plan }
  return { ok: true, ...resolveAttack(state, plan) }
}

function applyEndTurn(state: BattleState): ApplyResult {
  const ending = state.sideToAct
  const next: Side = ending === 'A' ? 'B' : 'A'
  const turn = state.turnNumber[next] + 1
  const round = next === state.firstSide ? state.round + 1 : state.round
  return {
    ok: true,
    state: {
      ...state,
      sideToAct: next,
      turnNumber: { ...state.turnNumber, [next]: turn },
      round,
      units: state.units.map((u) => (u.hasMoved || u.hasActed ? { ...u, hasMoved: false, hasActed: false } : u)),
    },
    events: [
      { type: 'turnEnded', side: ending, turn: state.turnNumber[ending] },
      { type: 'turnStarted', side: next, turn, round },
    ],
  }
}

// ----------------------------------------------------------------- preview

/** What an action would do, without doing it. Only attacks have odds to show so far. */
export type ActionPreview = AttackPreview

export type PreviewResult =
  /** `preview` is null for a legal action with nothing to roll (Move, End Turn). */
  | { readonly ok: true; readonly preview: ActionPreview | null }
  | { readonly ok: false; readonly rejection: Rejection }

/**
 * Preview an action (spec "ดูตัวอย่าง action"): exact hit and critical chances
 * and damage ranges, computed without rolling. Never changes the state and
 * never draws from the dice stream (rules §21.1). An illegal action is
 * rejected with the same reason applyAction would give.
 */
export function previewAction(state: BattleState, action: Action): PreviewResult {
  if (action.type === 'basicAttack') {
    const plan = checkAttack(state, action.unit, BASIC_ATTACK, action.target)
    if (isRejection(plan)) return { ok: false, rejection: plan }
    return { ok: true, preview: previewAttack(state, plan) }
  }
  // Nothing to roll: legal exactly when applyAction accepts it (pure, so nothing changes).
  const result = applyAction(state, action)
  return result.ok ? { ok: true, preview: null } : { ok: false, rejection: result.rejection }
}
