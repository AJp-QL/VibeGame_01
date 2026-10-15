/**
 * The Tamer's basic skills (rules §15.2, §15.4). Command is not a skill
 * (rules §15.3): it is its own action, in command.ts.
 *
 * - Cover: Major, an allied Monster at distance 1 when used (`allyMonster`,
 *   generic targeting). Until the start of the Tamer's side's next Turn,
 *   damage that Monster would take (worked out in full) comes off the
 *   Tamer's HP instead (`coveredBy` on the Monster, read where `attackOnce`
 *   takes HP off). No need to stay adjacent; only damage moves: the attack
 *   roll is still against the Monster's Guard/Ward and statuses, pushes and
 *   Counter still happen to the Monster (D-21). Bleed is not an attack and is
 *   not covered (§17.4). Using it again on the same Monster starts it again.
 * - Attune: Major, any tile at distance 1 (empty or not) becomes one of the 6
 *   elements (not "normal") for 3 Turns counted like a status on the user's
 *   side (D-02, D-20), then goes back to the Board's terrain. Attuning a tile
 *   again (either side) replaces element, duration and the side that counts.
 *   `state.terrain` holds the terrain now, so terrain advantage, Aquatic and
 *   forest checks see the change at once; `state.attuned` holds what comes back.
 * - First Aid: Major, an ally at distance ≤ 1 or the Tamer itself (`ally`):
 *   heal max(0, 1d8 + SPI mod) (D-26), HP capped at the maximum. Healing
 *   never takes damage back off the totals (rules §19.2). No Inspiration (§18).
 * - Distract: Minor, range 3, enemy (rules §8.1: line of sight, Hidden), save
 *   SPI against the SPI Save DC → Off-balance (GENERIC). Off-balance gives the
 *   holder's next attack roll disadvantage and ends after it (rollMode.ts,
 *   `spendAttackRoll` in combat.ts), across Turns if need be.
 */
import { BOARD_SIZE, ELEMENTS, isOnBoard, sameTile, tileName, type Dice, type Element, type Side, type Terrain, type Tile } from '@mt/shared'
import type { BattleEvent, RejectionCode } from './battle.ts'
import { derive, statMod } from './derived.ts'
import { rollDice } from './dice.ts'
import { distance } from './movement.ts'
import { emit } from './resolution.ts'
import { GENERIC, type SkillHandler, type SkillHandlers, type SkillResolution, type SkillUse } from './skillHandler.ts'
import type { UseSkillAction } from './skills.ts'
import { findUnit, replaceUnit, type AttunedTile, type BattleState, type UnitId } from './state.ts'

const rejection = (code: RejectionCode, message: string) => ({ code, message })

// ------------------------------------------------------------------ Cover

const COVER: SkillHandler = {
  *resolve(state: BattleState, use: SkillUse): SkillResolution {
    const target = use.targets[0]
    const monster = target === undefined ? undefined : findUnit(state, target.id)
    if (monster === undefined) throw new Error('Cover without a target passed its checks')
    const refreshed = monster.coveredBy !== undefined
    yield* emit({ type: 'coverApplied', unit: monster.id, by: use.user.id, ...(refreshed ? { refreshed: true as const } : {}) })
    return replaceUnit(state, { ...monster, coveredBy: use.user.id })
  },
}

/**
 * Start of a Turn of `side`, step 2 (rules §17.4): Cover on its Units ends
 * (it lasts until the start of the Tamer's side's next Turn), in Unit order.
 */
export function endCovers(state: BattleState, side: Side): { state: BattleState; events: BattleEvent[] } {
  const events: BattleEvent[] = []
  const units = state.units.map((unit) => {
    if (unit.side !== side || unit.coveredBy === undefined) return unit
    events.push({ type: 'coverEnded', unit: unit.id, by: unit.coveredBy })
    const { coveredBy: _ended, ...rest } = unit
    return rest
  })
  return { state: events.length === 0 ? state : { ...state, units }, events }
}

// ----------------------------------------------------------------- Attune

/** What Attune would do to a tile (rules §15.4). */
export interface TerrainPreview {
  readonly type: 'terrain'
  readonly skill: string
  readonly user: UnitId
  readonly tile: Tile
  /** The terrain now. */
  readonly from: Terrain
  readonly to: Element
  /** Ends of Turns of the user's side it lasts after the current one (D-02, D-20). */
  readonly turns: number
  /** The Board's own terrain, which comes back when it ends. */
  readonly original: Terrain
}

function boardTiles(): Tile[] {
  const tiles: Tile[] = []
  for (let y = 0; y < BOARD_SIZE; y++) for (let x = 0; x < BOARD_SIZE; x++) tiles.push({ x, y })
  return tiles
}

function withTerrain(state: BattleState, tile: Tile, terrain: Terrain): BattleState['terrain'] {
  return state.terrain.map((row, y) => (y === tile.y ? row.map((t, x) => (x === tile.x ? terrain : t)) : row))
}

/** The Board's own terrain under any Attune (rules §4.3). */
function originalTerrain(state: BattleState, tile: Tile): Terrain {
  return state.attuned.find((a) => sameTile(a.tile, tile))?.original ?? state.terrain[tile.y]?.[tile.x] ?? 'normal'
}

const readingOrder = (a: AttunedTile, b: AttunedTile) => a.tile.y - b.tile.y || a.tile.x - b.tile.x

function terrainTurns(use: SkillUse): number {
  const turns = use.skill.effects?.terrainTurns
  if (turns === undefined) throw new Error(`${use.skill.name} has no effects.terrainTurns`)
  return turns
}

const ATTUNE: SkillHandler = {
  targets(state, user, skill, action) {
    const { tile, element } = action
    if (tile === undefined || element === undefined || action.target !== undefined || action.targets !== undefined) {
      return rejection('invalid-target', `${skill.name} needs a tile and an element`)
    }
    if (!(ELEMENTS as readonly string[]).includes(element)) {
      return rejection('invalid-target', `${skill.name} makes a tile one of ${ELEMENTS.join(', ')}, not "${String(element)}"`)
    }
    if (!isOnBoard(tile)) return rejection('off-board', `(${tile.x}, ${tile.y}) is not on the Board`)
    const d = distance(user.tile, tile)
    if (d < 1 || d > skill.range) {
      return rejection('out-of-range', `${tileName(tile)} is ${d} tiles away; ${skill.name} reaches a tile next to ${user.id}`)
    }
    return []
  },

  // Every adjacent tile in reading order, then each of the 6 elements.
  uses(_state, user, skill) {
    const uses: UseSkillAction[] = []
    for (const tile of boardTiles().filter((t) => distance(user.tile, t) === 1)) {
      for (const element of ELEMENTS) uses.push({ type: 'useSkill', unit: user.id, skill: skill.id, tile, element })
    }
    return uses
  },

  *resolve(state: BattleState, use: SkillUse): SkillResolution {
    const { tile, element } = use.action
    if (tile === undefined || element === undefined) throw new Error('Attune without a tile passed its checks')
    const turns = terrainTurns(use)
    const from = state.terrain[tile.y]?.[tile.x] ?? 'normal'
    const entry: AttunedTile = {
      tile,
      terrain: element,
      original: originalTerrain(state, tile),
      side: use.user.side,
      by: use.user.id,
      turnsLeft: turns,
      // D-02, D-20: made during the user's own side's Turn, so the end of this Turn does not count.
      ...(state.sideToAct === use.user.side ? { skipCountdown: true as const } : {}),
    }
    yield* emit({ type: 'terrainChanged', unit: use.user.id, skill: use.skill.id, tile, from, to: element, turnsLeft: turns })
    // Rules §8.2: Hidden on the changed tile is checked at once, after every skill (skills.ts).
    return {
      ...state,
      terrain: withTerrain(state, tile, element),
      attuned: [...state.attuned.filter((a) => !sameTile(a.tile, tile)), entry].sort(readingOrder),
    }
  },

  preview(state, use): TerrainPreview {
    const { tile, element } = use.action
    if (tile === undefined || element === undefined) throw new Error('Attune without a tile passed its checks')
    return {
      type: 'terrain',
      skill: use.skill.id,
      user: use.user.id,
      tile,
      from: state.terrain[tile.y]?.[tile.x] ?? 'normal',
      to: element,
      turns: terrainTurns(use),
      original: originalTerrain(state, tile),
    }
  },
}

/**
 * End of a Turn of `side`, step 2 (rules §17.4): tiles `side` attuned count
 * down like a status (D-02: not the end of the Turn they were made in); at 0
 * a tile goes back to the Board's terrain.
 */
export function countDownAttunedTiles(state: BattleState, side: Side): { state: BattleState; events: BattleEvent[] } {
  if (!state.attuned.some((a) => a.side === side)) return { state, events: [] }
  const events: BattleEvent[] = []
  let terrain = state.terrain
  const attuned: AttunedTile[] = []
  for (const entry of state.attuned) {
    if (entry.side !== side) {
      attuned.push(entry)
    } else if (entry.skipCountdown) {
      const { skipCountdown: _skipped, ...rest } = entry
      attuned.push(rest)
    } else if (entry.turnsLeft > 1) {
      attuned.push({ ...entry, turnsLeft: entry.turnsLeft - 1 })
    } else {
      terrain = withTerrain({ ...state, terrain }, entry.tile, entry.original)
      events.push({ type: 'terrainReverted', tile: entry.tile, from: entry.terrain, to: entry.original })
    }
  }
  return { state: { ...state, terrain, attuned }, events }
}

// -------------------------------------------------------------- First Aid

/** First Aid's heal (rules §15.4): the range it can give and the HP it lands on. */
export interface HealPreview {
  readonly type: 'heal'
  readonly skill: string
  readonly user: UnitId
  readonly target: UnitId
  readonly dice: Dice
  /** The user's mod of the heal's stat (SPI). */
  readonly modifier: number
  /** max(0, dice + modifier) at the lowest and highest roll (D-26), before the HP cap. */
  readonly min: number
  readonly max: number
  readonly hp: number
  readonly maxHp: number
}

function healOf(use: SkillUse): { dice: Dice; modifier: number } {
  const heal = use.skill.effects?.heal
  if (heal === undefined) throw new Error(`${use.skill.name} has no effects.heal`)
  return { dice: heal.dice, modifier: statMod(use.user.stats[heal.stat]) }
}

const FIRST_AID: SkillHandler = {
  *resolve(state: BattleState, use: SkillUse): SkillResolution {
    const target = findUnit(state, use.targets[0]?.id ?? '')
    if (target === undefined) throw new Error('First Aid without a target passed its checks')
    const { dice, modifier } = healOf(use)
    const rolled = rollDice(state.dice, dice.count, dice.sides)
    const amount = Math.max(0, rolled.rolls.reduce((sum, roll) => sum + roll, 0) + modifier)
    const hpAfter = Math.min(derive(target).maxHp, target.hp + amount)
    yield* emit({
      type: 'healed',
      source: use.user.id,
      target: target.id,
      skill: use.skill.id,
      dice,
      rolls: rolled.rolls,
      modifier,
      amount,
      hpBefore: target.hp,
      hpAfter,
    })
    // Healing is not damage: the damage totals (rules §19.2) stay as they are.
    return replaceUnit({ ...state, dice: rolled.stream }, { ...target, hp: hpAfter })
  },

  preview(_state, use): HealPreview {
    const target = use.targets[0]
    if (target === undefined) throw new Error('First Aid without a target passed its checks')
    const { dice, modifier } = healOf(use)
    return {
      type: 'heal',
      skill: use.skill.id,
      user: use.user.id,
      target: target.id,
      dice,
      modifier,
      min: Math.max(0, dice.count + modifier),
      max: Math.max(0, dice.count * dice.sides + modifier),
      hp: target.hp,
      maxHp: derive(target).maxHp,
    }
  },
}

export const TAMER_SKILLS: SkillHandlers = {
  cover: COVER,
  attune: ATTUNE,
  first_aid: FIRST_AID,
  distract: GENERIC,
}
