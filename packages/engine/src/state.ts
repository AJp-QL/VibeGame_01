/**
 * Battle state: plain, immutable, serialisable data. Every engine function
 * takes a state and returns a new one; nothing is mutated.
 */
import type { Build, Element, ElementWheel, Movement, Side, Skill, Stats, StatusType, Terrain, Tile } from '@mt/shared'
import type { Action, BattleEvent } from './battle.ts'
import type { DiceStream } from './dice.ts'

/** "A.tamer", "A.m1", "A.m2", "B.tamer", … — stable for the whole Battle. */
export type UnitId = string

interface UnitBase {
  readonly id: UnitId
  readonly side: Side
  readonly tile: Tile
  readonly stats: Stats
  /** Loadout on top of Basic Attack and Defend (rules §20.1). */
  readonly skills: readonly string[]
  /** Current HP; a Unit at 0 HP is down and off the Board (rules §10.4). */
  readonly hp: number
  /** Already used its Move this Turn (rules §6.1). */
  readonly hasMoved: boolean
  /** Already used its Action this Turn (rules §17.4). */
  readonly hasActed: boolean
  /** Statuses on the Unit now (rules §14), at most one of each. Empty for a Unit that fell. */
  readonly statuses: readonly UnitStatus[]
  /**
   * Loadout skills used so far: skill id → the Turn number of the Unit's side
   * (rules §17.3) in which it was last used. Cooldowns count from it (rules §13.2).
   */
  readonly skillsUsed: Readonly<Record<string, number>>
}

/** A status id from data/statuses, e.g. "bleed", "rallied", "guarded". */
export type StatusId = string

/**
 * A status on a Unit (rules §14). What it does comes from its StatusType in
 * data/statuses (`BattleState.statusTypes`); the instance holds only what
 * differs per Unit. Fields that do not apply are left out, so Guarded from
 * Defend is exactly `{ id: 'guarded', bonus: 2 }`.
 */
export interface UnitStatus {
  readonly id: StatusId
  /** Guarded: the Guard and Ward bonus its source gave (Defend +2, rules §12). */
  readonly bonus?: number
  /** Statuses that last a number of Turns: countdowns left (rules §14.1). */
  readonly turnsLeft?: number
  /**
   * Given during the holder's own side's Turn: the end of that Turn does not
   * count down (D-02), so "N Turns" = the rest of this Turn + N more.
   */
  readonly skipCountdown?: true
  /** The Unit that applied it, for statuses that track it (Taunted: the taunter). */
  readonly source?: UnitId
  /**
   * Given by a skill usable only on this terrain (`effects.requiresTerrain`):
   * the status lasts only while the Unit stands on it (Hidden from
   * Camouflage: forest, rules §8.2, D-18).
   */
  readonly whileOn?: Terrain
}

/** Why a status broke by its own conditions (rules §8.2): the holder's attack roll, or terrain. */
export type StatusEndCause = 'attackRoll' | 'terrain'

/**
 * A choice that must be made before any other action: Hit and Run's step
 * (`retreat`) or whether to reroll a d20 with Inspiration (`inspiration`).
 * `side` is the side that decides; it can differ from the side to act (a
 * save during the other side's Turn, initiative), so Hotseat hands the device over.
 */
export type PendingDecision = RetreatDecision | InspirationDecision

/** After Hit and Run the Unit may step up to `steps` tiles to an empty tile, or stay (rules §15.1, D-12). */
export interface RetreatDecision {
  readonly kind: 'retreat'
  readonly side: Side
  readonly unit: UnitId
  readonly skill: string
  readonly steps: number
}

/** A d20 roll the deciding side may roll again with Inspiration (rules §18, §21.6): the event that showed it. */
export type RerollableRoll = Extract<BattleEvent, { type: 'attackRolled' | 'saveRolled' | 'initiativeRolled' }>

/** Use Inspiration on the roll just seen, or keep it. */
export type InspirationAnswer = 'use' | 'decline'

/**
 * `side` has just seen `roll` and still has its Inspiration (rules §18,
 * D-09, D-10): it answers with `useInspiration` or `declineInspiration`
 * before any other die is rolled. The action is paused part-way: the state
 * shows what happened up to and including the roll.
 */
export interface InspirationDecision {
  readonly kind: 'inspiration'
  readonly side: Side
  readonly roll: RerollableRoll
  /**
   * Engine bookkeeping to finish the paused action: it is resolved again from
   * the state before it (`state`) with the answers given so far, which gives
   * the same dice, then carries on. `emitted` events were already returned.
   */
  readonly resume: {
    readonly state: BattleState
    readonly action: Action
    readonly answers: readonly InspirationAnswer[]
    readonly emitted: number
  }
}

export interface TamerUnit extends UnitBase {
  readonly kind: 'tamer'
  readonly level: number
}

export interface MonsterUnit extends UnitBase {
  readonly kind: 'monster'
  readonly species: string
  readonly element: Element
  readonly star: number
  /** Copied from the species when the Battle is created. */
  readonly build: Build
  readonly movement: Movement
  readonly guardBonus: number
}

/** A Tamer or Monster on the Board. */
export type UnitState = TamerUnit | MonsterUnit

/** A Unit before it is on the Board: everything but its tile (rules §17.1). */
export type UnitTemplate = WithoutTile<UnitState>
type WithoutTile<U> = U extends unknown ? Omit<U, 'tile'> : never

/** `'deployment'` until both sides have placed their Units, then `'play'` (rules §17). */
export type BattlePhase = 'deployment' | 'play'

/**
 * Deployment (rules §17.1): each side places its Tamer and 2 Monsters in its
 * own start zone, hidden from the other side, then both are revealed together.
 */
export interface Deployment {
  /** Every Unit of both sides, in Unit order, waiting for a tile. */
  readonly roster: readonly UnitTemplate[]
  /** Tiles chosen so far by each side; a side's placements are hidden from the other side. */
  readonly placements: Readonly<Record<Side, Readonly<Record<UnitId, Tile>>>>
  /** Sides that have confirmed their placements. */
  readonly confirmed: Readonly<Record<Side, boolean>>
}

/** One initiative roll of a side: d20 + the highest AGI mod in its team (rules §17.2). */
export interface InitiativeRoll {
  readonly d20: number
  readonly modifier: number
  readonly total: number
}

/** Initiative (rules §17.2, D-09): every pair of rolls in order (ties reroll both) and the result. */
export interface Initiative {
  readonly rolls: readonly Readonly<Record<Side, InitiativeRoll>>[]
  readonly firstSide: Side
}

/** Activations of the current Turn (rules §17.4). */
export interface Activations {
  /** The Unit playing now: it may still use what it has left until another Unit starts. */
  readonly current: UnitId | null
  /** Units that started an activation this Turn, in order; none of them can start again. */
  readonly started: readonly UnitId[]
  /** How many Units may start an activation this Turn: 2 on the first Turn of the side that starts, otherwise 3. */
  readonly limit: number
}

export interface BattleState {
  readonly scenarioId: string
  readonly boardId: string
  /** `terrain[y][x]` (rules §2.1). */
  readonly terrain: readonly (readonly Terrain[])[]
  readonly phase: BattlePhase
  /**
   * Units on the Board, in Unit order (rules §21.4): team A Tamer, Monster 1,
   * Monster 2, then team B. Empty during deployment. A Unit that goes down
   * leaves this list (rules §10.4).
   */
  readonly units: readonly UnitState[]
  /** Units that went down (HP 0), in the order they fell. They take no further part. */
  readonly fallen: readonly UnitState[]
  /** Placements in progress; `null` once both sides are revealed. */
  readonly deployment: Deployment | null
  /** Initiative rolls and result; `null` until deployment is revealed (or when the Battle started from preset tiles). */
  readonly initiative: Initiative | null
  /** The side that plays first every Round; `null` during deployment. */
  readonly firstSide: Side | null
  /** The side placing Units (deployment) or whose Turn it is (play). */
  readonly sideToAct: Side
  /** Turns started so far by each side (rules §17.3); 0 during deployment. */
  readonly turnNumber: Readonly<Record<Side, number>>
  /** 0 during deployment. */
  readonly round: number
  readonly activations: Activations
  readonly dice: DiceStream
  /** Skill definitions from data/skills, by id. */
  readonly skills: Readonly<Record<string, Skill>>
  /** Status definitions from data/statuses, by id. */
  readonly statusTypes: Readonly<Record<string, StatusType>>
  /** The element wheel from data/elements (rules §4.1). */
  readonly elementWheel: ElementWheel
  /** A decision that must be made before any other action (Hit and Run's step, Inspiration), or `null`. */
  readonly pending: PendingDecision | null
  /** Sides that still have their Inspiration: one per side per Battle (rules §18). */
  readonly inspiration: Readonly<Record<Side, boolean>>
  /**
   * Total damage each side has dealt this Battle (rules §19.2, D-11): every
   * HP loss of a Unit counts for the other side, in full even past the HP
   * left, Bleed included. Healing never takes it back. Decides the turn limit.
   */
  readonly damageDealt: Readonly<Record<Side, number>>
  /** Set once the Battle is over; no action is legal after that (rules §19). */
  readonly outcome: BattleOutcome | null
}

/** Why a Battle ended (rules §19). */
export type BattleEndCause =
  /** The losing side's Tamer reached 0 HP (§19.1). */
  | 'tamerDown'
  /** Every Monster of the losing side reached 0 HP (§19.1). */
  | 'monstersDown'
  /** Round 10 ended: more total damage dealt wins, equal is a draw (§19.2). */
  | 'turnLimit'

export interface BattleOutcome {
  /** `null`: a draw (only at the turn limit, equal damage). */
  readonly winner: Side | null
  readonly cause: BattleEndCause
}

/** The Battle lasts at most this many Rounds (rules §19.2). */
export const ROUND_LIMIT = 10

/** A Unit on the Board (not one that has fallen). */
export function findUnit(state: BattleState, id: UnitId): UnitState | undefined {
  return state.units.find((unit) => unit.id === id)
}

/** A Unit on the Board or one that has fallen. */
export function findAnyUnit(state: BattleState, id: UnitId): UnitState | undefined {
  return findUnit(state, id) ?? state.fallen.find((unit) => unit.id === id)
}

export function terrainAt(state: BattleState, tile: Tile): Terrain | undefined {
  return state.terrain[tile.y]?.[tile.x]
}

/** The state with `unit` in place of the Unit with the same id. */
export function replaceUnit(state: BattleState, unit: UnitState): BattleState {
  return { ...state, units: state.units.map((u) => (u.id === unit.id ? unit : u)) }
}

export function otherSide(side: Side): Side {
  return side === 'A' ? 'B' : 'A'
}
