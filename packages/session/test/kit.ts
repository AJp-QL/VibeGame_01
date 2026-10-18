import type { Board, GameData } from '@mt/shared'

// Session tests of selection, aiming and previews play the Prototype kit as it was before
// phase 1.x ticket 09 (D-31): the four skill ranges of sim v4, Crossroads without the four
// extra mountains, and neither range rule. The tests of the new data and rules are in the
// engine (`rangeRules.test.ts`).

const KIT_RANGES: Readonly<Record<string, number>> = { long_shot: 4, element_bolt: 4, pin: 4, mark: 5 }
const EXTRA_MOUNTAINS: readonly (readonly [number, number])[] = [[2, 2], [4, 4], [4, 2], [2, 4]]

/** `skills` with Long Shot, Element Bolt and Pin at 4 and Mark at 5. */
export function kitSkills(skills: GameData['skills']): GameData['skills'] {
  return Object.fromEntries(Object.entries(skills).map(([id, skill]) => [id, KIT_RANGES[id] === undefined ? skill : { ...skill, range: KIT_RANGES[id]! }]))
}

/** Crossroads without the four extra mountains. */
export function kitCrossroads(board: Board): Board {
  const terrain = board.terrain.map((row) => [...row])
  for (const [x, y] of EXTRA_MOUNTAINS) terrain[y]![x] = 'normal'
  return { ...board, terrain }
}
