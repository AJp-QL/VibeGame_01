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
  type ElementWheel,
  type Scenario,
  type Side,
  type Skill,
  type Species,
  type Stat,
  type StatusType,
  type Tile,
} from '@mt/shared'
import {
  BASIC_ATTACK,
  checkActor,
  checkAttack,
  DEFEND,
  isRejection,
  pendingRejection,
  previewAttack,
  resolveAttack,
  type AttackPreview,
} from './combat.ts'
import { applyDeploy, confirmDeploymentResolution, deploymentActions, placeUnit } from './deployment.ts'
import { diceStream, type DiceSource } from './dice.ts'
import { derive, type DerivedValues } from './derived.ts'
import { pathTo, reachableTiles } from './movement.ts'
import { runResolution, type Resolution } from './resolution.ts'
import type { RollMode } from './rollMode.ts'
import {
  applyRetreat,
  legalRetreats,
  legalSkillUses,
  loadoutOf,
  previewSkill,
  skillResolution,
  type AreaPreview,
  type EffectPreview,
  type RetreatAction,
  type SavePreview,
  type SkillAvailability,
  type UseSkillAction,
} from './skills.ts'
import {
  findAnyUnit,
  findUnit,
  otherSide,
  ROUND_LIMIT,
  type BattleEndCause,
  type BattleState,
  type InitiativeRoll,
  type InspirationAnswer,
  type RerollableRoll,
  type StatusId,
  type UnitId,
  type UnitState,
  type UnitStatus,
  type UnitTemplate,
} from './state.ts'
import {
  applyStatus,
  countDownStatuses,
  endOwnTurnStartStatuses,
  startOfTurnDamage,
  type StatusBonus,
} from './statuses.ts'
import { activate, activationBlocker, NO_ACTIVATIONS, startTurn } from './turns.ts'

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
  /** Use a loadout skill (rules §13, §15); target fields by the skill's target kind. */
  | UseSkillAction
  /** After Hit and Run: step to an empty tile within reach, or `to: null` to stay (rules §15.1, D-12). */
  | RetreatAction
  /** The deciding side rerolls the d20 it just saw with its Inspiration (rules §18): the new roll stands. */
  | { readonly type: 'useInspiration'; readonly side: Side }
  /** The deciding side keeps the d20 it just saw and its Inspiration (rules §18). */
  | { readonly type: 'declineInspiration'; readonly side: Side }
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
  /**
   * One pair of initiative rolls, team A's d20 first (rules §17.2, §21.4).
   * `tie` means both roll again. `rerolled`: the pair after that side rolled
   * its d20 again with Inspiration (the other side's roll is unchanged).
   */
  | {
      readonly type: 'initiativeRolled'
      readonly rolls: Readonly<Record<Side, InitiativeRoll>>
      readonly tie: boolean
      readonly rerolled?: Side
    }
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
      /** The roll made again with Inspiration (rules §18): this one stands. */
      readonly rerolled?: true
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
      /** Added once to the dice: damage mod plus `statusModifiers`. */
      readonly modifier: number
      /** The part of `modifier` from the attacker's statuses (Weakened −2, rules §10.3); absent when none. */
      readonly statusModifiers?: readonly StatusBonus[]
      /** Full damage, even past the HP left (rules §10.3, D-11). */
      readonly amount: number
      readonly hpBefore: number
      readonly hpAfter: number
    }
  /** A Unit used Defend as its Action (rules §12); `statusApplied` (Guarded) follows. */
  | { readonly type: 'defended'; readonly unit: UnitId }
  /** A Unit used a loadout skill (rules §15); what it does follows. `targets`: the Units it lands on, in order. */
  | {
      readonly type: 'skillUsed'
      readonly unit: UnitId
      readonly skill: string
      readonly targets: readonly UnitId[]
      /** The tile it was aimed at (Burst's centre, Blink's destination), for skills aimed at one. */
      readonly tile?: Tile
    }
  /** A save against a status (rules §11): d20 + mod against the user's Save DC; no natural 1 or 20 rule (D-27). */
  | {
      readonly type: 'saveRolled'
      /** The Unit saving. */
      readonly unit: UnitId
      /** The skill's user. */
      readonly source: UnitId
      readonly skill: string
      readonly status: StatusId
      readonly stat: Stat
      readonly roll: number
      readonly modifier: number
      readonly total: number
      readonly dc: number
      /** `true`: the status does not stick. */
      readonly saved: boolean
      /** The roll made again with Inspiration (rules §18): this one stands. */
      readonly rerolled?: true
    }
  /**
   * A Unit gained a status (rules §14.1). `refreshed`: it already had it and
   * it started again at full duration (or kept the higher bonus, Guarded).
   */
  | { readonly type: 'statusApplied'; readonly unit: UnitId; readonly status: UnitStatus; readonly refreshed?: true }
  /** A status left a Unit: its duration ran out, or Guarded at the start of its side's next Turn (rules §14.1, §17.4). */
  | { readonly type: 'statusEnded'; readonly unit: UnitId; readonly status: StatusId }
  /**
   * Start-of-Turn damage from a status (Bleed 1d4, rules §17.4): not an
   * attack, so no Guard, Weakened or Cover. Counts for the other side's total damage (D-11).
   */
  | {
      readonly type: 'statusTicked'
      readonly unit: UnitId
      readonly status: StatusId
      readonly dice: Dice
      readonly rolls: readonly number[]
      readonly amount: number
      readonly hpBefore: number
      readonly hpAfter: number
    }
  /** Blink (rules §15.1, D-13): the Unit's Move, as a teleport; no path, nothing in between matters. */
  | { readonly type: 'unitTeleported'; readonly unit: UnitId; readonly skill: string; readonly from: Tile; readonly to: Tile }
  /** Hit and Run's step (rules §15.1): not a Move. */
  | { readonly type: 'unitRetreated'; readonly unit: UnitId; readonly from: Tile; readonly to: Tile }
  /** The Unit chose to stay instead of Hit and Run's step. */
  | { readonly type: 'retreatDeclined'; readonly unit: UnitId }
  /**
   * `side` saw its own d20 (`roll`, the event just before) and still has
   * Inspiration: the action pauses until it answers (rules §18, D-10).
   * `side` may differ from the side to act (a save, initiative).
   */
  | { readonly type: 'inspirationOffered'; readonly side: Side; readonly roll: RerollableRoll }
  /** The side used its Inspiration: the roll is made again (the next roll event, `rerolled: true`). */
  | { readonly type: 'inspirationUsed'; readonly side: Side }
  /** The side kept the roll and its Inspiration. */
  | { readonly type: 'inspirationDeclined'; readonly side: Side }
  /** A Unit reached 0 HP and left the Board (rules §10.4). */
  | { readonly type: 'unitDown'; readonly unit: UnitId; readonly tile: Tile }
  /**
   * The Battle is over (rules §19); nothing more can happen. `winner` is
   * `null` for a draw (turn limit, equal damage). At the turn limit
   * `damageDealt` holds the totals that decided it (§19.2).
   */
  | {
      readonly type: 'battleEnded'
      readonly winner: Side | null
      readonly cause: BattleEndCause
      readonly round: number
      readonly damageDealt?: Readonly<Record<Side, number>>
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
  | 'battle-over'
  | 'already-acted'
  | 'unknown-skill'
  | 'not-an-enemy'
  | 'out-of-range'
  /** Units stand on the line from the attacker to a target 2 or more tiles away (rules §7). */
  | 'no-line-of-sight'
  /** A decision must be made first (Hit and Run's step, Inspiration): only its answers are legal. */
  | 'decision-pending'
  /** An answer (`retreat`, `useInspiration`, `declineInspiration`) when there is no such decision, or by another Unit or side. */
  | 'no-decision'
  /** The skill is not in the Unit's loadout. */
  | 'not-in-loadout'
  /** Passive, or not in the game yet (its ticket has not landed). */
  | 'skill-not-available'
  /** A Major skill used in the last Turn of the side, or a Signature skill already used (rules §13). */
  | 'on-cooldown'
  /** Target fields that do not fit the skill (e.g. a target for a skill on oneself). */
  | 'invalid-target'
  /** A skill for allies aimed at an enemy. */
  | 'not-an-ally'

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
  /** Skills by id (data/skills); must contain Basic Attack and Defend. */
  readonly skills: Readonly<Record<string, Skill>>
  /** Status types by id (data/statuses). */
  readonly statuses: Readonly<Record<string, StatusType>>
  /** The element wheel (data/elements). */
  readonly elementWheel: ElementWheel
  /** Dice Seed for play, or scripted roll results for tests. */
  readonly dice: DiceSource
  /**
   * Whether each side starts with its Inspiration (rules §18: both do, the
   * default). For rules tests about something else and tools; play leaves it out.
   */
  readonly inspiration?: Readonly<Record<Side, boolean>>
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
 * (unknown species, bad Dice Seed, bad preset tiles): that is a
 * data or programming error, not an illegal action.
 */
export function createBattle(setup: BattleSetup): BattleState {
  // Any Board goes with any Scenario: `scenario.board` is only the default the
  // menu offers (spec user story 8).
  const { scenario, board, species, skills } = setup
  for (const required of [BASIC_ATTACK, DEFEND]) {
    if (skills[required] === undefined) throw new Error(`Skills must include "${required}"`)
  }

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
      skillsUsed: {},
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
        skillsUsed: {},
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
    statusTypes: setup.statuses,
    elementWheel: setup.elementWheel,
    pending: null,
    inspiration: setup.inspiration ?? { A: true, B: true },
    damageDealt: { A: 0, B: 0 },
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
 * The side that must act now: the side of a pending decision (which can be
 * the side whose Turn it is not: a save, initiative), otherwise the side to
 * act. Hotseat hands the device to this side.
 */
export function decidingSide(state: BattleState): Side {
  return state.pending?.side ?? state.sideToAct
}

/**
 * Every legal action for the side that must act now (`decidingSide`).
 * Deployment: placements, then Confirm once all of the side's Units are
 * placed. Play: Moves, then Basic Attacks, then skills, then Defends, End
 * Turn last. While a decision is pending, only its answers: Hit and Run's
 * steps, or use then decline Inspiration. None once the Battle is over.
 */
export function legalActions(state: BattleState): Action[] {
  if (state.outcome !== null) return []
  if (state.pending?.kind === 'inspiration') {
    const { side } = state.pending
    return [
      { type: 'useInspiration', side },
      { type: 'declineInspiration', side },
    ]
  }
  if (state.phase === 'deployment') return deploymentActions(state)
  if (state.pending !== null) return legalRetreats(state)
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
  actions.push(...legalSkillUses(state))
  for (const unit of state.units) {
    if (unit.side === state.sideToAct && !isRejection(checkActor(state, unit.id))) {
      actions.push({ type: 'defend', unit: unit.id })
    }
  }
  actions.push({ type: 'endTurn' })
  return actions
}

/**
 * The loadout of a Unit on the Board or fallen (rules §13): each skill's
 * tier, cooldown as the UI shows it (rules §13.2), whether a Signature is
 * spent and whether the engine can resolve it yet. Not whether it can be used
 * right now: that is `legalActions`.
 */
export function unitSkills(state: BattleState, unitId: UnitId): SkillAvailability[] {
  const unit = findAnyUnit(state, unitId)
  if (unit === undefined) throw new Error(`Unknown Unit "${unitId}"`)
  return loadoutOf(state, unit)
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
  if (action.type === 'useInspiration' || action.type === 'declineInspiration') {
    return answerInspiration(state, action.side, action.type === 'useInspiration' ? 'use' : 'decline')
  }
  if (state.pending?.kind === 'inspiration') return { ok: false, state, rejection: pendingRejection(state.pending) }
  const resolution = resolutionOf(state, action)
  if (resolution !== null) {
    if (isRejection(resolution)) return { ok: false, state, rejection: resolution }
    return runResolution(state, action, resolution)
  }
  switch (action.type) {
    case 'deploy':
      return applyDeploy(state, action.unit, action.to)
    case 'move':
      return applyMove(state, action.unit, action.to)
    case 'defend':
      return applyDefend(state, action.unit)
    case 'retreat':
      return applyRetreat(state, action)
    case 'endTurn':
      return applyEndTurn(state)
    default:
      return reject(state, 'unknown-action', `Unknown action ${JSON.stringify(action)}`)
  }
}

/**
 * Actions that may roll a d20 Inspiration rerolls (rules §18, §21.6) are
 * resolved as generators (resolution.ts): their resolution if legal, or why
 * not; `null` for the other actions. The same state and action always give
 * the same resolution, which is what lets a paused action be finished later.
 */
function resolutionOf(state: BattleState, action: Action): Resolution<BattleState> | Rejection | null {
  switch (action.type) {
    case 'confirmDeployment':
      return confirmDeploymentResolution(state)
    case 'basicAttack': {
      const plan = checkAttack(state, action.unit, BASIC_ATTACK, action.target)
      return isRejection(plan) ? plan : resolveAttack(state, plan)
    }
    case 'useSkill':
      return skillResolution(state, action)
    default:
      return null
  }
}

/**
 * Answer a pending Inspiration decision (rules §18): resolve the paused
 * action again from the state before it with every answer so far (same
 * dice, same rolls) and carry on until it ends or pauses at the next decision.
 */
function answerInspiration(state: BattleState, side: Side, answer: InspirationAnswer): ApplyResult {
  const pending = state.pending
  if (pending?.kind !== 'inspiration') return reject(state, 'no-decision', 'No Inspiration decision is pending')
  if (pending.side !== side) return reject(state, 'no-decision', `Side ${pending.side} decides, not side ${side}`)
  const { resume } = pending
  const resolution = resolutionOf(resume.state, resume.action)
  if (resolution === null || isRejection(resolution)) throw new Error('A paused action can no longer be resolved')
  return runResolution(resume.state, resume.action, resolution, [...resume.answers, answer], resume.emitted)
}

function reject(state: BattleState, code: RejectionCode, message: string): ApplyResult {
  return { ok: false, state, rejection: { code, message } }
}

function applyMove(state: BattleState, unitId: UnitId, to: Tile): ApplyResult {
  const unit = checkActor(state, unitId, 'move')
  if (isRejection(unit)) return { ok: false, state, rejection: unit }
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

/**
 * Defend (rules §12): uses the Unit's Action and gives what data/skills/defend
 * gives (Guarded, Guard and Ward +2, until the start of its side's next
 * Turn). Guarded from several sources keeps the higher bonus.
 */
function applyDefend(state: BattleState, unitId: UnitId): ApplyResult {
  const unit = checkActor(state, unitId)
  if (isRejection(unit)) return { ok: false, state, rejection: unit }
  const active = activate(state, unitId)
  let next: BattleState = { ...active, units: active.units.map((u) => (u.id === unitId ? { ...u, hasActed: true } : u)) }
  const events: BattleEvent[] = [{ type: 'defended', unit: unitId }]
  for (const application of state.skills[DEFEND]?.applies ?? []) {
    const given = applyStatus(next, unitId, application, unitId)
    next = given.state
    events.push(given.event)
  }
  return { ok: true, state: next, events }
}

/**
 * End the Turn (rules §17.4): statuses on the ending side count down; if
 * that ends Round 10, the turn limit decides the Battle (§19.2). Otherwise
 * the other side's Turn starts: Guarded (and the like) end, then Bleed ticks
 * in Unit order, which may end the Battle.
 */
function applyEndTurn(state: BattleState): ApplyResult {
  if (state.pending !== null) return { ok: false, state, rejection: pendingRejection(state.pending) }
  if (state.phase !== 'play' || state.firstSide === null) {
    return reject(state, 'wrong-phase', 'No Turn to end during deployment')
  }
  const ending = state.sideToAct
  const next = otherSide(ending)
  const counted = countDownStatuses(state, ending)
  const rested: BattleState = {
    ...counted.state,
    units: counted.state.units.map((u) => (u.hasMoved || u.hasActed ? { ...u, hasMoved: false, hasActed: false } : u)),
  }
  const ended: BattleEvent[] = [{ type: 'turnEnded', side: ending, turn: state.turnNumber[ending] }, ...counted.events]
  if (ending !== state.firstSide && state.round >= ROUND_LIMIT) {
    const over = turnLimit(rested)
    return { ok: true, state: over.state, events: [...ended, over.event] }
  }
  const started = startTurn(rested, next, state.firstSide)
  const upkeep = endOwnTurnStartStatuses(started, next)
  const ticks = startOfTurnDamage(upkeep.state, next)
  return {
    ok: true,
    state: ticks.state,
    events: [
      ...ended,
      { type: 'turnStarted', side: next, turn: started.turnNumber[next], round: started.round },
      ...upkeep.events,
      ...ticks.events,
    ],
  }
}

/**
 * Round 10 is over with no winner (rules §19.2, §17.4 end of Turn step 5):
 * the side with more total damage dealt wins; equal totals are a draw.
 */
function turnLimit(state: BattleState): { state: BattleState; event: BattleEvent } {
  const { A, B } = state.damageDealt
  const winner: Side | null = A === B ? null : A > B ? 'A' : 'B'
  return {
    state: { ...state, outcome: { winner, cause: 'turnLimit' } },
    event: { type: 'battleEnded', winner, cause: 'turnLimit', round: state.round, damageDealt: state.damageDealt },
  }
}

// ----------------------------------------------------------------- preview

/**
 * What an action would do, without doing it: an attack's odds (Basic Attack
 * and attack skills), one attack's odds per target in order (Burst), a save
 * skill's odds, or who a skill without rolls affects. Defend, Move and End Turn have nothing to roll.
 */
export type ActionPreview = AttackPreview | SavePreview | EffectPreview | AreaPreview

export type PreviewResult =
  /** `preview` is null for a legal action with nothing to roll (Move, End Turn). */
  | { readonly ok: true; readonly preview: ActionPreview | null }
  | { readonly ok: false; readonly rejection: Rejection }

/**
 * Preview an action (spec "ดูตัวอย่าง action"): exact hit and critical chances
 * and damage ranges, computed without rolling. Never changes the state and
 * never draws from the dice stream (rules §21.1). An illegal action is
 * rejected with the same reason applyAction would give. Inspiration is left
 * out: the odds are those of the roll as made, before any reroll.
 */
export function previewAction(state: BattleState, action: Action): PreviewResult {
  if (action.type === 'basicAttack') {
    const plan = checkAttack(state, action.unit, BASIC_ATTACK, action.target)
    if (isRejection(plan)) return { ok: false, rejection: plan }
    return { ok: true, preview: previewAttack(state, plan) }
  }
  if (action.type === 'useSkill') return previewSkill(state, action)
  // Nothing to roll: legal exactly when applyAction accepts it (pure, so nothing changes).
  const result = applyAction(state, action)
  return result.ok ? { ok: true, preview: null } : { ok: false, rejection: result.rejection }
}
