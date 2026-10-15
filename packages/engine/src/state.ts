/**
 * Battle state: plain, immutable, serialisable data. Every engine function
 * takes a state and returns a new one; nothing is mutated.
 */
import type { Build, Element, Movement, Side, Skill, Stats, Terrain, Tile } from '@mt/shared'
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

export interface BattleState {
  readonly scenarioId: string
  readonly boardId: string
  /** `terrain[y][x]` (rules §2.1). */
  readonly terrain: readonly (readonly Terrain[])[]
  /**
   * Units on the Board, in Unit order (rules §21.4): team A Tamer, Monster 1,
   * Monster 2, then team B. A Unit that goes down leaves this list (rules §10.4).
   */
  readonly units: readonly UnitState[]
  /** Units that went down (HP 0), in the order they fell. They take no further part. */
  readonly fallen: readonly UnitState[]
  /** The side that plays first every Round (fixed to A until initiative, ticket 04). */
  readonly firstSide: Side
  /** The side whose Turn it is. */
  readonly sideToAct: Side
  /** Turns started so far by each side (rules §17.3). */
  readonly turnNumber: Readonly<Record<Side, number>>
  readonly round: number
  readonly dice: DiceStream
  /** Skill definitions from data/skills, by id. */
  readonly skills: Readonly<Record<string, Skill>>
  /** Set once the Battle is over; no action is legal after that (rules §19). */
  readonly outcome: BattleOutcome | null
}

/** Why a Battle ended (rules §19.1). The turn limit (§19.2) is not implemented yet. */
export type BattleEndCause =
  /** The losing side's Tamer reached 0 HP. */
  | 'tamerDown'
  /** Every Monster of the losing side reached 0 HP. */
  | 'monstersDown'

export interface BattleOutcome {
  readonly winner: Side
  readonly cause: BattleEndCause
}

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
