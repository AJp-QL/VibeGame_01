/**
 * Thai text for skills and statuses, built from their data (data/skills,
 * data/statuses) so a change of numbers in data shows up in the UI without
 * touching text. Names stay in English (game terms); the rest comes from the
 * string table.
 */
import type { Dice, Skill, StatusType } from '@mt/shared'
import type { UnitStatus } from '@mt/engine'
import { th } from './strings.ts'

const diceText = (dice: Dice) => `${dice.count}d${dice.sides}`

const STAT_NAMES = { pow: 'POW', agi: 'AGI', vit: 'VIT', int: 'INT', sen: 'SEN', spi: 'SPI' } as const

export function statName(stat: keyof typeof STAT_NAMES): string {
  return STAT_NAMES[stat]
}

export function statusName(statuses: Readonly<Record<string, StatusType>>, id: string): string {
  return statuses[id]?.name ?? id
}

/** What a status does, e.g. "attack roll +1"; Guarded uses the bonus its source gave. */
export function statusEffectText(type: StatusType, status?: UnitStatus): string {
  const e = type.effects
  const parts: string[] = []
  if (e.startOfTurnDamage) parts.push(th.statusEffect.startOfTurnDamage(diceText(e.startOfTurnDamage)))
  if (e.attackRoll !== undefined) parts.push(th.statusEffect.attackRoll(e.attackRoll))
  if (e.defenceFromSource) parts.push(th.statusEffect.defence(status?.bonus ?? 0))
  if (e.immobile) parts.push(th.statusEffect.immobile)
  if (e.damageDealt !== undefined) parts.push(th.statusEffect.damageDealt(e.damageDealt))
  if (e.attackersRollMode) parts.push(th.statusEffect.attackersAdvantage)
  if (e.nextAttackRollMode) parts.push(th.statusEffect.nextAttackDisadvantage)
  if (e.untargetableFrom !== undefined) parts.push(th.statusEffect.untargetable(e.untargetableFrom))
  if (e.forcedToAttackSource) parts.push(th.statusEffect.taunted)
  if (e.counterattack) parts.push(th.statusEffect.counterattack(diceText(e.counterattack)))
  return parts.join(', ')
}

/** How long a status on a Unit has left (rules §14.1), e.g. "อีก 2 Turn ของทีมตัวเอง". */
export function statusDurationText(type: StatusType, status: UnitStatus): string {
  switch (type.duration.kind) {
    case 'turns':
      return th.statusDuration.turns(status.turnsLeft ?? type.duration.turns, status.skipCountdown === true)
    case 'untilOwnTurnStart':
      return th.statusDuration.untilOwnTurnStart
    case 'untilAttackRoll':
      return th.statusDuration.untilAttackRoll
    case 'untilBroken':
      return th.statusDuration.untilBroken
  }
}

/** One line about a skill from its data, e.g. "Major · ระยะ 1 · กายภาพ · damage 1d6 · ติด Bleed (save VIT)". */
export function skillSummary(skill: Skill, statuses: Readonly<Record<string, StatusType>>): string {
  const parts: string[] = [th.tier[skill.tier]]
  if (skill.tier === 'passive') {
    parts.push(th.skillPassive)
    return parts.join(' · ')
  }
  parts.push(skill.target === 'selfAndAllies' ? th.skillRangeAllies(skill.range) : th.skillRange(skill.range))
  if (skill.attack !== undefined) parts.push(th.skillAttack[skill.attack])
  if (skill.damage !== undefined) parts.push(th.skillDamage(diceText(skill.damage)))
  for (const application of skill.applies ?? []) {
    const name = statusName(statuses, application.status)
    parts.push(application.save === undefined ? th.skillGives(name) : th.skillGivesSave(name, statName(application.save)))
  }
  if (skill.effects?.retreat !== undefined) parts.push(th.skillRetreat)
  return parts.join(' · ')
}

export { diceText }
