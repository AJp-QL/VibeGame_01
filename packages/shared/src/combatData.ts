/**
 * Schemas for the data that drives combat: skills (data/skills), statuses
 * (data/statuses) and the element wheel (data/elements). Every number of a
 * skill or status lives here as data (spec user story 3); the engine supplies
 * the behaviour, keyed by the fields below.
 *
 * Fields marked "engine: ticket NN" are already in the data so that the
 * tickets for Tidewall (08), Wispling (09), Quillfox (10) and the Tamer (11)
 * do not need to change these schemas; until that ticket lands, the engine
 * does not use the field and does not offer the skill.
 */
import * as z from 'zod'
import { ELEMENTS, ID, STATS, type Element, type Stat, type Terrain } from './model.ts'

// -------------------------------------------------------------------- dice

/** `count` dice with `sides` faces, e.g. 2d6 = { count: 2, sides: 6 }. */
export interface Dice {
  readonly count: number
  readonly sides: number
}

export const DiceSchema = z.strictObject({
  count: z.int().min(1).max(10),
  sides: z.int().min(2).max(20),
})

// ------------------------------------------------------------------ skills

/** Skill tier (rules §13.1): Minor any Turn, Major cooldown, Signature once per Battle, Passive never used. */
export const SKILL_TIERS = ['minor', 'major', 'signature', 'passive'] as const
export type SkillTier = (typeof SKILL_TIERS)[number]

/** Physical attacks roll against Guard, elemental ones against Ward (rules §10.1). */
export const ATTACK_KINDS = ['physical', 'elemental'] as const
export type AttackKind = (typeof ATTACK_KINDS)[number]

/**
 * What a skill is aimed at (rules §15):
 * - `enemy`: one enemy at distance 1 to `range` (rules §8.1).
 * - `self`: the user only.
 * - `selfAndAllies`: the user and every ally within `range`, Tamer included (Pack Howl, D-19).
 * - `ally`: one ally within `range`, the user included (First Aid).
 * - `allyMonster`: one allied Monster within `range`, not the user (Cover).
 * - `tile`: one tile within `range` (Blink, Attune).
 * - `area`: a centre tile within `range` and up to `area.maxTargets` enemies around it (Burst).
 * - `none`: Passive, never used.
 */
export const SKILL_TARGETS = ['enemy', 'self', 'selfAndAllies', 'ally', 'allyMonster', 'tile', 'area', 'none'] as const
export type SkillTarget = (typeof SKILL_TARGETS)[number]

/** A status a skill gives: on a hit for attack skills, on a failed save, or outright. */
export interface StatusApplication {
  readonly status: string
  /** The stat the target saves with (rules §11); absent = no save. */
  readonly save?: Stat
  /** Guarded: the Guard and Ward bonus from this source (Defend +2, rules §12). */
  readonly bonus?: number
}

/** First Aid: heal dice + the user's mod of `stat` (rules §15.4). */
export interface Heal {
  readonly dice: Dice
  readonly stat: Stat
}

/** What a skill does beyond rolling, damage and statuses. */
export interface SkillEffects {
  /** Hit and Run: after the attack, a free step of this many tiles, hit or miss (rules §15.1, D-12). */
  readonly retreat?: number
  /** Shield Bash: on a hit, push the target this many tiles (rules §6.4). Engine: ticket 08. */
  readonly push?: number
  /** Pincer Guard (Passive): counterattack dice instead of Countering's own (rules §15.1). Engine: ticket 08. */
  readonly counterattackDamage?: Dice
  /** Blink: used instead of Move, not as the Action (rules §15.1, D-13). Engine: ticket 09. */
  readonly replacesMove?: boolean
  /** Camouflage: usable only while the user stands on this terrain (D-18). Engine: ticket 10. */
  readonly requiresTerrain?: Terrain
  /** Cover: damage the target takes goes to the user until the user's next Turn (rules §15.4). Engine: ticket 11. */
  readonly cover?: boolean
  /** Attune: the tile becomes the chosen element for this many Turns (rules §15.4). Engine: ticket 11. */
  readonly terrainTurns?: number
  /** First Aid (rules §15.4). Engine: ticket 11. */
  readonly heal?: Heal
}

export interface Skill {
  readonly id: string
  readonly name: string
  readonly tier: SkillTier
  readonly target: SkillTarget
  /** Reach in tiles (rules §2.3); 0 for `self` and `none`. */
  readonly range: number
  /** Present when the skill makes an attack roll against each target (rules §10). */
  readonly attack?: AttackKind
  /** Damage dice on a hit; absent for attacks without damage (Mark). */
  readonly damage?: Dice
  /** Dice a Tamer rolls instead, when different (Basic Attack: 1d6, rules §10.3). */
  readonly tamerDamage?: Dice
  /** `area` skills: tiles around the centre and how many enemies may be chosen (Burst: 1 and 2). */
  readonly area?: { readonly radius: number; readonly maxTargets: number }
  /** Stat of the user's Save DC = 8 + proficiency + mod (rules §3.2, D-07). Needed when a status has a save. */
  readonly dcStat?: Stat
  /** Statuses the skill gives, in order. */
  readonly applies?: readonly StatusApplication[]
  readonly effects?: SkillEffects
}

const StatSchema = z.enum(STATS)
const ElementOrNormal = z.enum([...ELEMENTS, 'normal'])

const StatusApplicationSchema = z.strictObject({
  status: ID,
  save: StatSchema.exactOptional(),
  bonus: z.int().min(1).max(10).exactOptional(),
})

const SkillEffectsSchema = z.strictObject({
  retreat: z.int().min(1).max(3).exactOptional(),
  push: z.int().min(1).max(3).exactOptional(),
  counterattackDamage: DiceSchema.exactOptional(),
  replacesMove: z.literal(true).exactOptional(),
  requiresTerrain: ElementOrNormal.exactOptional(),
  cover: z.literal(true).exactOptional(),
  terrainTurns: z.int().min(1).max(10).exactOptional(),
  heal: z.strictObject({ dice: DiceSchema, stat: StatSchema }).exactOptional(),
})

/** Rules that tie a skill's fields together, so a skill cannot ask for something it cannot do. */
function checkSkill(skill: z.output<typeof SkillObject>, ctx: z.RefinementCtx): void {
  const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
  const selfOnly = skill.target === 'self' || skill.target === 'none'
  if (selfOnly && skill.range !== 0) issue('range', `a "${skill.target}" skill has range 0`)
  if (!selfOnly && skill.target !== 'area' && skill.range < 1) issue('range', 'range must be at least 1')
  if ((skill.tier === 'passive') !== (skill.target === 'none')) {
    issue('target', 'a Passive skill has target "none", and only a Passive skill does')
  }
  if (skill.attack !== undefined && skill.target !== 'enemy' && skill.target !== 'area') {
    issue('attack', 'only "enemy" and "area" skills make attack rolls')
  }
  if (skill.damage !== undefined && skill.attack === undefined) issue('damage', 'damage needs an attack roll')
  if (skill.tamerDamage !== undefined && skill.damage === undefined) issue('tamerDamage', 'tamerDamage needs damage')
  if ((skill.area !== undefined) !== (skill.target === 'area')) {
    issue('area', 'an "area" skill needs area, and only an "area" skill has it')
  }
  const saves = (skill.applies ?? []).some((a) => a.save !== undefined)
  if (saves && skill.dcStat === undefined) issue('dcStat', 'a status with a save needs the Save DC stat')
  if (!saves && skill.dcStat !== undefined) issue('dcStat', 'dcStat is only for skills whose statuses have a save')
}

const SkillObject = z.strictObject({
  id: ID,
  name: z.string().min(1),
  tier: z.enum(SKILL_TIERS),
  target: z.enum(SKILL_TARGETS),
  range: z.int().min(0).max(6),
  attack: z.enum(ATTACK_KINDS).exactOptional(),
  damage: DiceSchema.exactOptional(),
  tamerDamage: DiceSchema.exactOptional(),
  area: z.strictObject({ radius: z.int().min(1).max(3), maxTargets: z.int().min(1).max(8) }).exactOptional(),
  dcStat: StatSchema.exactOptional(),
  applies: z.array(StatusApplicationSchema).min(1).exactOptional(),
  effects: SkillEffectsSchema.exactOptional(),
})

export const SkillSchema: z.ZodType<Skill> = SkillObject.superRefine(checkSkill)

// ---------------------------------------------------------------- statuses

/**
 * How long a status lasts (rules §14.1):
 * - `turns`: counts down by 1 each time the holder's side ends a Turn and ends at 0;
 *   given during the holder's own side's Turn, the end of that Turn does not count (D-02).
 * - `untilOwnTurnStart`: ends at the start of the holder's side's next Turn, before Bleed ticks.
 * - `untilAttackRoll`: ends after the holder's next attack roll (Off-balance). Engine: ticket 11.
 * - `untilBroken`: ends only by its own conditions (Hidden). Engine: ticket 10.
 */
export type StatusDuration =
  | { readonly kind: 'turns'; readonly turns: number }
  | { readonly kind: 'untilOwnTurnStart' }
  | { readonly kind: 'untilAttackRoll' }
  | { readonly kind: 'untilBroken' }

/** What a status does (rules §14.2). */
export interface StatusEffects {
  /** Bleed: HP lost at the start of each Turn of the holder's side (rules §17.4). */
  readonly startOfTurnDamage?: Dice
  /** Rallied: added to every attack roll of the holder (rules §10.2). */
  readonly attackRoll?: number
  /** Guarded: Guard and Ward + the bonus its source gave (rules §12). */
  readonly defenceFromSource?: boolean
  /** Pin: movement range 0, the Hit and Run step included; still pushed (rules §14.2). */
  readonly immobile?: boolean
  /** Weakened: added to every damage the holder deals, minimum 1 (rules §10.3). Engine: ticket 09. */
  readonly damageDealt?: number
  /** Marked: every attacker gets this on attack rolls against the holder (rules §5.1). Engine: ticket 10. */
  readonly attackersRollMode?: 'advantage'
  /** Off-balance: the holder's next attack roll (rules §14.2). Engine: ticket 11. */
  readonly nextAttackRollMode?: 'disadvantage'
  /** Hidden: enemies cannot target the holder from this distance or more (rules §8.2). Engine: ticket 10. */
  readonly untargetableFrom?: number
  /** Taunted: must attack (or close in on) the Unit that applied it (rules §14.3). Engine: ticket 08. */
  readonly forcedToAttackSource?: boolean
  /** Countering: counterattack dice when attacked from distance 1 (rules §14.2). Engine: ticket 08. */
  readonly counterattack?: Dice
}

export const STATUS_POLARITIES = ['positive', 'negative'] as const
export type StatusPolarity = (typeof STATUS_POLARITIES)[number]

/**
 * Reapplying a status (rules §14.1): `reset` starts it again at full duration
 * (and from the newest source); `keepHigher` keeps whichever bonus is higher (Guarded, rules §12).
 */
export const STATUS_STACKING = ['reset', 'keepHigher'] as const
export type StatusStacking = (typeof STATUS_STACKING)[number]

export interface StatusType {
  readonly id: string
  readonly name: string
  readonly polarity: StatusPolarity
  readonly duration: StatusDuration
  readonly stacking: StatusStacking
  /** Remember the Unit that applied it (Taunted: the taunter). */
  readonly tracksSource?: boolean
  readonly effects: StatusEffects
}

const StatusDurationSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('turns'), turns: z.int().min(1).max(10) }),
  z.strictObject({ kind: z.literal('untilOwnTurnStart') }),
  z.strictObject({ kind: z.literal('untilAttackRoll') }),
  z.strictObject({ kind: z.literal('untilBroken') }),
])

const StatusEffectsSchema = z.strictObject({
  startOfTurnDamage: DiceSchema.exactOptional(),
  attackRoll: z.int().min(-10).max(10).exactOptional(),
  defenceFromSource: z.literal(true).exactOptional(),
  immobile: z.literal(true).exactOptional(),
  damageDealt: z.int().min(-10).max(10).exactOptional(),
  attackersRollMode: z.literal('advantage').exactOptional(),
  nextAttackRollMode: z.literal('disadvantage').exactOptional(),
  untargetableFrom: z.int().min(1).max(6).exactOptional(),
  forcedToAttackSource: z.literal(true).exactOptional(),
  counterattack: DiceSchema.exactOptional(),
})

export const StatusTypeSchema: z.ZodType<StatusType> = z.strictObject({
  id: ID,
  name: z.string().min(1),
  polarity: z.enum(STATUS_POLARITIES),
  duration: StatusDurationSchema,
  stacking: z.enum(STATUS_STACKING),
  tracksSource: z.literal(true).exactOptional(),
  effects: StatusEffectsSchema,
})

// ----------------------------------------------------------- element wheel

/**
 * The element wheel (rules §4.1): `beats[a]` lists the elements `a` beats.
 * Forest > water > mountain > desert > forest; light and dark beat each other (D-08).
 */
export interface ElementWheel {
  readonly id: string
  readonly beats: Readonly<Record<Element, readonly Element[]>>
}

const ElementList = z.array(z.enum(ELEMENTS)).max(ELEMENTS.length - 1)

export const ElementWheelSchema: z.ZodType<ElementWheel> = z
  .strictObject({
    id: ID,
    beats: z.strictObject({
      forest: ElementList,
      water: ElementList,
      mountain: ElementList,
      desert: ElementList,
      light: ElementList,
      dark: ElementList,
    }),
  })
  .superRefine(({ beats }, ctx) => {
    for (const element of ELEMENTS) {
      const list = beats[element]
      if (list.includes(element)) {
        ctx.addIssue({ code: 'custom', path: ['beats', element], message: `${element} cannot beat itself` })
      }
      if (new Set(list).size !== list.length) {
        ctx.addIssue({ code: 'custom', path: ['beats', element], message: 'an element is listed twice' })
      }
    }
  })
