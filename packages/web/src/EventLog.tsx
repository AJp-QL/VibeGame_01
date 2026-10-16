import { derivedValues, type BattleEvent, type BattleState } from '@mt/session'
import { isOnBoard, tileName, type GameData } from '@mt/shared'
import { diceText, statName, statusDurationText, statusEffectText, statusName } from './skillText.ts'
import { namer, otherSide, skillName } from './battleText.ts'
import { th } from './strings.ts'

export function logLines(event: BattleEvent, name: (id: string) => string, state: BattleState, data: GameData): string[] {
  switch (event.type) {
    case 'unitPlaced':
      // Placements stay hidden from the other side; the reveal is logged instead.
      return []
    case 'deploymentConfirmed':
      return [th.logDeploymentConfirmed(event.side)]
    case 'deploymentRevealed':
      return [th.logRevealed]
    case 'initiativeRolled': {
      const line = th.logInitiative(event.rolls.A.total, event.rolls.B.total, event.tie)
      return [event.rerolled === undefined ? line : `${th.initiativeRerolled(event.rerolled)}: ${line}`]
    }
    case 'initiativeDecided':
      return [th.logInitiativeDecided(event.firstSide)]
    case 'unitMoved':
      return [th.logMoved(name(event.unit), tileName(event.from), tileName(event.to))]
    case 'attackRolled': {
      const roll = th.logAttackRolled(
        name(event.attacker),
        skillName(data, event.skill),
        name(event.target),
        event.rolls,
        event.attackBonus,
        event.total,
        th.defence[event.defenceKind],
        event.defence,
      )
      const result = event.critical
        ? th.logCritical
        : event.natural === 1
          ? th.logNatural1
          : event.hit
            ? th.logHit
            : th.logMiss
      const mode = event.rollMode === 'normal' ? '' : ` (${th.rollEffect[event.rollMode]})`
      const rerolled = event.rerolled === true ? `${th.logRerolled}: ` : ''
      return [`${rerolled}${roll}${mode} → ${result}`]
    }
    case 'damageDealt':
      if (event.coveredBy !== undefined) {
        return [
          th.logDamageCovered(
            name(event.target),
            name(event.coveredBy),
            event.amount,
            event.hpAfter,
            derivedValues(state, event.coveredBy).maxHp,
          ),
        ]
      }
      return [
        th.logDamage(
          name(event.target),
          event.amount,
          `${event.dice.count}d${event.dice.sides}`,
          event.rolls,
          event.modifier,
          event.hpAfter,
          derivedValues(state, event.target).maxHp,
          (event.statusModifiers ?? [])
            .map((m) => th.logDamageStatus(statusName(state.statusTypes, m.status), m.bonus))
            .join(', '),
        ),
      ]
    case 'unitDown':
      return [th.logUnitDown(name(event.unit))]
    case 'defended':
      return [th.logDefended(name(event.unit))]
    case 'skillUsed': {
      const used = data.skills[event.skill]
      // Burst: the centre and the order of its targets; each attack follows.
      if (used?.target === 'area' && event.tile !== undefined) {
        return [th.logAreaSkill(name(event.unit), skillName(data, event.skill), tileName(event.tile), event.targets.map(name).join(', '))]
      }
      // Blink says it in its teleport line; attack skills in their attack roll line; the others here.
      if (used?.effects?.replacesMove === true || used?.attack !== undefined) return []
      const line = th.logSkillUsed(name(event.unit), skillName(data, event.skill), event.targets.filter((t) => t !== event.unit).map(name).join(', '))
      return [used?.effects?.free === true ? `${line} ${th.noAction}` : line]
    }
    case 'saveRolled':
      return [
        (event.rerolled === true ? `${th.logRerolled}: ` : '') +
          th.logSave(
          name(event.unit),
          statusName(state.statusTypes, event.status),
          statName(event.stat),
          event.roll,
          event.modifier,
          event.total,
          event.dc,
          event.saved,
        ),
      ]
    case 'statusApplied': {
      const type = state.statusTypes[event.status.id]
      if (type === undefined) return []
      return [
        th.logStatusApplied(
          name(event.unit),
          type.name,
          statusEffectText(type, event.status),
          statusDurationText(type, event.status),
          event.refreshed === true,
        ),
      ]
    }
    case 'statusEnded': {
      const status = statusName(state.statusTypes, event.status)
      if (event.cause === 'attackRoll') return [th.logStatusBroken.attackRoll(name(event.unit), status)]
      if (event.cause === 'terrain') {
        // The terrain the skill that gave it needs (Camouflage: forest).
        const needed = Object.values(data.skills).find(
          (s) => s.effects?.requiresTerrain !== undefined && (s.applies ?? []).some((a) => a.status === event.status),
        )?.effects?.requiresTerrain
        return [th.logStatusBroken.terrain(name(event.unit), status, th.terrain[needed ?? 'forest'])]
      }
      return [th.logStatusEnded(name(event.unit), status)]
    }
    case 'statusTicked':
      return [
        th.logStatusTicked(
          name(event.unit),
          statusName(state.statusTypes, event.status),
          event.amount,
          diceText(event.dice),
          event.rolls,
          event.hpAfter,
          derivedValues(state, event.unit).maxHp,
        ),
      ]
    case 'unitTeleported':
      return [th.logTeleported(name(event.unit), skillName(data, event.skill), tileName(event.from), tileName(event.to))]
    case 'unitRetreated':
      return [th.logRetreated(name(event.unit), tileName(event.from), tileName(event.to))]
    case 'retreatDeclined':
      return [th.logRetreatDeclined(name(event.unit))]
    case 'unitPushed':
      return [th.logPushed(name(event.unit), name(event.by), tileName(event.from), tileName(event.to))]
    case 'pushBlocked':
      return [
        th.logPushBlocked(
          name(event.unit),
          isOnBoard(event.tile) ? tileName(event.tile) : '',
          event.blockedBy === 'offBoard' ? null : name(event.blockedBy),
        ),
      ]
    case 'counterattack':
      return [th.logCounterattack(name(event.unit), name(event.target), diceText(event.dice))]
    case 'healed':
      return [
        th.logHealed(
          name(event.source),
          skillName(data, event.skill),
          name(event.target),
          event.amount,
          diceText(event.dice),
          event.rolls,
          event.modifier,
          event.hpAfter,
          derivedValues(state, event.target).maxHp,
        ),
      ]
    case 'coverApplied':
      return [th.logCoverApplied(name(event.by), name(event.unit), event.refreshed === true)]
    case 'coverEnded':
      return [th.logCoverEnded(name(event.unit), name(event.by))]
    case 'terrainChanged':
      return [
        th.logTerrainChanged(
          name(event.unit),
          skillName(data, event.skill),
          tileName(event.tile),
          th.terrain[event.from],
          th.terrain[event.to],
          event.turnsLeft,
        ),
      ]
    case 'terrainReverted':
      return [th.logTerrainReverted(tileName(event.tile), th.terrain[event.from], th.terrain[event.to])]
    case 'commandIssued':
      return [th.logCommandIssued(name(event.unit), name(event.target), th.commandOption[event.option])]
    case 'commandSpent':
      return [th.logCommandSpent(name(event.unit))]
    case 'inspirationOffered':
      // The prompt shows the offer; the log records the answer.
      return []
    case 'inspirationUsed':
      return [th.logInspirationUsed(event.side)]
    case 'inspirationDeclined':
      return [th.logInspirationDeclined(event.side)]
    case 'battleEnded': {
      const why =
        event.cause === 'turnLimit'
          ? th.turnLimitResult(event.damageDealt?.A ?? 0, event.damageDealt?.B ?? 0, event.winner)
          : th.cause[event.cause](otherSide(event.winner ?? 'A'))
      return [`${th.logBattleEnded(event.winner, event.round)} (${why})`]
    }
    case 'turnEnded':
      return [th.logTurnEnded(event.side)]
    case 'turnStarted':
      return [th.logTurnStarted(event.side, event.turn, event.round)]
  }
}

export function EventLog({ events, state, data }: { events: readonly BattleEvent[]; state: BattleState; data: GameData }) {
  const name = namer(state, data)
  const lines = events.flatMap((event) => logLines(event, name, state, data))
  if (lines.length === 0) return <p className="empty">{th.logEmpty}</p>
  // Newest first; the whole Battle stays in the list (it scrolls).
  return (
    <ol reversed>
      {lines
        .map((line, index) => ({ line, index }))
        .reverse()
        .map(({ line, index }) => (
          <li key={index}>{line}</li>
        ))}
    </ol>
  )
}
