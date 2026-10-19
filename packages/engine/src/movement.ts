/**
 * Move (rules §6.1–§6.3): steps to any of the 8 neighbouring tiles, every step
 * costs 1, other Units block (Flying may pass over but not stop on them).
 */
import { isOnBoard, sameTile, type Tile } from '@mt/shared'
import { baseMoveRange } from './derived.ts'
import { terrainAt, type BattleState, type UnitState, boardSizeOf } from './state.ts'
import { isImmobile } from './statuses.ts'

/**
 * How distance is measured. The game plays 'chebyshev' (rules §2.3) always; the
 * other two exist only for the simulator's range experiments (phase 1.x ticket
 * 20), set through `RangeRules.distanceMetric` of a Battle:
 *  - 'orthogonal': no diagonals, distance = |dx| + |dy|, Move steps in 4 directions.
 *  - 'alternating': a diagonal costs 1, then 2, then 1 ... along a path (a
 *    straight line of k diagonals costs k + floor(k/2)); distance = max + floor(min / 2).
 */
export type DistanceMetric = 'chebyshev' | 'orthogonal' | 'alternating'

/** Distance between two tiles: Chebyshev, diagonals count 1 (rules §2.3), unless a `metric` is given. */
export function distance(a: Tile, b: Tile, metric: DistanceMetric = 'chebyshev'): number {
  const dx = Math.abs(a.x - b.x)
  const dy = Math.abs(a.y - b.y)
  if (metric === 'chebyshev') return Math.max(dx, dy)
  if (metric === 'orthogonal') return dx + dy
  return Math.max(dx, dy) + Math.floor(Math.min(dx, dy) / 2)
}

/** The metric of this Battle (Chebyshev unless its range rules say otherwise). */
export function metricOf(state: BattleState): DistanceMetric {
  return state.rangeRules?.distanceMetric ?? 'chebyshev'
}

/** `distance` in the metric of `state`. */
export function distanceIn(state: BattleState, a: Tile, b: Tile): number {
  return distance(a, b, metricOf(state))
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
  const metric = metricOf(state)
  if (metric !== 'chebyshev') return reachableCosted(state, unit, metric)
  const range = moveRangeNow(state, unit)
  const size = boardSizeOf(state)
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
        if (!isOnBoard(to, size) || visited.has(key(to))) continue
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

/**
 * `reachableTiles` for the experiment metrics: Dijkstra by cost over (tile, parity of diagonals taken).
 * 'orthogonal' uses the 4 straight steps; 'alternating' makes the 1st, 3rd ... diagonal cost 1 and the 2nd, 4th ... cost 2.
 */
function reachableCosted(state: BattleState, unit: UnitState, metric: Exclude<DistanceMetric, 'chebyshev'>): ReadonlyMap<number, readonly Tile[]> {
  const range = moveRangeNow(state, unit)
  const size = boardSizeOf(state)
  const canPassOver = unit.kind === 'monster' && unit.movement === 'flying'
  const occupied = new Set(state.units.filter((u) => u.id !== unit.id).map((u) => key(u.tile)))
  const steps = metric === 'orthogonal' ? STEPS.filter((d) => d.x === 0 || d.y === 0) : STEPS
  interface Node {
    readonly tile: Tile
    readonly parity: number
    readonly path: readonly Tile[]
  }
  const best = new Map<number, number>([[key(unit.tile) * 2, 0]])
  const buckets: Node[][] = Array.from({ length: range + 1 }, () => [])
  buckets[0]!.push({ tile: unit.tile, parity: 0, path: [] })
  const destinations = new Map<number, readonly Tile[]>()
  const destinationCost = new Map<number, number>()
  for (let cost = 0; cost <= range; cost++) {
    for (const node of buckets[cost]!) {
      if (best.get(key(node.tile) * 2 + node.parity) !== cost) continue
      for (const d of steps) {
        const diagonal = d.x !== 0 && d.y !== 0
        const nextCost = cost + (diagonal && metric === 'alternating' && node.parity === 1 ? 2 : 1)
        if (nextCost > range) continue
        const to = { x: node.tile.x + d.x, y: node.tile.y + d.y }
        if (!isOnBoard(to, size)) continue
        const parity = diagonal && metric === 'alternating' ? 1 - node.parity : node.parity
        const stateKey = key(to) * 2 + parity
        if ((best.get(stateKey) ?? Infinity) <= nextCost) continue
        const isOccupied = occupied.has(key(to))
        if (isOccupied && !canPassOver) continue
        best.set(stateKey, nextCost)
        const path = [...node.path, to]
        if (!isOccupied && !sameTile(to, unit.tile) && (destinationCost.get(key(to)) ?? Infinity) > nextCost) {
          destinations.set(key(to), path)
          destinationCost.set(key(to), nextCost)
        }
        buckets[nextCost]!.push({ tile: to, parity, path })
      }
    }
  }
  return destinations
}

export function pathTo(state: BattleState, unit: UnitState, to: Tile): readonly Tile[] | undefined {
  if (sameTile(unit.tile, to)) return undefined
  return reachableTiles(state, unit).get(key(to))
}
