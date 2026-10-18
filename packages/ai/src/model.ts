/**
 * What the AI reads from a Battle state, and its expected-value helpers.
 *
 * Every rule comes from the engine: roll modes, Guard/Ward, attack bonus,
 * damage dice and mod (`previewAttackWhatIf`, `previewAction`), terrain
 * effects (`terrainEffectAt`), movement range (`moveRangeNow`), cooldowns
 * (`unitSkills`) and what is legal (`previewAction`, `legalActions`). Skill
 * and status data (ranges, which status a skill gives) are read from the
 * state's data. The weights and formulas are sim.py's (`AI` class).
 */
import {
  derivedValues,
  distance,
  moveRangeNow,
  previewAttackWhatIf,
  terrainEffectAt,
  unitSkills,
  type AttackPreview,
  type BattleState,
  type UnitId,
  type UnitState,
} from '@mt/engine'
import type { Dice, Side, Skill, Tile } from '@mt/shared'
import { attackValue, type Adv } from './odds.ts'
import type { AiProfile } from './profiles.ts'

export const BASIC_ATTACK = 'basic_attack'
export const DEFEND = 'defend'

/** A damaging attack of a Unit (Basic Attack first, then loadout order), as sim.py's `dmg_skills`. */
export interface DamageSkill {
  readonly id: string
  readonly range: number
  /** Area skills (Burst) are left out of sim.py's single-target estimates. */
  readonly area: boolean
}

/**
 * One decision's worth of caches. Valid while the real state is the same:
 * hypothetical states only ever move the AI's own Units, and every cache
 * key holds what such a move can change (tiles, Tamer protection).
 */
export class Ctx {
  readonly profile: AiProfile
  readonly side: Side
  readonly base: BattleState
  /** sim.py `wt`: how much more damage to a Tamer is worth. */
  readonly tamerWeight: number
  /** Units of our side that are done this Turn (sim.py `acted`). */
  readonly done: ReadonlySet<UnitId>
  private readonly previews = new Map<string, AttackPreview>()
  private readonly cooldowns = new Map<UnitId, ReadonlyMap<string, number>>()
  private readonly damageSkillsCache = new Map<UnitId, readonly DamageSkill[]>()
  private readonly threats = new Map<string, number>()
  private readonly bestEvs = new Map<string, number>()
  private readonly bestAttacks = new Map<string, readonly [number, number]>()
  private readonly threatFroms = new Map<string, number>()
  /** Position values of the plan being made, by Unit and tile (sim.py's `('pv', uid, d)` cache). */
  readonly posValues = new Map<string, number>()

  constructor(profile: AiProfile, side: Side, base: BattleState, done: ReadonlySet<UnitId>) {
    this.profile = profile
    this.side = side
    this.base = base
    this.done = done
    this.tamerWeight = profile.mode === 'tamer_rush' ? 5 : profile.mode === 'neutral' ? 1 : 2
  }

  /** Start planning one Unit's activation: sim.py clears its caches per plan (`self._tc = {}`). */
  beginPlan(): void {
    this.posValues.clear()
    if (this.profile.simQuirks) this.threats.clear()
  }

  // ------------------------------------------------------------ units

  skill(id: string): Skill {
    const skill = this.base.skills[id]
    if (skill === undefined) throw new Error(`No skill "${id}"`)
    return skill
  }

  /** Damaging attacks of a Unit (sim.py `dmg_skills`). */
  damageSkills(unit: UnitState): readonly DamageSkill[] {
    let list = this.damageSkillsCache.get(unit.id)
    if (list === undefined) {
      list = [BASIC_ATTACK, ...unit.skills].flatMap((id) => {
        const skill = this.base.skills[id]
        if (skill === undefined || skill.tier === 'passive' || skill.attack === undefined || skill.damage === undefined) return []
        return [{ id, range: skill.range, area: skill.target === 'area' }]
      })
      this.damageSkillsCache.set(unit.id, list)
    }
    return list
  }

  /** sim.py `maxrng`: the longest reach of its damaging attacks. */
  maxRange(unit: UnitState): number {
    return Math.max(0, ...this.damageSkills(unit).map((s) => s.range))
  }

  /** Turns until the skill is ready again (engine's cooldown; Basic Attack and Defend: 0). */
  cooldown(unit: UnitState, skillId: string): number {
    let map = this.cooldowns.get(unit.id)
    if (map === undefined) {
      map = new Map(unitSkills(this.base, unit.id).map((s) => [s.skill, s.spent ? 99 : s.cooldown]))
      this.cooldowns.set(unit.id, map)
    }
    return map.get(skillId) ?? 0
  }

  maxHp(unit: UnitState): number {
    return derivedValues(this.base, unit.id).maxHp
  }

  /** Base movement (sim.py `u.move`). */
  baseMove(unit: UnitState): number {
    return derivedValues(this.base, unit.id).move
  }

  // --------------------------------------------------------- weights

  /** sim.py `w`: value of damage dealt to this Unit. */
  w(unit: UnitState): number {
    return unit.kind === 'tamer' ? this.tamerWeight : 1
  }

  /** sim.py `kb`: value of dropping this enemy. */
  kb(st: BattleState, unit: UnitState): number {
    if (unit.kind === 'tamer') return this.profile.mode === 'neutral' ? 12 : 300
    return isLastMonster(st, unit) ? 300 : 12
  }

  /** sim.py `wdef`: cost of damage taken by our Unit. */
  wdef(unit: UnitState): number {
    return unit.kind === 'tamer' ? 2 : 1
  }

  /** sim.py `kbdef`: cost of losing our Unit. */
  kbdef(st: BattleState, unit: UnitState): number {
    if (unit.kind === 'tamer') return 120
    return isLastMonster(st, unit) ? 60 : 12
  }

  /** sim.py `pen`: expected cost of `threat` on our Unit (with `hp` instead of its HP). */
  pen(st: BattleState, unit: UnitState, threat: number, hp: number = unit.hp): number {
    const pd = Math.min(0.7, Math.max(0, (threat / hp - 0.4) * 0.7))
    return 0.5 * this.wdef(unit) * Math.min(threat, hp) + this.kbdef(st, unit) * pd
  }

  // ------------------------------------------------------- attack odds

  /**
   * The engine's what-if preview of `attacker` attacking `target` with
   * `skillId` as they stand in `st` (cached). The cache key holds what an
   * attack preview depends on that a hypothetical move of our Units can
   * change: the attacker's tile (terrain), melee or not (damage mod,
   * counterattack), long range (variant rules only) and Tamer protection of the target. Statuses, HP and
   * Command are the same for the whole decision.
   */
  preview(st: BattleState, attacker: UnitState, target: UnitState, skillId: string): AttackPreview {
    const d = distance(attacker.tile, target.tile)
    // Distance class: melee, near or (variant rules, ticket 08) far enough for the long-range disadvantage.
    const far = st.variantRules?.longRangeDisadvantageFrom
    const reach = d <= 1 ? d : far !== undefined && d >= far ? 3 : 2
    const key = `${attacker.id}@${attacker.tile.x},${attacker.tile.y}>${target.id}:${reach}:${skillId}:${protectedNow(st, target) ? 1 : 0}`
    let p = this.previews.get(key)
    if (p === undefined) {
      p = previewAttackWhatIf(st, attacker.id, target.id, skillId)
      this.previews.set(key, p)
    }
    return p
  }

  /**
   * sim.py `ev`: [expected damage, chance to drop] of an attack.
   * `adv` given: that roll mode. `simple`: only element, terrain and (with
   * `tamerProtection`) Tamer protection count, as sim.py's quick estimate.
   * Otherwise the engine's roll mode. `extraDefence`: counterfactual Guard/Ward bonus.
   */
  ev(
    st: BattleState,
    attacker: UnitState,
    target: UnitState,
    skillId: string,
    options: { adv?: Adv; simple?: boolean; tamerProtection?: boolean; extraDefence?: number; damageDelta?: number } = {},
  ): readonly [number, number] {
    const p = this.preview(st, attacker, target, skillId)
    return this.evOf(st, p, target, options)
  }

  /** `ev` from a preview the caller already has (e.g. from previewAction). */
  evOf(
    st: BattleState,
    p: AttackPreview,
    target: UnitState,
    options: { adv?: Adv; simple?: boolean; tamerProtection?: boolean; extraDefence?: number; dice?: Dice; damageDelta?: number } = {},
  ): readonly [number, number] {
    const dice = options.dice ?? p.damage?.dice
    if (dice === undefined || p.damage === null) return [0, 0]
    const adv = options.adv ?? (options.simple === true ? simpleAdv(p, options.tamerProtection === true) : advOf(p))
    const mod = p.damage.modifier + (options.damageDelta ?? 0)
    return attackValue(p.attackBonus, p.defence + (options.extraDefence ?? 0), adv, dice.count, dice.sides, mod, Math.max(1, effectiveHp(st, target)))
  }

  /**
   * In-game lookahead (ticket 23): [expected damage, chance to drop] of
   * `attacker`'s best single-target attack on `target` (by expected damage)
   * with roll mode `adv`, from where they stand.
   */
  bestAttack(st: BattleState, attacker: UnitState, target: UnitState, adv: Adv, readyNow: boolean): readonly [number, number] {
    const key = `${attacker.id}@${attacker.tile.x},${attacker.tile.y}>${target.id}@${target.tile.x},${target.tile.y}:${adv}:${readyNow ? 1 : 0}:${protectedNow(st, target) ? 1 : 0}`
    const cached = this.bestAttacks.get(key)
    if (cached !== undefined) return cached
    let best: readonly [number, number] = [0, 0]
    for (const s of this.damageSkills(attacker)) {
      if (s.area || (readyNow && this.cooldown(attacker, s.id) > 0)) continue
      const ev = this.ev(st, attacker, target, s.id, { adv })
      if (ev[0] > best[0]) best = ev
    }
    this.bestAttacks.set(key, best)
    return best
  }

  /**
   * In-game lookahead (ticket 23): what `enemy` alone adds to `threat` on
   * `unit` (its best ready attack within move + reach, sim.py's estimate),
   * with its movement `move` instead of the engine's (Pinned: 0 or Blink's
   * range) and `damageDelta` on its damage (Weakened).
   */
  threatFrom(st: BattleState, enemy: UnitState, unit: UnitState, options: { move?: number; damageDelta?: number } = {}): number {
    const prot = protectedNow(st, unit)
    const mv = options.move ?? moveRangeNow(st, enemy)
    const delta = options.damageDelta ?? 0
    const key = `${enemy.id}>${unit.id}@${unit.tile.x},${unit.tile.y}:${mv}:${delta}:${prot ? 1 : 0}`
    const cached = this.threatFroms.get(key)
    if (cached !== undefined) return cached
    const dd = distance(enemy.tile, unit.tile)
    let best = 0
    for (const s of this.damageSkills(enemy)) {
      if (s.area || this.cooldown(enemy, s.id) > 1 || dd > mv + s.range) continue
      best = Math.max(best, this.ev(st, enemy, unit, s.id, { simple: true, tamerProtection: prot, damageDelta: delta })[0])
    }
    this.threatFroms.set(key, best)
    return best
  }

  /**
   * sim.py `best_ev`: the best single-target expected damage of `attacker` on
   * `target` from where they stand. `adv` null: sim.py's simple estimate.
   */
  bestEv(st: BattleState, attacker: UnitState, target: UnitState, adv: Adv | null, readyNow: boolean): number {
    const key = `${attacker.id}@${attacker.tile.x},${attacker.tile.y}>${target.id}@${target.tile.x},${target.tile.y}:${adv}:${readyNow ? 1 : 0}:${protectedNow(st, target) ? 1 : 0}`
    const cached = this.bestEvs.get(key)
    if (cached !== undefined) return cached
    let best = 0
    for (const s of this.damageSkills(attacker)) {
      if (s.area || (readyNow && this.cooldown(attacker, s.id) > 0)) continue
      const options = adv === null ? { simple: true } : { adv }
      best = Math.max(best, this.ev(st, attacker, target, s.id, options)[0])
    }
    this.bestEvs.set(key, best)
    return best
  }

  /** The roll mode `attacker` would have against `target` now (sim.py `adv_state`), from any of its attacks. */
  advAgainst(st: BattleState, attacker: UnitState, target: UnitState): Adv {
    const first = this.damageSkills(attacker)[0]
    if (first === undefined) return 0
    return advOf(this.preview(st, attacker, target, first.id))
  }

  // ------------------------------------------------------------ threat

  /**
   * sim.py `threat`: expected damage the enemies could deal `unit` (standing
   * where it is in `st`) on their next Turn, each enemy's best ready attack
   * within its move + reach. `extraDefence`: as if Guarded by that much;
   * `hidden`: only enemies that can come next to it count. `at`: the tile
   * reach is measured to (sim.py quirk: it can differ from where the Unit is).
   */
  threat(st: BattleState, unit: UnitState, extraDefence = 0, hidden = false, at: Tile = unit.tile): number {
    const prot = protectedNow(st, unit)
    const key = `${unit.id}@${at.x},${at.y}:${extraDefence}:${hidden ? 1 : 0}:${prot ? 1 : 0}`
    const cached = this.threats.get(key)
    if (cached !== undefined) return cached
    let total = 0
    for (const enemy of st.units) {
      if (enemy.side === unit.side) continue
      const mv = moveRangeNow(st, enemy)
      const dd = distance(enemy.tile, at)
      if (dd > mv + this.maxRange(enemy)) continue
      if (hidden && dd > mv + 1) continue
      let best = 0
      for (const s of this.damageSkills(enemy)) {
        if (s.area || this.cooldown(enemy, s.id) > 1 || dd > mv + s.range) continue
        const options = { simple: true, tamerProtection: prot, extraDefence }
        best = Math.max(best, this.ev(st, enemy, unit, s.id, options)[0])
      }
      total += best
    }
    this.threats.set(key, total)
    return total
  }

  /** sim.py `threat_of`: how dangerous `enemy` is to our side next Turn. */
  threatOf(st: BattleState, enemy: UnitState): number {
    let best = 0
    const mv = this.baseMove(enemy) + 1
    for (const ours of st.units) {
      if (ours.side === enemy.side) continue
      const f = distance(enemy.tile, ours.tile) <= mv + this.maxRange(enemy) ? 1 : 0.3
      best = Math.max(best, f * this.wdef(ours) * this.bestEv(st, enemy, ours, null, false))
    }
    return best
  }

  /** sim.py `terrain_mod`: +1 / −1 / 0 for `unit` standing on `tile`. */
  terrainMod(st: BattleState, unit: UnitState, tile: Tile): number {
    const effect = terrainEffectAt(st, unit, tile)
    return effect === 'advantage' ? 1 : effect === 'disadvantage' ? -1 : 0
  }
}

// ------------------------------------------------------------------ helpers

export function advOf(p: AttackPreview): Adv {
  return p.rollMode === 'advantage' ? 1 : p.rollMode === 'disadvantage' ? -1 : 0
}

/** sim.py's simple roll mode: element and terrain (and Tamer protection when asked), cancelling as usual. */
function simpleAdv(p: AttackPreview, tamerProtection: boolean): Adv {
  let adv = false
  let dis = false
  for (const s of p.rollModeSources) {
    if (s.kind === 'element' || s.kind === 'terrain' || (tamerProtection && s.kind === 'tamerProtection')) {
      if (s.effect === 'advantage') adv = true
      else dis = true
    }
  }
  return adv === dis ? 0 : adv ? 1 : -1
}

export function findUnit(st: BattleState, id: UnitId): UnitState | undefined {
  for (const u of st.units) if (u.id === id) return u
  return undefined
}

export function tamerOf(st: BattleState, side: Side): UnitState | undefined {
  for (const u of st.units) if (u.side === side && u.kind === 'tamer') return u
  return undefined
}

/** No other Monster of its side is still up. */
export function isLastMonster(st: BattleState, unit: UnitState): boolean {
  return !st.units.some((m) => m.side === unit.side && m.kind === 'monster' && m.id !== unit.id)
}

/** A Tamer with an allied Monster next to it (Tamer protection, rules §9): only a cache key here; the engine applies the rule. */
export function protectedNow(st: BattleState, unit: UnitState): boolean {
  if (unit.kind !== 'tamer') return false
  return st.units.some((m) => m.side === unit.side && m.kind === 'monster' && distance(m.tile, unit.tile) === 1)
}

/** HP that damage to `unit` comes off: its Tamer's under Cover (sim.py `eff`). */
export function effectiveHp(st: BattleState, unit: UnitState): number {
  return damageTaker(st, unit).hp
}

export function damageTaker(st: BattleState, unit: UnitState): UnitState {
  if (unit.coveredBy !== undefined) {
    const tamer = findUnit(st, unit.coveredBy)
    if (tamer !== undefined) return tamer
  }
  return unit
}

export function hasStatus(unit: UnitState, id: string): boolean {
  return unit.statuses.some((s) => s.id === id)
}

/** The state with `unitId` standing on `tile` instead (for estimates only; never applied). */
export function withUnitAt(st: BattleState, unitId: UnitId, tile: Tile): BattleState {
  return { ...st, units: st.units.map((u) => (u.id === unitId ? { ...u, tile } : u)) }
}

/** A number for each tile of any Board (up to 16 wide), to key maps and sets. */
export function tileKey(tile: Tile): number {
  return tile.y * 16 + tile.x
}
