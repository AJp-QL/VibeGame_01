/**
 * The range variants of phase 1.x ticket 08, each applied to a copy of the
 * game data and the engine's experiment switches. Nothing here touches data/
 * or the rules of the game: a variant exists only inside a simulator run.
 *
 *  a  shorter ranges in data: Long Shot, Element Bolt, Pin 4 -> 3; Mark 5 -> 4
 *  b  disadvantage on attack rolls at range 4 or more (engine switch)
 *  c  mountain blocks line of sight (engine switch), with four more mountain
 *     tiles on each Board, placed in pairs that look the same after a 180 turn
 *
 * They combine: "ab", "ac", "bc", "abc".
 */
import type { VariantRules } from '@mt/engine'
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

function withMountains(board: Board): Board {
  const extra = EXTRA_MOUNTAINS[board.id]
  if (extra === undefined) return board
  const terrain = board.terrain.map((row) => [...row])
  for (const [x, y] of extra) {
    if (terrain[y]?.[x] !== 'normal') throw new Error(`${board.id}: tile ${x},${y} is not plain, so it cannot become a mountain`)
    terrain[y]![x] = 'mountain'
  }
  return { ...board, terrain }
}

/** The data to play a variant with (a copy; `data` is not changed) and the engine switches, `undefined` when it has none. */
export function applyVariant(data: GameData, v: RangeVariant): { readonly data: GameData; readonly rules: VariantRules | undefined } {
  let skills = data.skills
  if (v.shorter) {
    const shorter: Record<string, GameData['skills'][string]> = { ...data.skills }
    for (const [id, range] of Object.entries(SHORTER_RANGES)) {
      const skill = data.skills[id]
      if (skill === undefined) throw new Error(`variant ${v.id}: no skill "${id}"`)
      if (skill.range <= range) throw new Error(`variant ${v.id}: ${id} already reaches ${skill.range}, not more than ${range}`)
      shorter[id] = { ...skill, range }
    }
    skills = shorter
  }
  const boards = v.sight ? Object.fromEntries(Object.entries(data.boards).map(([id, board]) => [id, withMountains(board)])) : data.boards
  const rules: VariantRules | undefined =
    v.longRange || v.sight
      ? {
          ...(v.longRange ? { longRangeDisadvantageFrom: LONG_RANGE_FROM } : {}),
          ...(v.sight ? { sightBlockedBy: SIGHT_BLOCKING } : {}),
        }
      : undefined
  return { data: { ...data, skills, boards }, rules }
}
