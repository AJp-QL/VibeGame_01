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
  type Scenario,
  type Side,
  type Species,
  type Tile,
} from '@mt/shared'
import { diceStream, type DiceSource } from './dice.ts'
import { derive, type DerivedValues } from './derived.ts'
import { pathTo, reachableTiles } from './movement.ts'
import { findUnit, type BattleState, type UnitId, type UnitState } from './state.ts'

// ----------------------------------------------------------------- actions

export type Action =
  /** Move a Unit of the side to act to `to` (rules §6.1). */
  | { readonly type: 'move'; readonly unit: UnitId; readonly to: Tile }
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
  const { scenario, board, species } = setup
  if (scenario.board !== board.id) {
    throw new Error(`Scenario "${scenario.id}" uses Board "${scenario.board}", got "${board.id}"`)
  }

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
      hasMoved: false,
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
        hasMoved: false,
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
    units,
    firstSide: 'A',
    sideToAct: 'A',
    turnNumber: { A: 1, B: 0 },
    round: 1,
    dice: diceStream(setup.dice),
  }
}

// ------------------------------------------------------------------- query

/** Every legal action for the side to act, Moves first, End Turn last. */
export function legalActions(state: BattleState): Action[] {
  const actions: Action[] = []
  for (const unit of state.units) {
    if (unit.side !== state.sideToAct || unit.hasMoved) continue
    for (const path of reachableTiles(state, unit).values()) {
      const to = path[path.length - 1]
      if (to !== undefined) actions.push({ type: 'move', unit: unit.id, to })
    }
  }
  actions.push({ type: 'endTurn' })
  return actions
}

/** Values computed from a Unit's data (rules §3.2). Throws on an unknown id. */
export function derivedValues(state: BattleState, unitId: UnitId): DerivedValues {
  const unit = findUnit(state, unitId)
  if (unit === undefined) throw new Error(`Unknown Unit "${unitId}"`)
  return derive(unit)
}

// ------------------------------------------------------------------- apply

/** Apply an action: new state + ordered events, or a rejection with the state unchanged. */
export function applyAction(state: BattleState, action: Action): ApplyResult {
  switch (action.type) {
    case 'move':
      return applyMove(state, action.unit, action.to)
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
      units: state.units.map((u) => (u.hasMoved ? { ...u, hasMoved: false } : u)),
    },
    events: [
      { type: 'turnEnded', side: ending, turn: state.turnNumber[ending] },
      { type: 'turnStarted', side: next, turn, round },
    ],
  }
}
