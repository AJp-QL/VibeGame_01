/**
 * Advantage and disadvantage on attack rolls (rules §4, §5, §9): every
 * source that applies to one attack roll, and how they combine.
 *
 * Sources: the element wheel (§4.2), the terrain under the attacker (§4.3,
 * Attune included), Off-balance on the attacker (§14.2), Command (§16) and
 * Tamer protection (§9). Marked (ticket 10) joins `rollModeSources`; Defend
 * gives no advantage or disadvantage, it raises Guard and Ward (§12).
 */
import type { Element, ElementWheel, Terrain } from '@mt/shared'
import { distance } from './movement.ts'
import { terrainAt, type BattleState, type StatusId, type UnitId, type UnitState } from './state.ts'

/** How the d20 of an attack roll is rolled (rules §5.2). */
export type RollMode = 'normal' | 'advantage' | 'disadvantage'

export type RollEffect = 'advantage' | 'disadvantage'

/** One reason an attack roll gets advantage or disadvantage (rules §5.1). */
export type RollModeSource =
  /**
   * Element wheel (rules §4.2): the attacker's element beats the target's
   * (advantage) or loses to it (disadvantage). Monsters only. Light against
   * dark gives one of each, which cancel (D-08).
   */
  | {
      readonly kind: 'element'
      readonly effect: RollEffect
      readonly attackerElement: Element
      readonly targetElement: Element
    }
  /**
   * Terrain under the attacker (rules §4.3): the tile's element is the
   * attacker's own (advantage) or beats it (disadvantage). Not for Tamers or
   * Flying. `aquatic` when the tile is water and counts as the attacker's own
   * element because it is Aquatic (§6.3).
   */
  | {
      readonly kind: 'terrain'
      readonly effect: RollEffect
      readonly terrain: Element
      readonly attackerElement: Element
      readonly aquatic: boolean
    }
  /**
   * The attacker has a status that gives its next attack roll disadvantage
   * (Off-balance, rules §14.2). That attack roll spends it (§10.5 step 5).
   */
  | {
      readonly kind: 'nextAttackRoll'
      readonly effect: 'disadvantage'
      readonly status: StatusId
    }
  /**
   * Command's advantage on the commanded Monster's next attack roll this Turn
   * (rules §16.3). Never on a counterattack. When a source with
   * `cancellableByCommand: false` is present it is left out before cancelling
   * (§5.3), but the attack roll still spends it (D-04).
   */
  | {
      readonly kind: 'command'
      readonly effect: 'advantage'
      /** The Tamer that issued it. */
      readonly tamer: UnitId
    }
  /**
   * The target is a Tamer with at least one allied Monster adjacent (rules
   * §9), at any range. Advantage from Command cannot cancel it (§5.3):
   * `combineRollMode` leaves Command out before cancelling when this is present.
   */
  | {
      readonly kind: 'tamerProtection'
      readonly effect: 'disadvantage'
      /** The allied Monsters adjacent to the Tamer, in Unit order. */
      readonly protectors: readonly UnitId[]
      readonly cancellableByCommand: false
    }

/**
 * Whether element `a` beats element `b` on the element wheel from data/elements
 * (rules §4.1: forest > water > mountain > desert > forest; light and dark beat each other).
 */
export function elementBeats(wheel: ElementWheel, a: Element, b: Element): boolean {
  return wheel.beats[a].includes(b)
}

function elementSources(state: BattleState, attacker: UnitState, target: UnitState): RollModeSource[] {
  // Rules §4.2: no element effect when either side is a Tamer.
  if (attacker.kind !== 'monster' || target.kind !== 'monster') return []
  const sources: RollModeSource[] = []
  const pair = { attackerElement: attacker.element, targetElement: target.element }
  const wheel = state.elementWheel
  if (elementBeats(wheel, attacker.element, target.element)) sources.push({ kind: 'element', effect: 'advantage', ...pair })
  if (elementBeats(wheel, target.element, attacker.element)) sources.push({ kind: 'element', effect: 'disadvantage', ...pair })
  return sources
}

function terrainSources(state: BattleState, attacker: UnitState): RollModeSource[] {
  // Rules §4.3: Tamers and Flying get nothing from terrain, either way.
  if (attacker.kind !== 'monster' || attacker.movement === 'flying') return []
  const terrain: Terrain | undefined = terrainAt(state, attacker.tile)
  if (terrain === undefined || terrain === 'normal') return []
  const own = attacker.element
  // Rules §4.3, §6.3: water always counts as an Aquatic Monster's own element.
  const aquatic = attacker.movement === 'aquatic' && terrain === 'water' && own !== 'water'
  const base = { kind: 'terrain', terrain, attackerElement: own, aquatic } as const
  if (terrain === own || aquatic) return [{ ...base, effect: 'advantage' }]
  if (elementBeats(state.elementWheel, terrain, own)) return [{ ...base, effect: 'disadvantage' }]
  return []
}

function tamerProtectionSources(state: BattleState, target: UnitState): RollModeSource[] {
  if (target.kind !== 'tamer') return []
  // Units on the Board are the ones still up (rules §10.4).
  const protectors = state.units
    .filter((u) => u.side === target.side && u.kind === 'monster' && distance(u.tile, target.tile) === 1)
    .map((u) => u.id)
  if (protectors.length === 0) return []
  return [{ kind: 'tamerProtection', effect: 'disadvantage', protectors, cancellableByCommand: false }]
}

/** Off-balance and the like on the attacker (rules §14.2): disadvantage on its next attack roll. */
function nextAttackRollSources(state: BattleState, attacker: UnitState): RollModeSource[] {
  return attacker.statuses.flatMap((status) =>
    state.statusTypes[status.id]?.effects.nextAttackRollMode === 'disadvantage'
      ? [{ kind: 'nextAttackRoll', effect: 'disadvantage', status: status.id } as const]
      : [],
  )
}

/**
 * Command's advantage (rules §16.2, §16.3): the commanded Monster's next attack
 * roll this Turn, until spent; never a counterattack (§14.2).
 */
export function commandSources(state: BattleState, attacker: UnitState, isCounterattack: boolean): RollModeSource[] {
  const command = state.command
  if (isCounterattack || command === null || command.option !== 'advantage' || command.spent === true) return []
  if (command.target !== attacker.id || command.side !== attacker.side) return []
  return [{ kind: 'command', effect: 'advantage', tamer: command.tamer }]
}

/**
 * Every source of advantage or disadvantage for this attacker's attack roll
 * against this target, as things stand now (rules §5.2: worked out again for
 * every attack roll). Order as in rules §5.1: element, terrain, Off-balance,
 * Command, Tamer protection. `isCounterattack`: Command never applies (§14.2).
 */
export function rollModeSources(
  state: BattleState,
  attacker: UnitState,
  target: UnitState,
  isCounterattack = false,
): RollModeSource[] {
  return [
    ...elementSources(state, attacker, target),
    ...terrainSources(state, attacker),
    ...nextAttackRollSources(state, attacker),
    ...commandSources(state, attacker, isCounterattack),
    ...tamerProtectionSources(state, target),
  ]
}

/**
 * Whether Command's advantage is left out of this roll (rules §5.3): a source
 * Command cannot cancel (Tamer protection) is present.
 */
export function commandCancelledOut(sources: readonly RollModeSource[]): boolean {
  return sources.some((s) => s.kind === 'tamerProtection' && !s.cancellableByCommand)
}

/**
 * Combine sources (rules §5.2): any number of advantages alone = advantage;
 * disadvantages alone = disadvantage; at least one of each = normal, however
 * many there are on each side. Before counting, Command's advantage is left
 * out when a source with `cancellableByCommand: false` is present (rules
 * §5.3); other advantages (terrain, Marked) still cancel it.
 */
export function combineRollMode(sources: readonly RollModeSource[]): RollMode {
  const counted = commandCancelledOut(sources) ? sources.filter((s) => s.kind !== 'command') : sources
  const advantage = counted.some((s) => s.effect === 'advantage')
  const disadvantage = counted.some((s) => s.effect === 'disadvantage')
  if (advantage === disadvantage) return 'normal'
  return advantage ? 'advantage' : 'disadvantage'
}
