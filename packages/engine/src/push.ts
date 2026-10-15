/**
 * Pushing a Unit (Shield Bash, rules §6.4, ruling round 3, D-15): straight
 * away from the pusher, diagonally when the target is diagonally adjacent.
 * The destination must be on the Board and empty, otherwise nothing happens
 * and nothing replaces it. A push is not the target's Move: it uses none of
 * its Move, ignores Pin (a Pinned Unit is still pushed), Flying and Aquatic,
 * and no build resists it. No dice.
 */
import { isOnBoard, sameTile, type Tile } from '@mt/shared'
import { emit, type Resolution } from './resolution.ts'
import { findUnit, type BattleState, type UnitId } from './state.ts'

/** The push direction (rules §6.4): `(sign(x_target − x_pusher), sign(y_target − y_pusher))`. */
export function pushDirection(from: Tile, target: Tile): Tile {
  return { x: Math.sign(target.x - from.x), y: Math.sign(target.y - from.y) }
}

/**
 * Where a push of `tiles` would leave the target, tile by tile until one is
 * off the Board or taken (rules §6.4: then no push), and why it stops short.
 * Phase 1 pushes 1 tile, so a blocked first tile means no push at all.
 */
export function pushOutcome(
  state: BattleState,
  pusherId: UnitId,
  targetId: UnitId,
  tiles: number,
): { to: Tile | null; blocked: { tile: Tile; by: 'offBoard' | UnitId } | null } {
  const pusher = findUnit(state, pusherId)
  const target = findUnit(state, targetId)
  if (pusher === undefined || target === undefined) return { to: null, blocked: null }
  const step = pushDirection(pusher.tile, target.tile)
  let at = target.tile
  for (let i = 0; i < tiles; i++) {
    const next = { x: at.x + step.x, y: at.y + step.y }
    if (!isOnBoard(next)) return { to: sameTile(at, target.tile) ? null : at, blocked: { tile: next, by: 'offBoard' } }
    const occupant = state.units.find((u) => sameTile(u.tile, next))
    if (occupant !== undefined) return { to: sameTile(at, target.tile) ? null : at, blocked: { tile: next, by: occupant.id } }
    at = next
  }
  return { to: at, blocked: null }
}

/**
 * Push `targetId` away from `pusherId` (rules §6.4): `unitPushed`, or
 * `pushBlocked` when the destination is off the Board or taken. Ticket 10
 * checks the target's Hidden right after the push (rules §8.2).
 */
export function* push(state: BattleState, pusherId: UnitId, targetId: UnitId, tiles: number): Resolution<BattleState> {
  const target = findUnit(state, targetId)
  if (target === undefined || findUnit(state, pusherId) === undefined) return state
  const outcome = pushOutcome(state, pusherId, targetId, tiles)
  if (outcome.to === null) {
    if (outcome.blocked !== null) {
      yield* emit({ type: 'pushBlocked', unit: targetId, by: pusherId, tile: outcome.blocked.tile, blockedBy: outcome.blocked.by })
    }
    return state
  }
  const to = outcome.to
  yield* emit({ type: 'unitPushed', unit: targetId, by: pusherId, from: target.tile, to })
  return { ...state, units: state.units.map((u) => (u.id === targetId ? { ...u, tile: to } : u)) }
}
