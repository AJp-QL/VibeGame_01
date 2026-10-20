/**
 * One activation's plan: a port of sim.py's `AI.plan` / `actions` /
 * `attack_val` / `pos_value` / `cmd_value`. For every tile the Unit can end
 * its Move on (and Blink), the value of standing there plus the best Action
 * from there ("move first"), and the best Action from where it is followed by
 * a Move to the best tile ("act first"). Each candidate action is checked by
 * the engine (`previewAction` on the state after the Move), so only legal
 * actions are ever planned.
 */
import {
  applyAction,
  boardSizeOf,
  COMMAND_RANGE,
  distanceIn,
  moveRangeNow,
  previewAction,
  threatReach,
  type Action,
  type AttackPreview,
  type BattleState,
  type CommandOption,
  type UnitId,
  type UnitState,
} from '@mt/engine'
import { ELEMENTS, isOnBoard, sameTile, type Element, type Skill, type Tile } from '@mt/shared'
import { chance, type Adv } from './odds.ts'
import {
  BASIC_ATTACK,
  DEFEND,
  damageTaker,
  findUnit,
  hasStatus,
  tamerOf,
  tileKey,
  withUnitAt,
  type Ctx,
} from './model.ts'

/** A planned Command: before the Tamer's Move (`start`) or after its Action (`end`), as sim.py. */
export interface PlannedCommand {
  readonly when: 'start' | 'end'
  readonly target: UnitId
  readonly option: CommandOption
}

export interface Plan {
  readonly unit: UnitId
  /** `mf`: Move then Action; `af`: Action then Move (sim.py `order`). */
  readonly order: 'mf' | 'af'
  readonly dest: Tile
  /** The Move to `dest`: a walk, or Blink. `null` when staying. */
  readonly move: Action | null
  readonly action: Action | null
  /** Hit and Run's step chosen with the plan (`null`: stay). */
  readonly retreat: Tile | null
  readonly command: PlannedCommand | null
  /**
   * A free skill (Camouflage, D-28) used last in the activation, after the
   * Move and the Action ("act, then hide"). Absent when none.
   */
  readonly free?: Action
  /** sim.py `gain`: plan value over standing still. */
  readonly gain: number
}

interface Candidate {
  readonly value: number
  readonly action: Action
  /** Units it attacks (for Taunted). */
  readonly targets: readonly UnitId[]
  readonly retreat?: Tile | null
}

const NEIGHBOURS: readonly Tile[] = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].flatMap((dx) => (dx === 0 && dy === 0 ? [] : [{ x: dx, y: dy }])))

function enemiesOf(st: BattleState, unit: UnitState): UnitState[] {
  return st.units.filter((u) => u.side !== unit.side)
}

function alliesOf(st: BattleState, unit: UnitState): UnitState[] {
  return st.units.filter((u) => u.side === unit.side && u.id !== unit.id)
}

function statusApplied(skill: Skill): string | undefined {
  return skill.applies?.[0]?.status
}

/** Whether a status type has this effect (data-driven: which status hides, counters, taunts). */
function statusHas(ctx: Ctx, statusId: string, effect: string): boolean {
  const type = ctx.base.statusTypes[statusId]
  return type !== undefined && (type.effects as Record<string, unknown>)[effect] !== undefined
}

/** The Unit is Hidden on `tile` (sim.py: Hidden and on forest). */
function hiddenOn(ctx: Ctx, st: BattleState, unit: UnitState, tile: Tile): boolean {
  return unit.statuses.some((s) => {
    if (!statusHas(ctx, s.id, 'untargetableFrom')) return false
    return s.whileOn === undefined || st.terrain[tile.y]?.[tile.x] === s.whileOn
  })
}

function isCountering(ctx: Ctx, unit: UnitState): boolean {
  return unit.statuses.some((s) => statusHas(ctx, s.id, 'counterattack'))
}

/** The taunter of a Taunted Unit still on the Board. */
function taunterOf(ctx: Ctx, st: BattleState, unit: UnitState): UnitState | undefined {
  const status = unit.statuses.find((s) => statusHas(ctx, s.id, 'forcedToAttackSource'))
  return status?.source === undefined ? undefined : findUnit(st, status.source)
}

/** sim.py "acted": done this Turn, or another of our Units that already started (its activation is over). */
function hasActed(ctx: Ctx, unit: UnitState): boolean {
  return ctx.done.has(unit.id) || ctx.base.activations.started.includes(unit.id)
}

/** The dice a counterattack by `unit` rolls: a Passive's (Pincer Guard) or Countering's own. */
function counterDice(ctx: Ctx, unit: UnitState) {
  for (const id of unit.skills) {
    const dice = ctx.base.skills[id]?.effects?.counterattackDamage
    if (dice !== undefined && ctx.base.skills[id]?.tier === 'passive') return dice
  }
  for (const type of Object.values(ctx.base.statusTypes)) if (type.effects.counterattack !== undefined) return type.effects.counterattack
  return { count: 1, sides: 8 }
}

/** sim.py `ev(..., 'Counterattack', ...)`: `unit` (as it stands in `st`) striking `enemy` back. */
function counterEv(ctx: Ctx, st: BattleState, unit: UnitState, enemy: UnitState): readonly [number, number] {
  const p = ctx.preview(st, unit, enemy, BASIC_ATTACK)
  return ctx.evOf(st, p, enemy, { dice: counterDice(ctx, unit) })
}

// ------------------------------------------------------------- position

/**
 * sim.py `pos_value` of `unit` standing on `at`, with the other Units as in
 * `st` (cached per plan by tile). Normally `unit` stands on `at` in `st`; with
 * sim.py's quirk (Hit and Run's step) it is still on its attack tile.
 */
function posValue(ctx: Ctx, st: BattleState, unit: UnitState, at: Tile = unit.tile): number {
  const cacheKey = `${unit.id}@${at.x},${at.y}`
  const cached = ctx.posValues.get(cacheKey)
  if (cached !== undefined) return cached
  const h = ctx.profile.heuristics
  const hidden = hiddenOn(ctx, st, unit, at)
  let v = -ctx.pen(st, unit, ctx.threat(st, unit, 0, hidden, at))
  const enemies = enemiesOf(st, unit)
  if (unit.kind === 'tamer') {
    const monsters = alliesOf(st, unit).filter((m) => m.kind === 'monster')
    if (monsters.some((m) => distanceIn(st, m.tile, at) <= 3)) v += 0.3
    if (h.protectTamer > 0 && monsters.some((m) => distanceIn(st, m.tile, at) === 1)) v += h.protectTamer
  } else {
    v += 0.8 * ctx.terrainMod(st, unit, at)
    const tamer = tamerOf(st, unit.side)
    if (tamer !== undefined) v -= ctx.pen(st, tamer, ctx.threat(st, tamer)) * (1 + h.protectTamer)
    const r = ctx.maxRange(unit)
    if (ctx.profile.mode === 'tamer_rush') {
      const enemyTamer = enemies.find((e) => e.kind === 'tamer')
      if (enemyTamer !== undefined) v -= 0.5 * Math.max(0, distanceIn(st, at, enemyTamer.tile) - r)
    } else if (enemies.length > 0) {
      const dmin = Math.min(...enemies.map((e) => distanceIn(st, at, e.tile)))
      v -= 0.25 * Math.max(0, dmin - r)
    }
  }
  ctx.posValues.set(cacheKey, v)
  return v
}

// --------------------------------------------------------------- attacks

/** The engine's preview of a legal action, or null when illegal. */
function legalPreview(st: BattleState, action: Action) {
  const result = previewAction(st, action)
  return result.ok ? result.preview : undefined
}

/** sim.py `attack_val` of `unit` (in `st`) attacking `enemy` with the preview `p` of that attack. */
function attackValue(ctx: Ctx, st: BattleState, unit: UnitState, enemy: UnitState, skill: Skill, p: AttackPreview): number {
  let val: number
  let pk = 0
  const hitp = chance(p.hitChance)
  if (skill.damage === undefined && ctx.profile.heuristics.lookahead > 0) {
    val = hitp * markValue(ctx, st, unit, enemy)
  } else if (skill.damage === undefined) {
    // Mark: what advantage on the target is worth to allies still to play.
    let gain = 0
    for (const ally of alliesOf(st, unit)) {
      if (hasActed(ctx, ally)) continue
      if (distanceIn(st, ally.tile, enemy.tile) > moveRangeNow(st, ally) + ctx.maxRange(ally)) continue
      const base = ctx.advAgainst(st, ally, enemy)
      const next: Adv = base < 0 ? 0 : 1
      if (next !== base) gain += ctx.w(enemy) * (ctx.bestEv(st, ally, enemy, next, true) - ctx.bestEv(st, ally, enemy, base, true))
    }
    val = hitp * gain
  } else {
    const [exp, kill] = ctx.evOf(st, p, enemy)
    pk = kill
    const taker = damageTaker(st, enemy)
    val = ctx.w(taker) * exp + pk * ctx.kb(st, taker)
    const focus = ctx.profile.heuristics.focusFire
    if (focus > 0) val *= 1 + focus * (1 - taker.hp / ctx.maxHp(taker))
    if (skill.effects?.push !== undefined) {
      const tamer = tamerOf(st, unit.side)
      if (tamer !== undefined && distanceIn(st, enemy.tile, tamer.tile) === 1) {
        val += 0.5 * ctx.bestEv(st, enemy, tamer, null, false) * ctx.wdef(tamer) * 0.5
      }
    }
    const status = p.statuses[0]
    if (status?.save != null) {
      const pf = chance(status.save.failChance)
      if (statusHas(ctx, status.status, 'startOfTurnDamage')) {
        if (!hasStatus(enemy, status.status)) val += hitp * (1 - pk) * pf * 2.5 * 2.5 * ctx.w(enemy)
      } else if (statusHas(ctx, status.status, 'immobile') && ctx.profile.heuristics.lookahead > 0) {
        // Pin: the enemy's threat it can no longer bring by moving (Blink still moves it).
        const move = pinnedMove(ctx, enemy)
        val += hitp * (1 - pk) * pf * relief(ctx, st, unit, (ours) => ctx.threatFrom(st, enemy, ours) - ctx.threatFrom(st, enemy, ours, { move }))
      } else if (statusHas(ctx, status.status, 'immobile')) {
        val += hitp * (1 - pk) * pf * (ctx.maxRange(enemy) <= 1 ? 2 : 1)
      }
    }
  }
  if (p.counterattack !== undefined) {
    const [cexp, cpk] = ctx.evOf(st, p.counterattack, unit)
    val -= (1 - pk) * (ctx.wdef(unit) * cexp + cpk * ctx.kbdef(st, unit))
  }
  return val
}

// ------------------------------------------------------------- lookahead

/**
 * Mark with `lookahead` (ticket 23): what advantage on `enemy` is worth to
 * allies still to act this Turn plus, weighted by `lookahead`, to every Unit
 * of ours on our next Turn (Marked lasts until the end of the marking side's
 * next Turn). Counts expected damage and the extra chance that one of those
 * attacks drops the target.
 */
function markValue(ctx: Ctx, st: BattleState, unit: UnitState, enemy: UnitState): number {
  const now = alliesOf(st, unit).filter((a) => !hasActed(ctx, a) && distanceIn(st, a.tile, enemy.tile) <= moveRangeNow(st, a) + ctx.maxRange(a))
  const next = [unit, ...alliesOf(st, unit)].filter((a) => distanceIn(st, a.tile, enemy.tile) <= ctx.baseMove(a) + ctx.maxRange(a) + 1)
  return advantageWorth(ctx, st, now, enemy, true) + ctx.profile.heuristics.lookahead * advantageWorth(ctx, st, next, enemy, false)
}

function advantageWorth(ctx: Ctx, st: BattleState, attackers: readonly UnitState[], enemy: UnitState, readyNow: boolean): number {
  let exp = 0
  let surviveBase = 1
  let surviveAdv = 1
  for (const a of attackers) {
    const base = ctx.advAgainst(st, a, enemy)
    const [e0, k0] = ctx.bestAttack(st, a, enemy, base, readyNow)
    surviveBase *= 1 - k0
    if (base >= 1) {
      surviveAdv *= 1 - k0
      continue
    }
    const [e1, k1] = ctx.bestAttack(st, a, enemy, base < 0 ? 0 : 1, readyNow)
    exp += e1 - e0
    surviveAdv *= 1 - k1
  }
  const taker = damageTaker(st, enemy)
  return ctx.w(taker) * exp + ctx.kb(st, taker) * (surviveBase - surviveAdv)
}

/**
 * How much a change in the enemy's threat (`lowered(ours)`: the threat it no
 * longer brings on that Unit) lowers sim.py's `pen` on the Unit of ours it
 * helps most (the enemy attacks one Unit a Turn). `certain`: the enemy makes
 * that attack anyway, only weaker (Weakened), so the damage it no longer does
 * counts in full instead of at `pen`'s half ("it may attack someone else").
 */
function relief(ctx: Ctx, st: BattleState, unit: UnitState, lowered: (ours: UnitState) => number, certain = false): number {
  let best = 0
  for (const ours of st.units) {
    if (ours.side !== unit.side) continue
    const cut = lowered(ours)
    if (cut <= 0) continue
    const threat = ctx.threat(st, ours)
    const extra = certain ? 0.5 * ctx.wdef(ours) * Math.min(cut, ours.hp) : 0
    best = Math.max(best, ctx.pen(st, ours, threat) - ctx.pen(st, ours, Math.max(0, threat - cut)) + extra)
  }
  return best
}

/**
 * Hex on an enemy that strikes back (a counterattack Passive, Countering, or
 * Counter ready): the damage its counterattack no longer does to the melee
 * Monster of ours most likely to attack it, once a Turn.
 */
function counterRelief(ctx: Ctx, st: BattleState, unit: UnitState, enemy: UnitState, damageDelta: number): number {
  const passive = enemy.skills.some((id) => ctx.base.skills[id]?.tier === 'passive' && ctx.base.skills[id]?.effects?.counterattackDamage !== undefined)
  const counter = enemy.skills.find((id) => ctx.base.skills[id]?.applies?.some((a) => statusHas(ctx, a.status, 'counterattack')))
  if (!passive && !isCountering(ctx, enemy) && (counter === undefined || ctx.cooldown(enemy, counter) > 1)) return 0
  let best = 0
  for (const ours of st.units) {
    if (ours.side !== unit.side || ours.kind !== 'monster' || ctx.maxRange(ours) > 1) continue
    if (distanceIn(st, ours.tile, enemy.tile) > ctx.baseMove(ours) + 1) continue
    const p = ctx.preview(st, enemy, ours, BASIC_ATTACK)
    const dice = counterDice(ctx, enemy)
    const cut = ctx.evOf(st, p, ours, { dice })[0] - ctx.evOf(st, p, ours, { dice, damageDelta })[0]
    best = Math.max(best, cut * ctx.wdef(ours))
  }
  return best
}

/** How far a Pinned enemy still moves: the range of a ready skill that replaces its Move (Blink, usable while Pinned), else 0. */
function pinnedMove(ctx: Ctx, enemy: UnitState): number {
  let move = 0
  for (const id of enemy.skills) {
    const skill = ctx.base.skills[id]
    if (skill?.effects?.replacesMove === true && ctx.cooldown(enemy, id) <= 1) move = Math.max(move, skill.range)
  }
  return move
}

// ------------------------------------------------------------ free skill

interface FreeUse {
  readonly value: number
  readonly action: Action | null
}

const NO_FREE_USE: FreeUse = { value: 0, action: null }

/**
 * A free hiding skill (Camouflage, D-28) used last in the activation by
 * `unit` standing as in `st` (where its Move ends): "act, then hide". Worth
 * the threat it takes away until our next Turn, as the Action version of
 * Camouflage below; nothing when the Unit is already Hidden there, cannot use
 * it there (off forest) or has no such skill. Data with no free skill (the
 * sim-equivalent conditions) never gets here, so sim parity is unchanged.
 */
function freeHide(ctx: Ctx, st: BattleState, unit: UnitState): FreeUse {
  for (const skillId of unit.skills) {
    const skill = ctx.base.skills[skillId]
    if (skill?.effects?.free !== true || skill.target !== 'self') continue
    const status = statusApplied(skill)
    if (status === undefined || !statusHas(ctx, status, 'untargetableFrom')) continue
    if (hiddenOn(ctx, st, unit, unit.tile)) return NO_FREE_USE
    const action: Action = { type: 'useSkill', unit: unit.id, skill: skillId }
    if (!previewAction(st, action).ok) return NO_FREE_USE
    let value = ctx.pen(st, unit, ctx.threat(st, unit)) - ctx.pen(st, unit, ctx.threat(st, unit, 0, true))
    // As for the Action version: the forest's penalty in the position value is for attacks
    // made from the tile, and the Unit moves before its Action next Turn.
    if (ctx.profile.heuristics.lookahead > 0) value += 0.8 * Math.max(0, -ctx.terrainMod(st, unit, unit.tile))
    return value > 0 ? { value, action } : NO_FREE_USE
  }
  return NO_FREE_USE
}

// --------------------------------------------------------------- actions

/** sim.py `actions`: every Action of `unit` from where it stands in `st` (a legal state), with its value. */
function actionsOf(ctx: Ctx, st: BattleState, unit: UnitState, moveFirst: boolean, pv0: () => number): Candidate[] {
  if (unit.hasActed) return []
  const out: Candidate[] = []
  const enemies = enemiesOf(st, unit)
  const allies = alliesOf(st, unit)
  const here = unit.tile
  for (const skillId of [BASIC_ATTACK, DEFEND, ...unit.skills]) {
    const skill = ctx.base.skills[skillId]
    // A free skill (Camouflage, D-28) is not an Action: see freeHide.
    if (skill === undefined || skill.tier === 'passive' || skill.effects?.replacesMove === true || skill.effects?.free === true) continue
    if (ctx.cooldown(unit, skillId) > 0) continue
    const base = { type: 'useSkill', unit: unit.id, skill: skillId } as const

    if (skill.attack !== undefined && skill.target === 'enemy') {
      for (const enemy of enemies) {
        if (distanceIn(st, here, enemy.tile) > skill.range) continue
        const action: Action =
          skillId === BASIC_ATTACK ? { type: 'basicAttack', unit: unit.id, target: enemy.id } : { ...base, target: enemy.id }
        const result = previewAction(st, action)
        const hasStep = skill.effects?.retreat !== undefined && moveFirst && moveRangeNow(st, unit) > 0
        if (!result.ok) {
          // sim.py values attacks a Taunted Unit may not make before filtering them out; the
          // only lasting effect is Hit and Run's step filling its position cache (sim quirk).
          if (result.rejection.code === 'taunted' && hasStep && ctx.profile.simQuirks) bestStep(ctx, st, unit, pv0())
          continue
        }
        const p = result.preview
        if (p?.type !== 'attack') continue
        let value = attackValue(ctx, st, unit, enemy, skill, p)
        let retreat: Tile | null | undefined
        if (hasStep) {
          const step = bestStep(ctx, st, unit, pv0())
          retreat = step.tile
          value += step.gain
        }
        out.push({ value, action, targets: [enemy.id], ...(retreat !== undefined ? { retreat } : {}) })
      }
    } else if (skill.attack !== undefined && skill.target === 'area') {
      out.push(...areaCandidates(ctx, st, unit, skill))
    } else if (skill.target === 'enemy') {
      // Skills that only roll saves: Taunt, Hex, Distract (by the status they give).
      const status = statusApplied(skill)
      for (const enemy of enemies) {
        if (status === undefined || distanceIn(st, here, enemy.tile) > skill.range) continue
        const action: Action = { ...base, target: enemy.id }
        const p = legalPreview(st, action)
        if (p?.type !== 'save') continue
        const save = p.statuses[0]?.save
        const pf = save == null ? 1 : chance(save.failChance)
        let v: number
        if (statusHas(ctx, status, 'forcedToAttackSource')) {
          v = pf * 0.4 * ctx.threatOf(st, enemy)
          const counter = unit.skills.find((id) => ctx.base.skills[id]?.applies?.some((a) => statusHas(ctx, a.status, 'counterattack')))
          if (isCountering(ctx, unit) || (counter !== undefined && ctx.cooldown(unit, counter) === 0)) {
            v += pf * 0.3 * counterEv(ctx, st, unit, enemy)[0] * ctx.w(enemy)
          }
          if (enemy.kind === 'tamer') v += pf * 2
        } else if (statusHas(ctx, status, 'damageDealt') && ctx.profile.heuristics.lookahead > 0) {
          // Hex: the enemy's threat with its damage lowered, over the Turns Weakened lasts.
          if (hasStatus(enemy, status)) continue
          const type = ctx.base.statusTypes[status]
          const damageDelta = type?.effects.damageDealt ?? 0
          const turns = type?.duration.kind === 'turns' ? type.duration.turns : 1
          const once = relief(ctx, st, unit, (ours) => ctx.threatFrom(st, enemy, ours) - ctx.threatFrom(st, enemy, ours, { damageDelta }), true)
          v = pf * (once + counterRelief(ctx, st, unit, enemy, damageDelta)) * (1 + ctx.profile.heuristics.lookahead * (turns - 1))
        } else if (statusHas(ctx, status, 'damageDealt')) {
          if (hasStatus(enemy, status) || enemy.kind === 'tamer') continue
          v = pf * 2 * 2 * 0.65 * 1.4
        } else if (statusHas(ctx, status, 'nextAttackRollMode')) {
          if (hasStatus(enemy, status)) continue
          v = pf * 0.3 * ctx.threatOf(st, enemy)
        } else continue
        out.push({ value: v, action, targets: [] })
      }
    } else if (skillId === DEFEND) {
      if (!moveFirst) continue
      const bonus = skill.applies?.[0]?.bonus ?? 2
      const action: Action = { type: 'defend', unit: unit.id }
      if (!previewAction(st, action).ok) continue
      const v = ctx.pen(st, unit, ctx.threat(st, unit)) - ctx.pen(st, unit, ctx.threat(st, unit, bonus))
      out.push({ value: v, action, targets: [] })
    } else if (skill.target === 'self') {
      if (!moveFirst) continue
      const status = statusApplied(skill)
      if (status === undefined) continue
      const action: Action = base
      if (!previewAction(st, action).ok) continue
      if (statusHas(ctx, status, 'counterattack')) {
        if (isCountering(ctx, unit)) continue
        let v = 0
        for (const enemy of enemies) {
          if (distanceIn(st, enemy.tile, here) <= ctx.baseMove(enemy) + 1) {
            const pa = ctx.maxRange(enemy) <= 1 ? 0.35 : 0.1
            const [cexp, cpk] = counterEv(ctx, st, unit, enemy)
            v += pa * (ctx.w(enemy) * cexp + cpk * ctx.kb(st, enemy))
          }
        }
        out.push({ value: v, action, targets: [] })
      } else if (statusHas(ctx, status, 'untargetableFrom')) {
        if (hiddenOn(ctx, st, unit, here)) continue
        let v = ctx.pen(st, unit, ctx.threat(st, unit)) - ctx.pen(st, unit, ctx.threat(st, unit, 0, true))
        // Lookahead: terrain only changes the roll of an attack made from the tile. A Unit that
        // hides makes none this Turn and moves before its Action next Turn, so the position
        // value's terrain penalty for the hiding tile (forest under a Water Monster) is no cost.
        if (ctx.profile.heuristics.lookahead > 0) v += 0.8 * Math.max(0, -ctx.terrainMod(st, unit, here))
        out.push({ value: v, action, targets: [] })
      }
    } else if (skill.target === 'selfAndAllies') {
      // Pack Howl: Rallied on itself and allies next to it.
      if (!moveFirst) continue
      const status = statusApplied(skill)
      const action: Action = base
      if (status === undefined || !previewAction(st, action).ok) continue
      let v = 0
      for (const a of [unit, ...allies]) {
        if (a.id !== unit.id && distanceIn(st, a.tile, here) > skill.range) continue
        if (hasStatus(a, status)) continue
        const e = Math.max(0, ...enemies.map((x) => ctx.bestEv(st, a, x, null, false)))
        v += 0.05 * e * (2 + (a.id !== unit.id && !hasActed(ctx, a) ? 1 : 0))
      }
      out.push({ value: v, action, targets: [] })
    } else if (skill.target === 'ally' && skill.effects?.heal !== undefined) {
      // First Aid.
      for (const a of [unit, ...allies]) {
        if (a.id !== unit.id && distanceIn(st, a.tile, here) > skill.range) continue
        const p = legalPreview(st, { ...base, target: a.id })
        if (p?.type !== 'heal') continue
        const miss = p.maxHp - a.hp
        if (miss <= 0) continue
        const heal = Math.min((p.dice.count * (p.dice.sides + 1)) / 2 + p.modifier, miss)
        const threat = ctx.threat(st, a)
        const v = ctx.pen(st, a, threat) - ctx.pen(st, a, threat, a.hp + heal) + 0.3 * heal * ctx.wdef(a)
        out.push({ value: v, action: { ...base, target: a.id }, targets: [] })
      }
    } else if (skill.target === 'allyMonster') {
      // Cover: our Tamer takes the Monster's damage.
      const tt = ctx.threat(st, unit)
      for (const a of allies) {
        if (a.kind === 'tamer' || distanceIn(st, a.tile, here) !== 1) continue
        const action: Action = { ...base, target: a.id }
        if (!previewAction(st, action).ok) continue
        const tx = ctx.threat(st, a)
        const v = ctx.pen(st, a, tx) - (ctx.pen(st, unit, tt + tx) - ctx.pen(st, unit, tt))
        out.push({ value: v, action, targets: [] })
      }
    } else if (skill.target === 'tile' && skill.effects?.terrainTurns !== undefined) {
      out.push(...attuneCandidates(ctx, st, unit, skill))
    }
  }
  return out
}

/** sim.py's Hit and Run step: the neighbouring empty tile that raises the position value most, or stay. */
function bestStep(ctx: Ctx, st: BattleState, unit: UnitState, pv0: number): { tile: Tile | null; gain: number } {
  let best: Tile | null = null
  let gain = 0
  for (const d of NEIGHBOURS) {
    const q = { x: unit.tile.x + d.x, y: unit.tile.y + d.y }
    // One step away under the distance metric in play (a diagonal is 2 away in the no-diagonal experiment).
    if (!isOnBoard(q, boardSizeOf(st)) || distanceIn(st, unit.tile, q) !== 1 || st.units.some((u) => sameTile(u.tile, q))) continue
    let value: number
    if (ctx.profile.simQuirks) value = posValue(ctx, st, unit, q)
    else {
      const moved = withUnitAt(st, unit.id, q)
      value = posValue(ctx, moved, findUnit(moved, unit.id) ?? unit)
    }
    const dv = value - pv0
    if (dv > gain) {
      best = q
      gain = dv
    }
  }
  return { tile: best, gain }
}

/** Burst: one candidate per distinct set of hittable enemies (first centre in reading order), best 2 by value. */
function areaCandidates(ctx: Ctx, st: BattleState, unit: UnitState, skill: Skill): Candidate[] {
  const radius = skill.area?.radius ?? 0
  const max = skill.area?.maxTargets ?? 1
  const enemies = enemiesOf(st, unit)
  const seen = new Set<string>()
  const usableAreas = new Set<string>()
  const out: Candidate[] = []
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      const centre = { x, y }
      if (distanceIn(st, unit.tile, centre) > skill.range) continue
      const inArea = enemies.filter((e) => distanceIn(st, e.tile, centre) <= radius)
      if (inArea.length === 0) continue
      // Whether a target can be hit depends on the user and the target, not the centre (Hidden):
      // a centre covering the same enemies as an earlier usable one gives the same candidate.
      const areaKey = inArea.map((e) => e.id).join(',')
      if (usableAreas.has(areaKey)) continue
      const scored: { v: number; e: UnitState }[] = []
      for (const e of inArea) {
        // Hittable from here (Taunted aside: the whole choice is checked below).
        const single = previewAction(st, { type: 'useSkill', unit: unit.id, skill: skill.id, tile: centre, targets: [e.id] })
        if (!single.ok && single.rejection.code !== 'taunted') continue
        scored.push({ v: attackValue(ctx, st, unit, e, skill, ctx.preview(st, unit, e, skill.id)), e })
      }
      if (scored.length === 0) continue
      const key = scored.map((s) => s.e.id).join(',')
      if (seen.has(key)) continue
      seen.add(key)
      scored.sort((a, b) => b.v - a.v || (a.e.id < b.e.id ? -1 : a.e.id > b.e.id ? 1 : 0))
      const chosen = scored.slice(0, max)
      const action: Action = { type: 'useSkill', unit: unit.id, skill: skill.id, tile: centre, targets: chosen.map((c) => c.e.id) }
      if (!previewAction(st, action).ok) continue
      usableAreas.add(areaKey)
      out.push({ value: chosen.reduce((sum, c) => sum + c.v, 0), action, targets: chosen.map((c) => c.e.id) })
    }
  }
  return out
}

/** sim.py's Attune: make an adjacent ally's tile its own element, or an adjacent enemy's tile the element that beats it. */
function attuneCandidates(ctx: Ctx, st: BattleState, unit: UnitState, skill: Skill): Candidate[] {
  const out: Candidate[] = []
  for (const d of NEIGHBOURS) {
    const q = { x: unit.tile.x + d.x, y: unit.tile.y + d.y }
    const occ = st.units.find((u) => sameTile(u.tile, q))
    if (occ === undefined || distanceIn(st, unit.tile, q) !== 1 || occ.kind !== 'monster' || occ.movement === 'flying') continue
    const old = ctx.terrainMod(st, occ, q)
    let element: Element | undefined
    let delta: number
    let e: number
    if (occ.side === unit.side) {
      element = occ.element
      delta = 1 - old
      e = Math.max(0, ...enemiesOf(st, unit).map((x) => ctx.bestEv(st, occ, x, null, false)))
    } else {
      element = ELEMENTS.find((x) => x !== 'light' && x !== 'dark' && st.elementWheel.beats[x].includes(occ.element))
      delta = old + 1
      e = Math.max(0, ...st.units.filter((x) => x.side === unit.side).map((x) => ctx.bestEv(st, occ, x, null, false)))
    }
    if (element === undefined || delta <= 0) continue
    const action: Action = { type: 'useSkill', unit: unit.id, skill: skill.id, tile: q, element }
    if (!previewAction(st, action).ok) continue
    out.push({ value: 0.12 * e * 2.5 * delta, action, targets: [] })
  }
  return out
}

// --------------------------------------------------------------- command

interface CommandValue {
  readonly value: number
  readonly target: UnitId | null
  readonly option: CommandOption
}

const NO_COMMAND: CommandValue = { value: 0, target: null, option: 'advantage' }

/** sim.py `cmd_value`: the best Command the Tamer (as it stands in `st`) could give. */
function commandValue(ctx: Ctx, st: BattleState, tamer: UnitState): CommandValue {
  if (st.turnNumber[tamer.side] <= 1 || st.command !== null) return NO_COMMAND
  let best = NO_COMMAND
  const enemies = enemiesOf(st, tamer)
  for (const m of alliesOf(st, tamer)) {
    if (m.kind !== 'monster' || hasActed(ctx, m) || distanceIn(st, tamer.tile, m.tile) > COMMAND_RANGE) continue
    const mv = moveRangeNow(st, m)
    const near = enemies.filter((e) => distanceIn(st, m.tile, e.tile) <= mv + ctx.maxRange(m))
    if (near.length > 0) {
      let gain = 0
      for (const e of near) {
        const base = ctx.advAgainst(st, m, e)
        if (base >= 1) continue
        const next: Adv = base < 0 ? 0 : 1
        gain = Math.max(gain, ctx.w(e) * (ctx.bestEv(st, m, e, next, true) - ctx.bestEv(st, m, e, base, true)))
      }
      if (gain > best.value) best = { value: gain, target: m.id, option: 'advantage' }
    } else if (mv > 0) {
      const far = enemies.filter((e) => distanceIn(st, m.tile, e.tile) <= mv + 1 + ctx.maxRange(m))
      if (far.length > 0) {
        const v = 0.5 * Math.max(...far.map((e) => ctx.bestEv(st, m, e, null, true) * ctx.w(e)))
        if (v > best.value) best = { value: v, target: m.id, option: 'move' }
      }
    }
  }
  return best
}

// ------------------------------------------------------------------ plan

interface Dest {
  readonly tile: Tile
  /** The Move there, or null for staying. */
  readonly move: Action | null
}

/**
 * sim.py's order of tiles around `from` (`reachable`): breadth first,
 * neighbours in reading order, through tiles a Unit could pass. Only the
 * order of equal-valued plans depends on it (the first one wins, as in sim.py);
 * which tiles are reachable is the engine's `legalActions`.
 */
function simOrder(st: BattleState, unit: UnitState): Map<number, number> {
  const passOver = unit.kind === 'monster' && unit.movement === 'flying'
  const size = boardSizeOf(st)
  const occupied = new Set(st.units.filter((u) => u.id !== unit.id).map((u) => tileKey(u.tile)))
  const order = new Map<number, number>([[tileKey(unit.tile), 0]])
  let frontier: Tile[] = [unit.tile]
  while (frontier.length > 0) {
    const next: Tile[] = []
    for (const p of frontier) {
      for (const d of NEIGHBOURS) {
        const q = { x: p.x + d.x, y: p.y + d.y }
        const k = tileKey(q)
        if (!isOnBoard(q, size) || order.has(k)) continue
        order.set(k, order.size)
        if (!occupied.has(k) || passOver) next.push(q)
      }
    }
    frontier = next
  }
  return order
}

/** Where `unit` can end its Move: staying, walking, then Blink tiles not reachable on foot (reading order), as sim.py. */
function destinations(st: BattleState, unit: UnitState, legal: readonly Action[]): Dest[] {
  const walks: Dest[] = []
  const blinks: Dest[] = []
  for (const action of legal) {
    if (action.type === 'move' && action.unit === unit.id) walks.push({ tile: action.to, move: action })
    else if (action.type === 'useSkill' && action.unit === unit.id && action.tile !== undefined && st.skills[action.skill]?.effects?.replacesMove === true) {
      blinks.push({ tile: action.tile, move: action })
    }
  }
  const order = simOrder(st, unit)
  const rank = (t: Tile) => order.get(tileKey(t)) ?? 999
  walks.sort((a, b) => rank(a.tile) - rank(b.tile))
  blinks.sort((a, b) => a.tile.y - b.tile.y || a.tile.x - b.tile.x)
  const dests: Dest[] = [{ tile: unit.tile, move: null }, ...walks]
  for (const b of blinks) if (!dests.some((d) => sameTile(d.tile, b.tile))) dests.push(b)
  return dests
}

interface Scored {
  readonly score: number
  readonly order: 'mf' | 'af'
  readonly dest: Dest
  readonly candidate: Candidate | null
}

/**
 * sim.py `plan`: the best activation of `unit` from the real state, and its
 * gain over staying put. `legal` is `legalActions(ctx.base)`.
 */
export interface PlanDebug {
  pv: Record<string, number>
  cands: [number, string, string, string][]
}

export function planUnit(ctx: Ctx, unit: UnitState, legal: readonly Action[], debug?: PlanDebug): Plan {
  ctx.beginPlan()
  const st = ctx.base
  const origin = unit.tile
  const dests = destinations(st, unit, legal)
  const pv = new Map<string, number>()
  const key = (t: Tile) => `${t.x},${t.y}`
  const cmdAt = new Map<string, PlannedCommand | null>()
  const c0 = unit.kind === 'tamer' ? commandValue(ctx, st, unit) : NO_COMMAND
  const scored: Scored[] = []
  const validDests: Dest[] = []
  const hideAt = new Map<string, FreeUse>()

  for (const dest of dests) {
    let moved = st
    if (dest.move !== null) {
      const result = applyAction(st, dest.move)
      if (!result.ok) continue
      moved = result.state
    }
    const self = findUnit(moved, unit.id)
    if (self === undefined) continue
    validDests.push(dest)
    let value = posValue(ctx, moved, self)
    if (unit.kind === 'tamer') {
      const cd = commandValue(ctx, moved, self)
      const chosen = c0.value >= cd.value ? { when: 'start' as const, c: c0 } : { when: 'end' as const, c: cd }
      cmdAt.set(key(dest.tile), chosen.c.target === null ? null : { when: chosen.when, target: chosen.c.target, option: chosen.c.option })
      value += Math.max(c0.value, cd.value)
    }
    pv.set(key(dest.tile), value)
    // Free hiding (D-28) after the Move and the Action, whatever they are: 0 without such a skill.
    const hide = freeHide(ctx, moved, self)
    hideAt.set(key(dest.tile), hide)
    scored.push({ score: value + hide.value, order: 'mf', dest, candidate: null })
    for (const c of actionsOf(ctx, moved, self, true, () => value)) scored.push({ score: c.value + value + hide.value, order: 'mf', dest, candidate: c })
  }
  const hideValue = (d: Dest) => hideAt.get(key(d.tile))?.value ?? 0

  const taunter = taunterOf(ctx, st, unit)
  const closest = (list: readonly Dest[]) => {
    if (taunter === undefined || list.length === 0) return list
    const min = Math.min(...list.map((d) => distanceIn(st, d.tile, taunter.tile)))
    return list.filter((d) => distanceIn(st, d.tile, taunter.tile) === min)
  }
  const afDests = closest(validDests)
  let bestDest: Dest | undefined
  const destValue = (d: Dest) => (pv.get(key(d.tile)) ?? -Infinity) + hideValue(d)
  for (const d of afDests) if (bestDest === undefined || destValue(d) > destValue(bestDest)) bestDest = d
  if (bestDest !== undefined) {
    const pvBest = (pv.get(key(bestDest.tile)) ?? 0) + hideValue(bestDest)
    const pvOrigin = pv.get(key(origin)) ?? 0
    for (const c of actionsOf(ctx, st, unit, false, () => pvOrigin)) {
      scored.push({ score: c.value + pvBest, order: 'af', dest: bestDest, candidate: c })
    }
  }

  let pool = scored
  if (taunter !== undefined) {
    const isAttack = (a: Action) => a.type === 'basicAttack' || (a.type === 'useSkill' && st.skills[a.skill]?.attack !== undefined)
    const forced = scored.filter((s) => s.candidate !== null && isAttack(s.candidate.action) && s.candidate.targets.includes(taunter.id))
    if (forced.length > 0) pool = forced
    else {
      const near = new Set(closest(validDests).map((d) => key(d.tile)))
      pool = scored.filter((s) => near.has(key(s.dest.tile)) && (s.candidate === null || !isAttack(s.candidate.action)))
    }
  }

  let best: Scored | undefined
  for (const s of pool) if (best === undefined || s.score > best.score) best = s
  if (taunter === undefined) best = approachPick(ctx, st, unit, scored, validDests, destValue) ?? best
  if (debug !== undefined) {
    for (const [k, v] of pv) debug.pv[k] = v
    debug.cands = [...pool]
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((s) => [Math.round(s.score * 1e4) / 1e4, s.order, key(s.dest.tile), s.candidate === null ? 'none' : debugKey(s.candidate.action)])
  }
  const pvOrigin = pv.get(key(origin)) ?? 0
  if (best === undefined) {
    return { unit: unit.id, order: 'mf', dest: origin, move: null, action: null, retreat: null, command: null, gain: 0 }
  }
  const dest = best.dest
  const free = hideAt.get(key(dest.tile))?.action ?? null
  return {
    unit: unit.id,
    order: best.order,
    dest: dest.tile,
    move: dest.move,
    action: best.candidate?.action ?? null,
    retreat: best.candidate?.retreat ?? null,
    command: unit.kind === 'tamer' ? (cmdAt.get(key(dest.tile)) ?? null) : null,
    ...(free !== null ? { free } : {}),
    gain: best.score - pvOrigin,
  }
}

/**
 * Approach (P1X-36, heuristics.approach): a healthy Monster that can attack
 * nothing this Turn from any tile it can reach, and is still outside its own
 * Threat reach of every enemy, walks to the reachable tile nearest an enemy
 * (ties: the better position value) instead of waiting outside the enemy's
 * reach. Once an enemy is within its Threat reach the usual plan decides.
 * Returns the best Move-then-nothing/utility plan to that tile, or undefined.
 */
function approachPick(
  ctx: Ctx,
  st: BattleState,
  unit: UnitState,
  scored: readonly Scored[],
  dests: readonly Dest[],
  destValue: (d: Dest) => number,
): Scored | undefined {
  const share = ctx.profile.heuristics.approach
  if (share <= 0 || unit.kind !== 'monster' || unit.hp < share * ctx.maxHp(unit)) return undefined
  if (scored.some((s) => s.candidate !== null && s.candidate.targets.length > 0)) return undefined
  const enemies = enemiesOf(st, unit)
  if (enemies.length === 0) return undefined
  const nearest = (t: Tile) => Math.min(...enemies.map((e) => distanceIn(st, t, e.tile)))
  if (nearest(unit.tile) <= threatReach(st, unit)) return undefined
  let target: Dest | undefined
  for (const d of dests) {
    if (target === undefined) target = d
    else {
      const dd = nearest(d.tile) - nearest(target.tile)
      if (dd < 0 || (dd === 0 && destValue(d) > destValue(target))) target = d
    }
  }
  if (target === undefined || nearest(target.tile) >= nearest(unit.tile)) return undefined
  let best: Scored | undefined
  for (const s of scored) if (s.order === 'mf' && sameTile(s.dest.tile, target.tile) && (best === undefined || s.score > best.score)) best = s
  return best
}

function debugKey(action: Action): string {
  switch (action.type) {
    case 'basicAttack':
      return `basic_attack>${action.target}`
    case 'useSkill':
      if (action.targets !== undefined) return `${action.skill}@${action.tile?.x},${action.tile?.y}>${[...action.targets].sort().join('+')}`
      if (action.element !== undefined) return `${action.skill}@${action.tile?.x},${action.tile?.y}:${action.element}`
      return action.target !== undefined ? `${action.skill}>${action.target}` : action.skill
    default:
      return action.type
  }
}
