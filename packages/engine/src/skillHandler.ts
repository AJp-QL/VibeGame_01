/**
 * How a loadout skill plugs into the engine (rules §13, §15).
 *
 * Every number of a skill is data (data/skills). Most skills need no code of
 * their own: the generic path in skills.ts targets by `skill.target`, makes
 * an attack roll per target when `skill.attack` is set (damage, then
 * `skill.applies` on a hit, with saves), or gives `skill.applies` outright
 * (with a save when the application has one), books the Action (or the Move
 * for `effects.replacesMove`) and the cooldown, and offers Hit and Run's step
 * for `effects.retreat`.
 *
 * The engine only offers a skill that has a handler registered in one of
 * the per-owner files (fangrelSkills.ts, tidewallSkills.ts,
 * wisplingSkills.ts, quillfoxSkills.ts, tamerSkills.ts). A handler is `{}`
 * (GENERIC) when data says it all; otherwise it overrides one step:
 *
 * - `targets`: aim at something the generic kinds do not cover (Burst's
 *   centre and chosen enemies, Blink's or Attune's tile). Required for
 *   `tile` and `area` skills.
 * - `check`: an extra condition (Camouflage only on forest).
 * - `uses`: the ways to use it now, for legalActions, when the generic list
 *   (one action per possible target) does not fit (tiles, ordered targets).
 * - `resolve`: what happens, replacing the generic resolution (Blink,
 *   Attune, First Aid). Activation, the Action/Move and the cooldown are
 *   already booked in the state it receives. It is a generator (see
 *   resolution.ts): `yield* emit(...)` its events, `yield* attackOnce(...)`
 *   for each attack and `yield* giveSkillStatuses(...)` for statuses, and
 *   roll any other d20 Inspiration may reroll with `yield* rollD20(...)`, so
 *   the Inspiration decision comes for free. Damage and other dice use
 *   `rollDice` and are never offered.
 * - `preview`: the odds, replacing the generic preview.
 */
import type { Skill } from '@mt/shared'
import type { ActionPreview, Rejection } from './battle.ts'
import type { Resolution } from './resolution.ts'
import type { UseSkillAction } from './skills.ts'
import type { BattleState, UnitState } from './state.ts'

/** A skill use that passed the generic checks. */
export interface SkillUse {
  readonly action: UseSkillAction
  readonly user: UnitState
  readonly skill: Skill
  /** The Units it lands on, in resolution order (empty for tile skills). */
  readonly targets: readonly UnitState[]
}

/** A skill's resolution: yields its events (and Inspiration decisions), returns the state after it. */
export type SkillResolution = Resolution<BattleState>

export interface SkillHandler {
  readonly targets?: (state: BattleState, user: UnitState, skill: Skill, action: UseSkillAction) => readonly UnitState[] | Rejection
  readonly check?: (state: BattleState, use: SkillUse) => Rejection | null
  readonly uses?: (state: BattleState, user: UnitState, skill: Skill) => readonly UseSkillAction[]
  readonly resolve?: (state: BattleState, use: SkillUse) => SkillResolution
  readonly preview?: (state: BattleState, use: SkillUse) => ActionPreview
}

/** Skill handlers by skill id. */
export type SkillHandlers = Readonly<Record<string, SkillHandler>>

/** Data says it all: generic targeting, resolution and preview. */
export const GENERIC: SkillHandler = {}
