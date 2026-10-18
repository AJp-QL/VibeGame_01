/**
 * Wispling's loadout (rules §15.1): Element Bolt, Burst, Hex, Blink.
 *
 * - Element Bolt: Minor, elemental 1d8 at range 4 (GENERIC): d20 + SEN mod +
 *   proficiency against Ward, damage + INT mod (rules §10.1).
 * - Hex: Major, range 3, Weakened 2 with a save SPI against the INT Save DC
 *   (GENERIC). Weakened (`damageDealt` −2) is applied in `previewAttack`.
 * - Burst: Major, elemental 1d6 on up to 2 chosen enemies around a centre
 *   tile (D-14): centre at distance 0–3 (own tile included), line of sight to
 *   the centre only (from distance 2, unless the user is Flying), no line of
 *   sight per target, no allies, a Hidden enemy 2+ tiles from the user cannot
 *   be chosen (§8.2). Each target is one full attack (rules §10.5) in the
 *   order chosen (§21.4): the generic resolution already does exactly that
 *   (it stops once the user is down or the Battle is over).
 * - Blink: Minor, replaces the Unit's Move (`effects.replacesMove`, booked
 *   by the generic path): teleport to an empty tile at distance 1–2, fixed
 *   range (no Command or Aquatic bonus), usable while Pinned (D-13).
 */
import { BOARD_SIZE, isOnBoard, sameTile, tileName, type Skill, type Tile } from '@mt/shared'
import type { ActionPreview, Rejection, RejectionCode } from './battle.ts'
import { isFlying, previewAttack, spendAttackRoll } from './combat.ts'
import { unitsOnLine } from './lineOfSight.ts'
import { sightBlockingTiles } from './variantRules.ts'
import { distance } from './movement.ts'
import { emit } from './resolution.ts'
import { GENERIC, type SkillHandler, type SkillHandlers, type SkillResolution, type SkillUse } from './skillHandler.ts'
import type { UseSkillAction } from './skills.ts'
import { findUnit, type BattleState, type UnitState, boardSizeOf } from './state.ts'
import { untargetableFrom } from './statuses.ts'

function rejection(code: RejectionCode, message: string, blockedBy?: readonly string[]): Rejection {
  return blockedBy === undefined ? { code, message } : { code, message, blockedBy }
}

/** Every tile of the Board in reading order (row by row), so legal uses are listed the same way every time. */
function boardTiles(size: number): Tile[] {
  const tiles: Tile[] = []
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) tiles.push({ x, y })
  return tiles
}

/**
 * The tiles an area skill covers around `centre` (Burst: the centre and its 8
 * neighbours), on a Board of `size` (7x7 unless given), reading order.
 */
export function areaTiles(skill: Skill, centre: Tile, size: number = BOARD_SIZE): Tile[] {
  const radius = skill.area?.radius ?? 0
  return boardTiles(size).filter((tile) => distance(tile, centre) <= radius)
}

// ------------------------------------------------------------------ Burst

/** Whether `user` may centre `skill` on `centre` (D-14, rules §7.1): on the Board, distance 0 to range, line of sight from 2. */
function checkCentre(state: BattleState, user: UnitState, skill: Skill, centre: Tile): Rejection | null {
  if (!isOnBoard(centre, boardSizeOf(state))) return rejection('off-board', `(${centre.x}, ${centre.y}) is not on the Board`)
  const d = distance(user.tile, centre)
  if (d > skill.range) return rejection('out-of-range', `${tileName(centre)} is ${d} tiles away; ${skill.name} reaches ${skill.range}`)
  // Rules §7.1, §15.1: only to the centre (as the line's end), from distance 2, unless the user is Flying.
  if (d >= 2 && !isFlying(user)) {
    const ids = unitsOnLine(state, user.tile, centre).map((u) => u.id)
    if (ids.length > 0) {
      return rejection(
        'no-line-of-sight',
        `${ids.join(', ')} ${ids.length === 1 ? 'stands' : 'stand'} between ${user.id} and ${tileName(centre)}`,
        ids,
      )
    }
    if (sightBlockingTiles(state, user.tile, centre).length > 0) {
      return rejection('no-line-of-sight', `Terrain blocks the line between ${user.id} and ${tileName(centre)}`, [])
    }
  }
  return null
}

/** Hidden (rules §8.2): Burst does not hit it when it stands 2 or more tiles from the user (not from the centre). */
function hiddenFrom(state: BattleState, user: UnitState, target: UnitState): boolean {
  const from = untargetableFrom(state, target)
  return from !== null && distance(user.tile, target.tile) >= from
}

/** The enemies `skill` centred on `centre` may hit, in Unit order. Allies are never hit. */
function areaEnemies(state: BattleState, user: UnitState, skill: Skill, centre: Tile): UnitState[] {
  const radius = skill.area?.radius ?? 0
  return state.units.filter(
    (u) => u.side !== user.side && distance(u.tile, centre) <= radius && !hiddenFrom(state, user, u),
  )
}

/** Every ordered choice of 1 to `max` different Units out of `pool`, each prefix before its extensions. */
function orderedChoices(pool: readonly UnitState[], max: number): UnitState[][] {
  const choices: UnitState[][] = []
  const extend = (chosen: UnitState[]) => {
    if (chosen.length === max) return
    for (const unit of pool) {
      if (chosen.includes(unit)) continue
      const next = [...chosen, unit]
      choices.push(next)
      extend(next)
    }
  }
  extend([])
  return choices
}

/**
 * The state the attacks after the first are previewed in. D-04 (ticket 11):
 * Command advantage is spent on the first target's attack roll (rules §10.5
 * step 5, §16.3), so later targets never get it; drop it from `state` here
 * (as with anything else the first attack roll spends, e.g. Off-balance).
 * Resolution needs no change as long as `attackOnce` spends it.
 */
function afterFirstAttackRoll(state: BattleState, user: UnitState): BattleState {
  return spendAttackRoll(state, user.id, false).state
}

const BURST: SkillHandler = {
  targets(state, user, skill, action) {
    const max = skill.area?.maxTargets ?? 1
    const chosen = action.targets
    if (action.tile === undefined || chosen === undefined || action.target !== undefined || action.element !== undefined) {
      return rejection('invalid-target', `${skill.name} needs a centre tile and 1 to ${max} targets in order`)
    }
    if (chosen.length < 1 || chosen.length > max) {
      return rejection('invalid-target', `${skill.name} hits 1 to ${max} chosen enemies, not ${chosen.length}`)
    }
    if (new Set(chosen).size !== chosen.length) return rejection('invalid-target', `${skill.name} cannot choose the same Unit twice`)
    const centre = action.tile
    const centreProblem = checkCentre(state, user, skill, centre)
    if (centreProblem !== null) return centreProblem
    const radius = skill.area?.radius ?? 0
    const targets: UnitState[] = []
    for (const id of chosen) {
      const target = findUnit(state, id)
      if (target === undefined) return rejection('unknown-unit', `No Unit "${id}" on the Board`)
      if (target.side === user.side) return rejection('not-an-enemy', `${id} is on the same side as ${user.id}`)
      if (distance(target.tile, centre) > radius) {
        return rejection('out-of-range', `${id} is not in ${skill.name}'s area around ${tileName(centre)}`)
      }
      if (hiddenFrom(state, user, target)) {
        return rejection('target-hidden', `${id} is Hidden and ${distance(user.tile, target.tile)} tiles from ${user.id}`)
      }
      targets.push(target)
    }
    return targets
  },

  // Every centre in reading order, then every ordered choice of enemies in its area.
  // Different centres covering the same enemies resolve the same way.
  uses(state, user, skill) {
    const max = skill.area?.maxTargets ?? 1
    const uses: UseSkillAction[] = []
    for (const centre of boardTiles(boardSizeOf(state))) {
      if (checkCentre(state, user, skill, centre) !== null) continue
      for (const choice of orderedChoices(areaEnemies(state, user, skill, centre), max)) {
        uses.push({ type: 'useSkill', unit: user.id, skill: skill.id, tile: centre, targets: choice.map((u) => u.id) })
      }
    }
    return uses
  },

  preview(state: BattleState, use: SkillUse): ActionPreview {
    const centre = use.action.tile ?? use.user.tile
    const later = afterFirstAttackRoll(state, use.user)
    return {
      type: 'area',
      skill: use.skill.id,
      user: use.user.id,
      centre,
      area: areaTiles(use.skill, centre, boardSizeOf(state)),
      attacks: use.targets.map((target, index) =>
        previewAttack(index === 0 ? state : later, { attacker: use.user, target, skill: use.skill }),
      ),
    }
  },
}

// ------------------------------------------------------------------ Blink

const BLINK: SkillHandler = {
  targets(state, user, skill, action) {
    const to = action.tile
    if (to === undefined || action.target !== undefined || action.targets !== undefined || action.element !== undefined) {
      return rejection('invalid-target', `${skill.name} needs a destination tile only`)
    }
    if (!isOnBoard(to, boardSizeOf(state))) return rejection('off-board', `(${to.x}, ${to.y}) is not on the Board`)
    const d = distance(user.tile, to)
    // D-13: always `skill.range`; no Command or Aquatic bonus, and Pin does not stop it.
    if (d < 1 || d > skill.range) return rejection('out-of-range', `${tileName(to)} is ${d} tiles away; ${skill.name} reaches 1 to ${skill.range}`)
    const occupant = state.units.find((u) => sameTile(u.tile, to))
    if (occupant !== undefined) return rejection('tile-occupied', `${tileName(to)} is occupied by ${occupant.id}`)
    return []
  },

  uses(state, user, skill) {
    return boardTiles(boardSizeOf(state)).map((tile) => ({ type: 'useSkill', unit: user.id, skill: skill.id, tile }))
  },

  *resolve(state: BattleState, use: SkillUse): SkillResolution {
    const to = use.action.tile
    if (to === undefined) throw new Error('Blink without a tile passed its checks')
    yield* emit({ type: 'unitTeleported', unit: use.user.id, skill: use.skill.id, from: use.user.tile, to })
    return { ...state, units: state.units.map((u) => (u.id === use.user.id ? { ...u, tile: to } : u)) }
  },

  preview(_state, use) {
    return { type: 'effect', skill: use.skill.id, user: use.user.id, units: [use.user.id], statuses: [] }
  },
}

export const WISPLING_SKILLS: SkillHandlers = {
  element_bolt: GENERIC,
  burst: BURST,
  hex: GENERIC,
  blink: BLINK,
}
