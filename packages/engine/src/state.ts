/**
 * Battle state: plain, immutable, serialisable data. Every engine function
 * takes a state and returns a new one; nothing is mutated.
 */
import type { Build, Element, Movement, Side, Stats, Terrain, Tile } from '@mt/shared'
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
  /** Already used its Move this Turn (rules §6.1). */
  readonly hasMoved: boolean
  /** Already used its Action this Turn (rules §17.4). */
  readonly hasActed: boolean
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
   * Monster 2, then team B. Empty during deployment.
   */
  readonly units: readonly UnitState[]
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
}

export function findUnit(state: BattleState, id: UnitId): UnitState | undefined {
  return state.units.find((unit) => unit.id === id)
}

export function terrainAt(state: BattleState, tile: Tile): Terrain | undefined {
  return state.terrain[tile.y]?.[tile.x]
}
