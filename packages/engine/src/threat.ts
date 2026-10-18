/**
 * Threat zone (phase 1.x ticket 11, CONTEXT.md): how many enemies could
 * attack a tile in the other side's next Turn, worked out coarsely: an enemy
 * on the Board counts when the Chebyshev distance from it to the tile is at
 * most its Move range plus the reach of its longest attack or save skill.
 * Cooldowns, line of sight, Command, Taunt, Pin and Units in the way are not
 * looked at, so it is advice, not a promise. Pure and without dice.
 */
import type { Side, Tile } from '@mt/shared'
import { BASIC_ATTACK } from './combat.ts'
import { derive } from './derived.ts'
import { distance } from './movement.ts'
import { boardSizeOf, type BattleState, type UnitState } from './state.ts'

/**
 * The reach of `unit`'s longest hostile skill: Basic Attack and each loadout
 * skill that makes an attack roll or a save against enemies (an area skill
 * reaches its radius beyond its range). Passive skills do not count.
 */
export function longestAttackReach(state: BattleState, unit: UnitState): number {
  let reach = 0
  for (const id of [BASIC_ATTACK, ...unit.skills]) {
    const skill = state.skills[id]
    if (skill === undefined || skill.tier === 'passive') continue
    if (skill.attack === undefined && skill.dcStat === undefined) continue
    if (skill.target === 'enemy') reach = Math.max(reach, skill.range)
    else if (skill.target === 'area') reach = Math.max(reach, skill.range + (skill.area?.radius ?? 0))
  }
  return reach
}

/** How far from its tile an enemy could hit in a Turn: its Move range plus its longest attack reach. */
export function threatReach(state: BattleState, unit: UnitState): number {
  return derive(unit).move + longestAttackReach(state, unit)
}

/** The enemies of `side` (Units on the Board of the other side) that could attack `tile` next Turn. */
export function threatCount(state: BattleState, tile: Tile, side: Side): number {
  return state.units.filter((u) => u.side !== side && distance(u.tile, tile) <= threatReach(state, u)).length
}

/** `threatCount` of every tile of the Board, indexed `[y][x]`, for the overlay. */
export function threatZone(state: BattleState, side: Side): number[][] {
  const size = boardSizeOf(state)
  const reaches = state.units.filter((u) => u.side !== side).map((u) => ({ tile: u.tile, reach: threatReach(state, u) }))
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => reaches.filter((r) => distance(r.tile, { x, y }) <= r.reach).length),
  )
}
