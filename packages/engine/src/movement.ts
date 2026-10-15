/**
 * Move (rules §6.1–§6.3): steps to any of the 8 neighbouring tiles, every step
 * costs 1, other Units block (Flying may pass over but not stop on them).
 */
import { isOnBoard, sameTile, type Tile } from '@mt/shared'
import { baseMoveRange } from './derived.ts'
import { terrainAt, type BattleState, type UnitState } from './state.ts'
import { isImmobile } from './statuses.ts'

/** Distance between two tiles: Chebyshev, diagonals count 1 (rules §2.3). */
export function distance(a: Tile, b: Tile): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))
}

/**
 * Movement range for this Move (rules §6.1): base + Aquatic on water (Attune
 * included) + Command's +1 (§16.2), but 0 while Pinned (rules §14.2).
 */
export function moveRangeNow(state: BattleState, unit: UnitState): number {
  if (isImmobile(state, unit)) return 0
  const aquaticBonus =
    unit.kind === 'monster' && unit.movement === 'aquatic' && terrainAt(state, unit.tile) === 'water' ? 1 : 0
  const command = state.command
  const commandBonus = command !== null && command.option === 'move' && command.target === unit.id ? 1 : 0
  return baseMoveRange(unit) + aquaticBonus + commandBonus
}

/** Neighbour order is fixed so that paths are deterministic. */
const STEPS: readonly Tile[] = [
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
  { x: -1, y: -1 },
]

const key = (tile: Tile): number => tile.y * 100 + tile.x

/**
 * Every tile the Unit can end a Move on, with one shortest path to it
 * (path excludes the start, includes the destination). Breadth-first, so the
 * path is the fewest steps; ties broken by the fixed neighbour order.
 */
export function reachableTiles(state: BattleState, unit: UnitState): ReadonlyMap<number, readonly Tile[]> {
  const range = moveRangeNow(state, unit)
  const canPassOver = unit.kind === 'monster' && unit.movement === 'flying'
  const occupied = new Set(state.units.filter((u) => u.id !== unit.id).map((u) => key(u.tile)))

  const destinations = new Map<number, readonly Tile[]>()
  const visited = new Set<number>([key(unit.tile)])
  let frontier: { tile: Tile; path: readonly Tile[] }[] = [{ tile: unit.tile, path: [] }]

  for (let step = 0; step < range; step++) {
    const next: typeof frontier = []
    for (const { tile, path } of frontier) {
      for (const d of STEPS) {
        const to = { x: tile.x + d.x, y: tile.y + d.y }
        if (!isOnBoard(to) || visited.has(key(to))) continue
        visited.add(key(to))
        const toPath = [...path, to]
        if (occupied.has(key(to))) {
          if (canPassOver) next.push({ tile: to, path: toPath })
          continue
        }
        destinations.set(key(to), toPath)
        next.push({ tile: to, path: toPath })
      }
    }
    frontier = next
  }
  return destinations
}

export function pathTo(state: BattleState, unit: UnitState, to: Tile): readonly Tile[] | undefined {
  if (sameTile(unit.tile, to)) return undefined
  return reachableTiles(state, unit).get(key(to))
}
