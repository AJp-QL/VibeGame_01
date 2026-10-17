/**
 * Types and schemas for the files in data/ (one schema per data folder).
 *
 * Every type here is what the rest of the game sees after a file has been
 * validated. Data stores only source values (stats, Star, Level, element,
 * species facts); derived values such as HP or movement range are computed by
 * the engine (rules §3.2) and never stored.
 */
import * as z from 'zod'
import { MAX_BOARD_SIZE, MIN_BOARD_SIZE, rotate180, tileName } from './tiles.ts'

// ---------------------------------------------------------------- elements

/** The six elements (rules §4.1). */
export const ELEMENTS = ['forest', 'water', 'mountain', 'desert', 'light', 'dark'] as const
export type Element = (typeof ELEMENTS)[number]

/** A Board tile is one of the six elements or a normal tile (rules §2.1). */
export type Terrain = Element | 'normal'

/** Board symbols as written in rules §2.2. */
const TERRAIN_SYMBOLS: Readonly<Record<string, Terrain>> = {
  '.': 'normal',
  F: 'forest',
  W: 'water',
  M: 'mountain',
  D: 'desert',
  L: 'light',
  K: 'dark',
}

// ------------------------------------------------------------------- sides

export const SIDES = ['A', 'B'] as const
export type Side = (typeof SIDES)[number]

// ------------------------------------------------------------------- board

export interface Board {
  readonly id: string
  readonly name: string
  /** `terrain[y][x]`, row 1 first (rules §2.1 coordinates). */
  readonly terrain: readonly (readonly Terrain[])[]
}

/** The side of a square Board: its number of rows (phase 1.x ticket 13; rules §2.1). */
export function boardSize(board: Board): number {
  return board.terrain.length
}

export const ID = z.string().regex(/^[a-z][a-z0-9_]*$/, 'id must be snake_case')

const BOARD_SYMBOLS = /^[.FWMDLK]*$/

/**
 * A Board is a square: as many symbols in each row as there are rows, all from
 * . F W M D L K. Every wrong row is reported; `true` when all rows are right.
 */
function checkRows(rows: readonly string[], ctx: z.RefinementCtx): boolean {
  const size = rows.length
  let right = true
  rows.forEach((row, y) => {
    if (row.length !== size) {
      right = false
      ctx.addIssue({
        code: 'custom',
        path: ['rows', y],
        message: `a Board is a square: ${size} rows need ${size} symbols in each row, but row ${y + 1} has ${row.length}`,
      })
    }
    if (!BOARD_SYMBOLS.test(row)) {
      right = false
      ctx.addIssue({ code: 'custom', path: ['rows', y], message: 'a row is made of the symbols . F W M D L K' })
    }
  })
  return right
}

/**
 * A Board must look the same when turned 180 degrees (rules §2.1), so both
 * sides get the same layout: tile (x, y) and (n − 1 − x, n − 1 − y) share a
 * terrain. Each mismatched pair is reported once, at the row of its first tile.
 */
function checkRotationalSymmetry(rows: readonly string[], ctx: z.RefinementCtx): void {
  const size = rows.length
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tile = { x, y }
      const turned = rotate180(tile, size)
      // Visit each pair once, from the tile that comes first in reading order.
      if (turned.y * size + turned.x <= y * size + x) continue
      const symbol = rows[y]?.charAt(x)
      const turnedSymbol = rows[turned.y]?.charAt(turned.x)
      if (symbol !== turnedSymbol) {
        ctx.addIssue({
          code: 'custom',
          path: ['rows', y],
          message: `not the same after a 180° turn: ${tileName(tile)} is "${symbol}" but ${tileName(turned)} is "${turnedSymbol}"`,
        })
      }
    }
  }
}

export const BoardSchema: z.ZodType<Board> = z
  .strictObject({
    id: ID,
    name: z.string().min(1),
    rows: z.array(z.string()).min(MIN_BOARD_SIZE).max(MAX_BOARD_SIZE),
  })
  .superRefine(({ rows }, ctx) => {
    if (checkRows(rows, ctx)) checkRotationalSymmetry(rows, ctx)
  })
  .transform(({ id, name, rows }) => ({
    id,
    name,
    terrain: rows.map((row) => [...row].map((symbol) => TERRAIN_SYMBOLS[symbol] ?? 'normal')),
  }))

// ----------------------------------------------------------------- species

export const ROLES = ['striker', 'guardian', 'caster', 'ranger'] as const
export type Role = (typeof ROLES)[number]

/** Light or heavy build (PRD F7); changes HP and movement range. */
export const BUILDS = ['light', 'heavy'] as const
export type Build = (typeof BUILDS)[number]

/** Movement type (rules §3.3). */
export const MOVEMENTS = ['ground', 'flying', 'aquatic'] as const
export type Movement = (typeof MOVEMENTS)[number]

export interface Species {
  readonly id: string
  readonly name: string
  readonly role: Role
  readonly build: Build
  readonly movement: Movement
  /** Species Guard bonus (rules §3.2, D-06): Tidewall +2, others 0. */
  readonly guardBonus: number
  /**
   * Added to the base movement range (rules §3.2). No file in data/ sets it:
   * it exists for the simulator's sim-equivalent conditions (ticket 16,
   * decision log 2026-10-16: sim.py moves Tidewall 3). Absent = 0.
   */
  readonly moveBonus?: number | undefined
}

export const SpeciesSchema: z.ZodType<Species> = z.strictObject({
  id: ID,
  name: z.string().min(1),
  role: z.enum(ROLES),
  build: z.enum(BUILDS),
  movement: z.enum(MOVEMENTS),
  guardBonus: z.int().min(0).max(10),
  moveBonus: z.int().min(0).max(3).optional(),
})

// ------------------------------------------------------------------- units

/** The six stat names (rules §3.1). */
export const STATS = ['pow', 'agi', 'vit', 'int', 'sen', 'spi'] as const
export type Stat = (typeof STATS)[number]

/** The six stats, each 1–30 (rules §3.1). */
export interface Stats {
  readonly pow: number
  readonly agi: number
  readonly vit: number
  readonly int: number
  readonly sen: number
  readonly spi: number
}

const stat = z.int().min(1).max(30)

const StatsSchema = z.strictObject({
  pow: stat,
  agi: stat,
  vit: stat,
  int: stat,
  sen: stat,
  spi: stat,
})

/** Skill loadout on top of Basic Attack and Defend, which every Unit has (rules §20.1). */
const LoadoutSchema = z.array(ID).max(8)

/** A Tamer as a Scenario stores it: Level, stats and loadout only. */
export interface Tamer {
  readonly level: number
  readonly stats: Stats
  readonly skills: readonly string[]
}

const TamerSchema = z.strictObject({
  level: z.int().min(1).max(10),
  stats: StatsSchema,
  skills: LoadoutSchema,
})

/** A Monster record: species, element, Star, stats and loadout (spec "Data"). */
export interface Monster {
  readonly species: string
  readonly element: Element
  readonly star: number
  readonly stats: Stats
  readonly skills: readonly string[]
}

const MonsterSchema = z.strictObject({
  species: ID,
  element: z.enum(ELEMENTS),
  star: z.int().min(1).max(8),
  stats: StatsSchema,
  skills: LoadoutSchema,
})

// ---------------------------------------------------------------- scenario

export interface ScenarioTeam {
  readonly tamer: Tamer
  /** Monster slot 1 and slot 2, in Unit order (rules §21.4). */
  readonly monsters: readonly [Monster, Monster]
}

export interface Scenario {
  readonly id: string
  readonly name: string
  /**
   * Default Board id in data/boards: the menu starts on it, but a Battle of
   * this Scenario may be played on any Board (spec user story 8).
   */
  readonly board: string
  readonly teams: Readonly<Record<Side, ScenarioTeam>>
}

const ScenarioTeamSchema = z.strictObject({
  tamer: TamerSchema,
  monsters: z.tuple([MonsterSchema, MonsterSchema]),
})

export const ScenarioSchema: z.ZodType<Scenario> = z.strictObject({
  id: ID,
  name: z.string().min(1),
  board: ID,
  teams: z.strictObject({ A: ScenarioTeamSchema, B: ScenarioTeamSchema }),
})
