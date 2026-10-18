/**
 * The range variants of phase 1.x ticket 08, each applied to a copy of the
 * game data and the engine's range rules. Nothing here touches data/ or the
 * rules of the game: a variant exists only inside a simulator run.
 *
 * Since ticket 09 the game plays variant "abc" (D-31), so every variant is
 * written as the full set of its three parts, on or off, whatever data/ holds:
 * "baseline" still means the ranges, Boards and rules as they were before, and
 * the numbers of docs/balance/ticket-08-range-experiments.md can be reproduced.
 *
 *  a  shorter ranges in data: Long Shot, Element Bolt, Pin 4 -> 3; Mark 5 -> 4
 *  b  disadvantage on attack rolls at range 4 or more (engine switch)
 *  c  mountain blocks line of sight (engine switch), with four more mountain
 *     tiles on each Board, placed in pairs that look the same after a 180 turn
 *
 * They combine: "ab", "ac", "bc", "abc".
 */
import type { RangeRules } from '@mt/engine'
import type { Board, GameData, Terrain } from '@mt/shared'

export interface RangeVariant {
  readonly id: string
  readonly label: string
  /** Variant a: shorter ranges in data. */
  readonly shorter: boolean
  /** Variant b: long-range disadvantage. */
  readonly longRange: boolean
  /** Variant c: sight-blocking terrain. */
  readonly sight: boolean
}

const variant = (id: string, label: string, parts: string): RangeVariant => ({
  id,
  label,
  shorter: parts.includes('a'),
  longRange: parts.includes('b'),
  sight: parts.includes('c'),
})

export const RANGE_VARIANTS: readonly RangeVariant[] = [
  variant('baseline', 'Baseline (today)', ''),
  variant('a', 'a: shorter ranges', 'a'),
  variant('b', 'b: long-range disadvantage', 'b'),
  variant('c', 'c: mountains block sight', 'c'),
  variant('ab', 'a+b', 'ab'),
  variant('ac', 'a+c', 'ac'),
  variant('bc', 'b+c', 'bc'),
  variant('abc', 'a+b+c', 'abc'),
]

/** Variant a: skill id -> the range it gets. */
export const SHORTER_RANGES: Readonly<Record<string, number>> = { long_shot: 3, element_bolt: 3, pin: 3, mark: 4 }

/** The same skills before variant a (and in sim v4). */
export const LEGACY_RANGES: Readonly<Record<string, number>> = { long_shot: 4, element_bolt: 4, pin: 4, mark: 5 }

/** Variant b: attack rolls from this distance get disadvantage. */
export const LONG_RANGE_FROM = 4

/** Variant c: the terrain that blocks sight. */
export const SIGHT_BLOCKING: readonly Terrain[] = ['mountain']

/**
 * Variant c: tiles turned to mountain, by Board id, as [x, y]. Each Board gets
 * two pairs of plain tiles near the middle, one tile of each pair the 180 turn
 * of the other, so the Board keeps looking the same for both sides.
 */
export const EXTRA_MOUNTAINS: Readonly<Record<string, readonly (readonly [number, number])[]>> = {
  crossroads: [[2, 2], [4, 4], [4, 2], [2, 4]],
  shallows: [[3, 2], [3, 4], [1, 3], [5, 3]],
}

export function variantById(id: string): RangeVariant {
  const found = RANGE_VARIANTS.find((v) => v.id === id)
  if (found === undefined) throw new Error(`unknown variant "${id}" (one of ${RANGE_VARIANTS.map((v) => v.id).join(', ')})`)
  return found
}

/** `board` with the extra mountain tiles turned on (mountain) or off (plain), whichever data/ has now. */
export function withExtraMountains(board: Board, on: boolean): Board {
  const extra = EXTRA_MOUNTAINS[board.id]
  if (extra === undefined) return board
  const terrain = board.terrain.map((row) => [...row])
  for (const [x, y] of extra) {
    const now = terrain[y]?.[x]
    if (now !== 'normal' && now !== 'mountain') throw new Error(`${board.id}: tile ${x},${y} is ${String(now)}, not plain or mountain`)
    terrain[y]![x] = on ? 'mountain' : 'normal'
  }
  return { ...board, terrain }
}

/** `skills` with the four ranges of variant a (`shorter`) or the legacy ones. */
export function withRanges(skills: GameData['skills'], shorter: boolean): GameData['skills'] {
  const ranges = shorter ? SHORTER_RANGES : LEGACY_RANGES
  const out: Record<string, GameData['skills'][string]> = { ...skills }
  for (const [id, range] of Object.entries(ranges)) {
    const skill = skills[id]
    if (skill === undefined) throw new Error(`no skill "${id}"`)
    out[id] = { ...skill, range }
  }
  return out
}

/** The data to play a variant with (a copy; `data` is not changed) and its range rules. */
export function applyVariant(data: GameData, v: RangeVariant): { readonly data: GameData; readonly rules: RangeRules } {
  const boards = Object.fromEntries(Object.entries(data.boards).map(([id, board]) => [id, withExtraMountains(board, v.sight)]))
  const rules: RangeRules = {
    ...(v.longRange ? { longRangeDisadvantageFrom: LONG_RANGE_FROM } : {}),
    ...(v.sight ? { sightBlockedBy: SIGHT_BLOCKING } : {}),
  }
  return { data: { ...data, skills: withRanges(data.skills, v.shorter), boards }, rules }
}
