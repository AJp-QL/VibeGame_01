/**
 * The engine's public seam (spec "Interface ของ engine", Seam A):
 * createBattle → legalActions / applyAction → new state + events.
 */
import { isOnBoard, SIDES, tileName, type Board, type Scenario, type Side, type Species, type Tile } from '@mt/shared'
import { applyConfirmDeployment, applyDeploy, deploymentActions, placeUnit } from './deployment.ts'
import { diceStream, type DiceSource } from './dice.ts'
import { derive, type DerivedValues } from './derived.ts'
import { pathTo, reachableTiles } from './movement.ts'
import {
  findUnit,
  type BattleState,
  type InitiativeRoll,
  type UnitId,
  type UnitState,
  type UnitTemplate,
} from './state.ts'
import { activate, activationBlocker, NO_ACTIVATIONS, startTurn } from './turns.ts'

// ----------------------------------------------------------------- actions

export type Action =
  /** Deployment: place (or re-place) a Unit of the side placing on a tile of its start zone (rules §17.1). */
  | { readonly type: 'deploy'; readonly unit: UnitId; readonly to: Tile }
  /** Deployment: the side placing is done; needs all 3 of its Units placed (rules §17.1). */
  | { readonly type: 'confirmDeployment' }
  /** Move a Unit of the side to act to `to` (rules §6.1). */
  | { readonly type: 'move'; readonly unit: UnitId; readonly to: Tile }
  /** End the current Turn; the other side starts its Turn (rules §17.4). */
  | { readonly type: 'endTurn' }

// ------------------------------------------------------------------ events

/** What happened, in order. UI and log are built from these only. */
export type BattleEvent =
  /** A side placed a Unit during deployment. Only `side` may see it: hide it from `hiddenFrom`. */
  | {
      readonly type: 'unitPlaced'
      readonly side: Side
      readonly unit: UnitId
      /** The tile it was on before, when re-placed. */
      readonly from: Tile | null
      readonly to: Tile
      readonly hiddenFrom: Side
    }
  | { readonly type: 'deploymentConfirmed'; readonly side: Side }
  /** Both sides confirmed: every placement becomes visible at once, in Unit order. */
  | {
      readonly type: 'deploymentRevealed'
      readonly placements: readonly { readonly unit: UnitId; readonly tile: Tile }[]
    }
  /** One pair of initiative rolls, team A's d20 first (rules §17.2, §21.4). `tie` means both roll again. */
  | { readonly type: 'initiativeRolled'; readonly rolls: Readonly<Record<Side, InitiativeRoll>>; readonly tie: boolean }
  | { readonly type: 'initiativeDecided'; readonly firstSide: Side }
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
  /** A deployment action during play, or a play action during deployment. */
  | 'wrong-phase'
  | 'outside-start-zone'
  | 'deployment-incomplete'
  /** The Unit's activation ended when another Unit started (rules §17.4). */
  | 'activation-over'
  /** No more Units may start an activation this Turn, e.g. 2 of 3 on the first Turn (rules §17.3). */
  | 'activation-limit'
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
  /**
   * Skip deployment and initiative: start Round 1 with the Units already on
   * these tiles (Tamer, Monster 1, Monster 2 per side; anywhere on the Board)
   * and `firstSide` to play. For rules tests, tools and puzzles; play deploys.
   */
  readonly preset?: {
    readonly tiles: Readonly<Record<Side, readonly [Tile, Tile, Tile]>>
    readonly firstSide: Side
  }
}

/**
 * Create a Battle from a Scenario, Board and dice source. The Battle starts
 * in deployment with team A placing (rules §17.1), unless `preset` puts the
 * Units on the Board directly. Throws on setup that does not fit together
 * (wrong Board, unknown species, bad Dice Seed, bad preset tiles): that is a
 * data or programming error, not an illegal action.
 */
export function createBattle(setup: BattleSetup): BattleState {
  const { scenario, board, species } = setup
  if (scenario.board !== board.id) {
    throw new Error(`Scenario "${scenario.id}" uses Board "${scenario.board}", got "${board.id}"`)
  }

  const roster: UnitTemplate[] = []
  for (const side of SIDES) {
    const team = scenario.teams[side]
    roster.push({
      id: `${side}.tamer`,
      side,
      kind: 'tamer',
      level: team.tamer.level,
      stats: team.tamer.stats,
      skills: team.tamer.skills,
      hasMoved: false,
      hasActed: false,
    })
    team.monsters.forEach((monster, index) => {
      const speciesData = species[monster.species]
      if (speciesData === undefined) throw new Error(`Unknown species "${monster.species}"`)
      roster.push({
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
        hasMoved: false,
        hasActed: false,
      })
    })
  }

  const deploying: BattleState = {
    scenarioId: scenario.id,
    boardId: board.id,
    terrain: board.terrain,
    phase: 'deployment',
    units: [],
    deployment: { roster, placements: { A: {}, B: {} }, confirmed: { A: false, B: false } },
    initiative: null,
    firstSide: null,
    sideToAct: 'A',
    turnNumber: { A: 0, B: 0 },
    round: 0,
    activations: NO_ACTIVATIONS,
    dice: diceStream(setup.dice),
  }
  return setup.preset === undefined ? deploying : startFromPreset(deploying, roster, setup.preset)
}

function startFromPreset(
  state: BattleState,
  roster: readonly UnitTemplate[],
  preset: NonNullable<BattleSetup['preset']>,
): BattleState {
  // Roster order per side is Tamer, Monster 1, Monster 2: the same as the preset tiles.
  const units = roster.map((unit) => {
    const slot = roster.filter((u) => u.side === unit.side).indexOf(unit)
    return placeUnit(unit, preset.tiles[unit.side][slot])
  })
  const taken = new Set<string>()
  for (const unit of units) {
    const name = isOnBoard(unit.tile) ? tileName(unit.tile) : `(${unit.tile.x}, ${unit.tile.y})`
    if (!isOnBoard(unit.tile) || taken.has(name)) throw new Error(`Unit ${unit.id} cannot start on ${name}`)
    taken.add(name)
  }
  const inPlay: BattleState = { ...state, phase: 'play', units, deployment: null, firstSide: preset.firstSide }
  return startTurn(inPlay, preset.firstSide, preset.firstSide)
}

// ------------------------------------------------------------------- query

/**
 * Every legal action for the side to act. Deployment: placements, then
 * Confirm once all of the side's Units are placed. Play: Moves, End Turn last.
 */
export function legalActions(state: BattleState): Action[] {
  if (state.phase === 'deployment') return deploymentActions(state)
  const actions: Action[] = []
  for (const unit of state.units) {
    if (unit.side !== state.sideToAct || unit.hasMoved || activationBlocker(state, unit) !== null) continue
    for (const path of reachableTiles(state, unit).values()) {
      const to = path[path.length - 1]
      if (to !== undefined) actions.push({ type: 'move', unit: unit.id, to })
    }
  }
  actions.push({ type: 'endTurn' })
  return actions
}

/** Values computed from a Unit's data (rules §3.2). Throws on an id not on the Board. */
export function derivedValues(state: BattleState, unitId: UnitId): DerivedValues {
  const unit = findUnit(state, unitId)
  if (unit === undefined) throw new Error(`Unknown Unit "${unitId}"`)
  return derive(unit)
}

// ------------------------------------------------------------------- apply

/** Apply an action: new state + ordered events, or a rejection with the state unchanged. */
export function applyAction(state: BattleState, action: Action): ApplyResult {
  switch (action.type) {
    case 'deploy':
      return applyDeploy(state, action.unit, action.to)
    case 'confirmDeployment':
      return applyConfirmDeployment(state)
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
  if (state.phase !== 'play') return reject(state, 'wrong-phase', 'No Move during deployment')
  const unit = findUnit(state, unitId)
  if (unit === undefined) return reject(state, 'unknown-unit', `No Unit "${unitId}"`)
  if (unit.side !== state.sideToAct) {
    return reject(state, 'not-your-turn', `${unitId} belongs to side ${unit.side}; side ${state.sideToAct} is to act`)
  }
  const blocker = activationBlocker(state, unit)
  if (blocker !== null) return { ok: false, state, rejection: blocker }
  if (unit.hasMoved) return reject(state, 'already-moved', `${unitId} already moved this Turn`)
  if (!isOnBoard(to)) return reject(state, 'off-board', `(${to.x}, ${to.y}) is not on the Board`)
  const occupant = state.units.find((u) => u.tile.x === to.x && u.tile.y === to.y)
  if (occupant !== undefined) {
    return reject(state, 'tile-occupied', `${tileName(to)} is occupied by ${occupant.id}`)
  }
  const path = pathTo(state, unit, to)
  if (path === undefined) return reject(state, 'out-of-reach', `${unitId} cannot reach ${tileName(to)}`)

  const moved: UnitState = { ...unit, tile: to, hasMoved: true }
  const active = activate(state, unitId)
  return {
    ok: true,
    state: { ...active, units: active.units.map((u) => (u.id === unitId ? moved : u)) },
    events: [{ type: 'unitMoved', unit: unitId, from: unit.tile, to, path }],
  }
}

function applyEndTurn(state: BattleState): ApplyResult {
  if (state.phase !== 'play' || state.firstSide === null) {
    return reject(state, 'wrong-phase', 'No Turn to end during deployment')
  }
  const ending = state.sideToAct
  const next: Side = ending === 'A' ? 'B' : 'A'
  const rested: BattleState = {
    ...state,
    units: state.units.map((u) => (u.hasMoved || u.hasActed ? { ...u, hasMoved: false, hasActed: false } : u)),
  }
  const started = startTurn(rested, next, state.firstSide)
  return {
    ok: true,
    state: started,
    events: [
      { type: 'turnEnded', side: ending, turn: state.turnNumber[ending] },
      { type: 'turnStarted', side: next, turn: started.turnNumber[next], round: started.round },
    ],
  }
}
