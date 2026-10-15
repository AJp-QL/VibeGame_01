/**
 * The engine's public seam (spec "Interface ของ engine", Seam A):
 * createBattle → legalActions / applyAction → new state + events.
 */
import {
  isOnBoard,
  SIDES,
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
} from './combat.ts'
import { applyConfirmDeployment, applyDeploy, deploymentActions, placeUnit } from './deployment.ts'
import { diceStream, type DiceSource } from './dice.ts'
import { derive, type DerivedValues } from './derived.ts'
import { pathTo, reachableTiles } from './movement.ts'
import type { RollMode } from './rollMode.ts'
import {
  findAnyUnit,
  findUnit,
  type BattleEndCause,
  type BattleState,
  type InitiativeRoll,
  type StatusId,
  type UnitId,
  type UnitState,
  type UnitStatus,
  type UnitTemplate,
} from './state.ts'
import { activate, activationBlocker, endStartOfTurnStatuses, NO_ACTIVATIONS, startTurn } from './turns.ts'

// ----------------------------------------------------------------- actions

export type Action =
  /** Deployment: place (or re-place) a Unit of the side placing on a tile of its start zone (rules §17.1). */
  | { readonly type: 'deploy'; readonly unit: UnitId; readonly to: Tile }
  /** Deployment: the side placing is done; needs all 3 of its Units placed (rules §17.1). */
  | { readonly type: 'confirmDeployment' }
  /** Move a Unit of the side to act to `to` (rules §6.1). */
  | { readonly type: 'move'; readonly unit: UnitId; readonly to: Tile }
  /** Basic Attack (rules §15.1): the Unit's Action, against one enemy in range. */
  | { readonly type: 'basicAttack'; readonly unit: UnitId; readonly target: UnitId }
  /** Defend (rules §12): the Unit's Action; it becomes Guarded (Guard and Ward +2) until its side's next Turn. */
  | { readonly type: 'defend'; readonly unit: UnitId }
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
  /** A Unit used Defend as its Action (rules §12); `statusApplied` (Guarded) follows. */
  | { readonly type: 'defended'; readonly unit: UnitId }
  /** A Unit gained a status, or had it reset (rules §14.1). */
  | { readonly type: 'statusApplied'; readonly unit: UnitId; readonly status: UnitStatus }
  /** A status left a Unit, e.g. Guarded at the start of its side's next Turn (rules §14.1, §17.4). */
  | { readonly type: 'statusEnded'; readonly unit: UnitId; readonly status: StatusId }
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
  | 'battle-over'
  | 'already-acted'
  | 'unknown-skill'
  | 'not-an-enemy'
  | 'out-of-range'
  /** Units stand on the line from the attacker to a target 2 or more tiles away (rules §7). */
  | 'no-line-of-sight'

export interface Rejection {
  readonly code: RejectionCode
  /** Developer-facing explanation (English); the UI shows its own text per code. */
  readonly message: string
  /** With `no-line-of-sight`: the Units on the line, in the order the line meets them. */
  readonly blockedBy?: readonly UnitId[]
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
  const { scenario, board, species, skills } = setup
  if (scenario.board !== board.id) {
    throw new Error(`Scenario "${scenario.id}" uses Board "${scenario.board}", got "${board.id}"`)
  }
  if (skills[BASIC_ATTACK] === undefined) throw new Error(`Skills must include "${BASIC_ATTACK}"`)

  const templates: UnitTemplate[] = []
  for (const side of SIDES) {
    const team = scenario.teams[side]
    templates.push({
      id: `${side}.tamer`,
      side,
      kind: 'tamer',
      level: team.tamer.level,
      stats: team.tamer.stats,
      skills: team.tamer.skills,
      hp: 0,
      hasMoved: false,
      hasActed: false,
      statuses: [],
    })
    team.monsters.forEach((monster, index) => {
      const speciesData = species[monster.species]
      if (speciesData === undefined) throw new Error(`Unknown species "${monster.species}"`)
      templates.push({
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
        hp: 0,
        hasMoved: false,
        hasActed: false,
        statuses: [],
      })
    })
  }

  // Every Unit starts at full HP.
  const roster = templates.map((unit) => ({ ...unit, hp: derive(unit).maxHp }))

  const deploying: BattleState = {
    scenarioId: scenario.id,
    boardId: board.id,
    terrain: board.terrain,
    phase: 'deployment',
    units: [],
    fallen: [],
    deployment: { roster, placements: { A: {}, B: {} }, confirmed: { A: false, B: false } },
    initiative: null,
    firstSide: null,
    sideToAct: 'A',
    turnNumber: { A: 0, B: 0 },
    round: 0,
    activations: NO_ACTIVATIONS,
    dice: diceStream(setup.dice),
    skills,
    outcome: null,
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
 * Confirm once all of the side's Units are placed. Play: Moves, then Basic
 * Attacks, then Defends, End Turn last. None once the Battle is over.
 */
export function legalActions(state: BattleState): Action[] {
  if (state.outcome !== null) return []
  if (state.phase === 'deployment') return deploymentActions(state)
  const actions: Action[] = []
  for (const unit of state.units) {
    if (unit.side !== state.sideToAct || unit.hasMoved || activationBlocker(state, unit) !== null) continue
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
  for (const unit of state.units) {
    if (actionBlocker(state, unit.id) === null) actions.push({ type: 'defend', unit: unit.id })
  }
  actions.push({ type: 'endTurn' })
  return actions
}

/**
 * Values computed from a Unit's data (rules §3.2), for a Unit on the Board or
 * one that has fallen. Throws on an id not on the Board (e.g. during deployment)
 * and not fallen.
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
    case 'deploy':
      return applyDeploy(state, action.unit, action.to)
    case 'confirmDeployment':
      return applyConfirmDeployment(state)
    case 'move':
      return applyMove(state, action.unit, action.to)
    case 'basicAttack':
      return applyBasicAttack(state, action.unit, action.target)
    case 'defend':
      return applyDefend(state, action.unit)
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

function applyBasicAttack(state: BattleState, unitId: UnitId, targetId: UnitId): ApplyResult {
  const plan = checkAttack(state, unitId, BASIC_ATTACK, targetId)
  if (isRejection(plan)) return { ok: false, state, rejection: plan }
  return { ok: true, ...resolveAttack(state, plan) }
}

/**
 * Why `unitId` cannot use its Action now, whatever the Action is, or `null`:
 * in play, its side to act, its activation open or able to start, its
 * Action unused (rules §17.4).
 */
function actionBlocker(state: BattleState, unitId: UnitId): Rejection | null {
  if (state.phase !== 'play') return { code: 'wrong-phase', message: 'No Action during deployment' }
  const unit = findUnit(state, unitId)
  if (unit === undefined) return { code: 'unknown-unit', message: `No Unit "${unitId}" on the Board` }
  if (unit.side !== state.sideToAct) {
    return { code: 'not-your-turn', message: `${unitId} belongs to side ${unit.side}; side ${state.sideToAct} is to act` }
  }
  const blocker = activationBlocker(state, unit)
  if (blocker !== null) return blocker
  if (unit.hasActed) return { code: 'already-acted', message: `${unitId} already used its Action this Turn` }
  return null
}

/** Defend gives Guarded +2 (rules §12). Kept in code until statuses move to data (ticket 07). */
export const DEFEND_GUARDED_BONUS = 2

/**
 * Defend (rules §12): uses the Unit's Action and makes it Guarded, Guard and
 * Ward +2, until the start of its side's next Turn. Guarded from several
 * sources keeps the higher bonus.
 */
function applyDefend(state: BattleState, unitId: UnitId): ApplyResult {
  const blocker = actionBlocker(state, unitId)
  if (blocker !== null) return { ok: false, state, rejection: blocker }
  const active = activate(state, unitId)
  let status: UnitStatus = { id: 'guarded', bonus: DEFEND_GUARDED_BONUS }
  const units = active.units.map((u) => {
    if (u.id !== unitId) return u
    const kept = u.statuses.find((s) => s.id === 'guarded')
    if (kept !== undefined && kept.bonus > status.bonus) status = kept
    return { ...u, hasActed: true, statuses: [...u.statuses.filter((s) => s.id !== 'guarded'), status] }
  })
  return {
    ok: true,
    state: { ...active, units },
    events: [
      { type: 'defended', unit: unitId },
      { type: 'statusApplied', unit: unitId, status },
    ],
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
  const upkeep = endStartOfTurnStatuses(started, next)
  return {
    ok: true,
    state: upkeep.state,
    events: [
      { type: 'turnEnded', side: ending, turn: state.turnNumber[ending] },
      { type: 'turnStarted', side: next, turn: started.turnNumber[next], round: started.round },
      ...upkeep.events,
    ],
  }
}

// ----------------------------------------------------------------- preview

/** What an action would do, without doing it. Only attacks have odds to show so far (Defend has nothing to roll). */
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
