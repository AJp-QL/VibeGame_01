/**
 * Taunted (rules §14.3, D-05). In the activation of a Unit that is Taunted
 * by a taunter still on the Board:
 *
 * 1. If it can attack the taunter this activation (from where it stands, or
 *    after its Move or Blink, with any attack it has ready, §8.1), its Action
 *    must be an attack on the taunter (Burst: the taunter among the targets).
 * 2. Otherwise its Move (or Blink) must end on a tile closest to the taunter
 *    among those it can reach (staying counts), and its Action may not be an
 *    attack.
 *
 * Which case applies is decided when the activation starts (`activate` stores
 * it in `state.activations.tauntDuty`), so an attack on the taunter frees the
 * Move afterwards and a Unit that moves out of reach cannot then use another
 * Action instead. Only that Unit is bound: it may skip its Move and Action,
 * and its side may end the Turn as usual (§14.3 item 4). A taunter that has
 * fallen binds nothing (item 3). Counterattacks and Hit and Run's step are
 * neither Move nor Action and are never bound.
 */
import type { Tile } from '@mt/shared'
import type { Action, Rejection } from './battle.ts'
import { BASIC_ATTACK, checkAttack, isRejection } from './combat.ts'
import { distance, reachableTiles } from './movement.ts'
import { skillUsesOf } from './skills.ts'
import { statusType } from './statuses.ts'
import { findUnit, replaceUnit, type BattleState, type TauntDuty, type UnitId, type UnitState } from './state.ts'

/** The taunter of a Taunted Unit, if it is still on the Board (rules §14.3 item 3). */
export function taunterOf(state: BattleState, unit: UnitState): UnitState | undefined {
  const taunted = unit.statuses.find((s) => statusType(state, s.id).effects.forcedToAttackSource === true)
  return taunted?.source === undefined ? undefined : findUnit(state, taunted.source)
}

/** Whether `action` makes an attack roll: Basic Attack or an attack skill (Mark and Burst included). */
export function isAttackAction(state: BattleState, action: Action): boolean {
  if (action.type === 'basicAttack') return true
  return action.type === 'useSkill' && state.skills[action.skill]?.attack !== undefined
}

function aimsAt(action: Action, unitId: UnitId): boolean {
  if (action.type === 'basicAttack') return action.target === unitId
  if (action.type !== 'useSkill') return false
  return action.target === unitId || (action.targets ?? []).includes(unitId)
}

/** Where the Unit's Move or a Move-replacing skill (Blink) could put it now. */
function destinations(state: BattleState, unit: UnitState): Tile[] {
  if (unit.hasMoved) return []
  const walks = [...reachableTiles(state, unit).values()].flatMap((path) => path.slice(-1))
  const jumps = skillUsesOf(state, unit).flatMap((use) =>
    state.skills[use.skill]?.effects?.replacesMove === true && use.tile !== undefined ? [use.tile] : [],
  )
  return [...walks, ...jumps]
}

/** An attack on the taunter that is legal from this state, Taunted aside. */
function canAttackFromHere(state: BattleState, unit: UnitState, taunter: UnitState): boolean {
  if (!isRejection(checkAttack(state, unit.id, BASIC_ATTACK, taunter.id))) return true
  return skillUsesOf(state, unit).some((use) => isAttackAction(state, use) && aimsAt(use, taunter.id))
}

/** Rules §14.3 item 1: an attack on the taunter is possible this activation, now or after Move/Blink. */
function canAttackThisActivation(state: BattleState, unit: UnitState, taunter: UnitState): boolean {
  if (unit.hasActed) return false
  if (canAttackFromHere(state, unit, taunter)) return true
  return destinations(state, unit).some((tile) => {
    const moved: UnitState = { ...unit, tile, hasMoved: true }
    return canAttackFromHere(replaceUnit(state, moved), moved, taunter)
  })
}

/**
 * What Taunted asks of `unitId` now, or `undefined` when nothing (not
 * Taunted, or the taunter has fallen): the case stored when its activation
 * started, or worked out from the state when it has not started yet.
 */
export function tauntDuty(state: BattleState, unitId: UnitId): TauntDuty | undefined {
  const unit = findUnit(state, unitId)
  if (unit === undefined) return undefined
  const taunter = taunterOf(state, unit)
  if (taunter === undefined) return undefined
  const stored = state.activations.tauntDuty
  if (state.activations.current === unitId && stored?.unit === unitId && stored.taunter === taunter.id) return stored
  return { unit: unitId, taunter: taunter.id, mustAttack: canAttackThisActivation(state, unit, taunter) }
}

/** Rules §14.3 item 2: the shortest distance to the taunter among the tiles the Unit can end on (staying included). */
function closestDistance(state: BattleState, unit: UnitState, taunter: UnitState): number {
  return Math.min(distance(unit.tile, taunter.tile), ...destinations(state, unit).map((t) => distance(t, taunter.tile)))
}

/**
 * A check of Taunted for actions of the side to act (rules §14.3): returns
 * why `action` breaks it, or `null`. Call it on actions that are otherwise
 * legal. Works out each Unit's duty once, so legalActions can filter a long list.
 */
export function tauntCheck(state: BattleState): (action: Action) => Rejection | null {
  const duties = new Map<UnitId, { duty: TauntDuty; closest: number | null } | null>()
  const dutyOf = (unitId: UnitId) => {
    if (!duties.has(unitId)) {
      const duty = tauntDuty(state, unitId)
      duties.set(unitId, duty === undefined ? null : { duty, closest: null })
    }
    return duties.get(unitId) ?? null
  }
  return (action) => {
    if (state.phase !== 'play') return null
    if (action.type !== 'move' && action.type !== 'basicAttack' && action.type !== 'useSkill' && action.type !== 'defend') return null
    const entry = dutyOf(action.unit)
    if (entry === null) return null
    const { duty } = entry
    const unit = findUnit(state, action.unit)
    const taunter = findUnit(state, duty.taunter)
    if (unit === undefined || taunter === undefined) return null

    const replacesMove = action.type === 'useSkill' && state.skills[action.skill]?.effects?.replacesMove === true
    if (action.type === 'move' || replacesMove) {
      const to = action.type === 'move' ? action.to : action.type === 'useSkill' ? action.tile : undefined
      if (duty.mustAttack || to === undefined) return null
      entry.closest ??= closestDistance(state, unit, taunter)
      if (distance(to, taunter.tile) <= entry.closest) return null
      return {
        code: 'taunted',
        message: `${unit.id} is Taunted by ${taunter.id} and cannot reach it: it may only move to a tile ${entry.closest} from it`,
      }
    }

    const attacking = isAttackAction(state, action)
    if (duty.mustAttack) {
      if (attacking && aimsAt(action, taunter.id)) return null
      return { code: 'taunted', message: `${unit.id} is Taunted by ${taunter.id}: its Action must be an attack on ${taunter.id}` }
    }
    if (!attacking) return null
    return {
      code: 'taunted',
      message: `${unit.id} is Taunted by ${taunter.id} and cannot attack it this activation: it may not attack at all`,
    }
  }
}
