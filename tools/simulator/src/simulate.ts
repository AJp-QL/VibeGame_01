/**
 * Headless Battles: the game's engine and AI on both sides, many Dice Seeds,
 * one summary per Battle (`GameRecord`) and the totals (`Metrics`) with the
 * same metric set as prototype/simulation/sim.py v4 `aggregate`.
 */
import { applyAction, createBattle, decidingSide, type Action, type BattleEvent, type BattleState } from '@mt/engine'
import { chooseAction, createAi, type AiProfile, type AiState } from '@mt/ai'
import type { VariantRules } from '@mt/engine'
import type { GameData, Side } from '@mt/shared'

/** Name of what a Unit is: "Tamer" or the species name ("Tidewall"). */
export type UnitKind = string

/** What one Battle came to. Counts are per Battle. */
export interface GameRecord {
  readonly seed: string
  /** `null`: draw at the turn limit. */
  readonly winner: Side | null
  readonly cause: 'tamerDown' | 'monstersDown' | 'turnLimit'
  readonly firstSide: Side
  readonly turns: Readonly<Record<Side, number>>
  readonly round: number
  /** Kind of the first Unit to fall, `null` if none fell. */
  readonly firstDown: UnitKind | null
  /** Tamers that fell, by side. */
  readonly tamerDown: Readonly<Record<Side, boolean>>
  /** Attack damage by the attacker's kind, each hit capped at the HP the target had (sim.py `dmg_by`). */
  readonly damageBy: Readonly<Record<UnitKind, number>>
  /** Damage totals of each side as the turn limit counts them (rules §19.2, Bleed included). */
  readonly damageBySide: Readonly<Record<Side, number>>
  /** Attack rolls by attacker kind (after Inspiration) and how many hit. */
  readonly attacks: Readonly<Record<UnitKind, { readonly n: number; readonly hit: number }>>
  /** Attack hits landed on each kind (counterattacks and Mark included). */
  readonly hitsTaken: Readonly<Record<UnitKind, number>>
  /** Attack hits landed on a Tamer. */
  readonly tamerHits: number
  /** Shield Bash pushes that moved the target. */
  readonly pushes: number
  /** Actions taken by name (skill names, "Command (advantage)", "(Counter triggered)"). */
  readonly skills: Readonly<Record<string, number>>
  /**
   * Turns (either side) that were over before the Turn of the first attack roll
   * of the Battle: 0 when it comes in the very first Turn (phase 1.x ticket 08).
   * A Battle with no attack roll at all counts every Turn it had.
   */
  readonly turnsBeforeFirstAttack: number
}

export interface Matchup {
  readonly scenario: string
  readonly board: string
  readonly profiles: Readonly<Record<Side, AiProfile>>
  /** Experiment switches of the engine (phase 1.x ticket 08); absent = the game's rules. */
  readonly variantRules?: VariantRules
}

const MASK64 = (1n << 64n) - 1n
const GOLDEN = 0x9e3779b97f4a7c15n

/** Dice Seed of Battle `index` (0-based) from the base seed: base + (index + 1) × golden ratio, mod 2^64, as 16 hex digits. */
export function gameSeed(base: string, index: number): string {
  if (!/^[0-9a-fA-F]{1,16}$/.test(base)) throw new Error(`Dice Seed must be 1–16 hex digits, got "${base}"`)
  return ((BigInt(`0x${base}`) + BigInt(index + 1) * GOLDEN) & MASK64).toString(16).padStart(16, '0')
}

/** Unit id → kind, from the Scenario (`A.tamer`, `A.m1`, …). */
export function unitKinds(data: GameData, scenarioId: string): Map<string, UnitKind> {
  const scenario = data.scenarios[scenarioId]
  if (scenario === undefined) throw new Error(`Unknown scenario "${scenarioId}"`)
  const kinds = new Map<string, UnitKind>()
  for (const side of ['A', 'B'] as const) {
    kinds.set(`${side}.tamer`, 'Tamer')
    scenario.teams[side].monsters.forEach((m, i) => kinds.set(`${side}.m${i + 1}`, data.species[m.species]?.name ?? m.species))
  }
  return kinds
}

export interface PlayedBattle {
  readonly final: BattleState
  readonly actions: readonly Action[]
  readonly events: readonly BattleEvent[]
}

/** One Battle, AI on both sides, from deployment to the end. */
export function playBattle(data: GameData, matchup: Matchup, seed: string, maxActions = 5000): PlayedBattle {
  const scenario = data.scenarios[matchup.scenario]
  const board = data.boards[matchup.board]
  if (scenario === undefined) throw new Error(`Unknown scenario "${matchup.scenario}"`)
  if (board === undefined) throw new Error(`Unknown board "${matchup.board}"`)
  let state = createBattle({
    scenario,
    board,
    species: data.species,
    skills: data.skills,
    statuses: data.statuses,
    elementWheel: data.elementWheel,
    dice: { seed },
    ...(matchup.variantRules === undefined ? {} : { variantRules: matchup.variantRules }),
  })
  const ais: Record<Side, AiState> = {
    A: createAi(state, 'A', matchup.profiles.A),
    B: createAi(state, 'B', matchup.profiles.B),
  }
  const actions: Action[] = []
  const events: BattleEvent[] = []
  while (state.outcome === null) {
    if (actions.length >= maxActions) throw new Error(`No outcome after ${maxActions} actions (seed ${seed})`)
    const side = decidingSide(state)
    const choice = chooseAction(state, ais[side])
    ais[side] = choice.ai
    const result = applyAction(state, choice.action)
    if (!result.ok) throw new Error(`AI action rejected (seed ${seed}): ${JSON.stringify(choice.action)}: ${result.rejection.message}`)
    actions.push(choice.action)
    events.push(...result.events)
    state = result.state
  }
  return { final: state, actions, events }
}

/** What `summarizeBattle` needs of the final state. */
export interface BattleEnd {
  readonly outcome: BattleState['outcome']
  readonly turnNumber: Readonly<Record<Side, number>>
  readonly round: number
  readonly damageDealt: Readonly<Record<Side, number>>
}

const add = (rec: Record<string, number>, key: string, by = 1) => {
  rec[key] = (rec[key] ?? 0) + by
}

/** Reduce one Battle's actions and events to its `GameRecord`. Pure: hand-made events work too. */
export function summarizeBattle(
  seed: string,
  kinds: ReadonlyMap<string, UnitKind>,
  skillNames: Readonly<Record<string, { readonly name: string }>>,
  end: BattleEnd,
  actions: readonly Action[],
  events: readonly BattleEvent[],
): GameRecord {
  if (end.outcome === null) throw new Error('Battle not over')
  const kindOf = (id: string) => kinds.get(id) ?? id
  const skillName = (id: string) => skillNames[id]?.name ?? id
  const damageBy: Record<string, number> = {}
  const attackN: Record<string, number> = {}
  const attackHit: Record<string, number> = {}
  const hitsTaken: Record<string, number> = {}
  const skills: Record<string, number> = {}
  let firstSide: Side | null = null
  let firstDown: UnitKind | null = null
  const tamerDown = { A: false, B: false }
  let tamerHits = 0
  let pushes = 0
  let turnsStarted = 0
  let turnsBeforeFirstAttack: number | null = null
  // Attack rolls: an Inspiration reroll replaces the roll it rerolled.
  const rolls: Extract<BattleEvent, { type: 'attackRolled' }>[] = []
  for (const e of events) {
    switch (e.type) {
      case 'initiativeDecided':
        firstSide = e.firstSide
        break
      case 'turnStarted':
        turnsStarted++
        break
      case 'attackRolled':
        turnsBeforeFirstAttack ??= Math.max(0, turnsStarted - 1)
        if (e.rerolled === true) rolls.pop()
        rolls.push(e)
        break
      case 'damageDealt':
        add(damageBy, kindOf(e.source), Math.max(1, Math.min(e.amount, e.hpBefore)))
        break
      case 'unitDown':
        firstDown ??= kindOf(e.unit)
        if (e.unit.endsWith('.tamer')) tamerDown[e.unit.startsWith('A') ? 'A' : 'B'] = true
        break
      case 'unitPushed':
        pushes++
        break
      case 'counterattack':
        add(skills, '(Counter triggered)')
        break
    }
  }
  for (const r of rolls) {
    const attacker = kindOf(r.attacker)
    add(attackN, attacker)
    if (!r.hit) continue
    add(attackHit, attacker)
    add(hitsTaken, kindOf(r.target))
    if (r.target.endsWith('.tamer')) tamerHits++
  }
  for (const a of actions) {
    if (a.type === 'basicAttack') add(skills, skillName('basic_attack'))
    else if (a.type === 'defend') add(skills, skillName('defend'))
    else if (a.type === 'useSkill') add(skills, skillName(a.skill))
    else if (a.type === 'command') add(skills, `Command (${a.option})`)
  }
  const attacks: Record<string, { n: number; hit: number }> = {}
  for (const k of Object.keys(attackN)) attacks[k] = { n: attackN[k] ?? 0, hit: attackHit[k] ?? 0 }
  if (firstSide === null) throw new Error('no initiative in events')
  return {
    seed,
    winner: end.outcome.winner,
    cause: end.outcome.cause as GameRecord['cause'],
    firstSide,
    turns: { A: end.turnNumber.A, B: end.turnNumber.B },
    round: end.round,
    firstDown,
    tamerDown,
    damageBy,
    damageBySide: { A: end.damageDealt.A, B: end.damageDealt.B },
    attacks,
    hitsTaken,
    tamerHits,
    pushes,
    skills,
    turnsBeforeFirstAttack: turnsBeforeFirstAttack ?? turnsStarted,
  }
}

/** Play `games` Battles with seeds `gameSeed(baseSeed, i)`. */
export function simulateGames(data: GameData, matchup: Matchup, games: number, baseSeed: string): GameRecord[] {
  const kinds = unitKinds(data, matchup.scenario)
  const records: GameRecord[] = []
  for (let i = 0; i < games; i++) {
    const seed = gameSeed(baseSeed, i)
    const played = playBattle(data, matchup, seed)
    records.push(summarizeBattle(seed, kinds, data.skills, played.final, played.actions, played.events))
  }
  return records
}
