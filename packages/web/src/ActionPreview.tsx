import type { Action, ActionPreview, AttackPreview, BattleState, RollModeSource, StatusOdds } from '@mt/session'
import { tileName, type GameData } from '@mt/shared'
import { statName, statusName } from './skillText.ts'
import { percent, skillName } from './battleText.ts'
import { th } from './strings.ts'

/** One line per source of advantage or disadvantage (rules §5.1). */
function sourceText(
  source: RollModeSource,
  name: (id: string) => string,
  statuses: BattleState['statusTypes'],
  commandDropped: boolean,
): string {
  switch (source.kind) {
    case 'element':
      return source.effect === 'advantage'
        ? th.sourceElementWins(th.element[source.attackerElement], th.element[source.targetElement])
        : th.sourceElementLoses(th.element[source.attackerElement], th.element[source.targetElement])
    case 'terrain':
      if (source.effect === 'disadvantage') {
        return th.sourceTerrainWeak(th.element[source.terrain], th.element[source.attackerElement])
      }
      return source.aquatic ? th.sourceTerrainAquatic : th.sourceTerrainMatch(th.element[source.terrain])
    case 'status':
      return source.holder === 'attacker'
        ? th.sourceAttackerStatus(statusName(statuses, source.status))
        : th.sourceTargetStatus(statusName(statuses, source.status))
    case 'command':
      return commandDropped ? th.sourceCommandDropped(name(source.tamer)) : th.sourceCommand(name(source.tamer))
    case 'tamerProtection':
      return th.sourceTamerProtected(source.protectors.map(name).join(', '))
  }
}

/** Where advantage and disadvantage come from, and the net effect after cancelling (spec user story 22). */
function RollModeSources({
  preview,
  name,
  statuses,
}: {
  preview: AttackPreview
  name: (id: string) => string
  statuses: BattleState['statusTypes']
}) {
  const sources = preview.rollModeSources
  if (sources.length === 0) return <div className="muted">{th.previewNoSources}</div>
  const net = preview.rollMode === 'normal' ? th.previewNet.cancelled : th.previewNet[preview.rollMode]
  // Rules §5.3: Command's advantage does not count against a protected Tamer.
  const commandDropped = sources.some((s) => s.kind === 'tamerProtection')
  return (
    <div className="sources">
      <ul>
        {sources.map((source, index) => (
          <li key={index} className={source.effect}>
            <span className="tag">{th.rollEffect[source.effect]}</span> {sourceText(source, name, statuses, commandDropped)}
          </li>
        ))}
      </ul>
      <div className={`net ${preview.rollMode}`}>{net}</div>
    </div>
  )
}

/** The chance each status of a skill sticks: the target's save, or no save at all. */
function StatusOddsList({ odds, statuses }: { odds: readonly StatusOdds[]; statuses: BattleState['statusTypes'] }) {
  return (
    <ul className="status-odds">
      {odds.map((o) => {
        const status = statusName(statuses, o.status)
        return (
          <li key={`${o.target}-${o.status}`}>
            {o.save === null
              ? th.previewNoSave(status)
              : th.previewSave(status, percent(o.save.failChance), statName(o.save.stat), o.save.dc, o.save.modifier)}
          </li>
        )
      })}
    </ul>
  )
}

export function PreviewCard({
  preview,
  action,
  name,
  data,
}: {
  preview: ActionPreview
  action: Action | null
  name: (id: string) => string
  data: GameData
}) {
  if (preview.type === 'effect' && action?.type === 'useSkill' && action.tile !== undefined && data.skills[action.skill]?.effects?.replacesMove === true) {
    return (
      <div className="preview" aria-live="polite">
        <strong>{th.logSkillUsed(name(preview.user), skillName(data, preview.skill), '')}</strong>
        <div>{th.previewTeleport(name(preview.user), tileName(action.tile))}</div>
      </div>
    )
  }
  if (preview.type === 'area') {
    return (
      <div className="preview" aria-live="polite">
        <strong>{th.previewArea(name(preview.user), skillName(data, preview.skill), tileName(preview.centre), preview.attacks.length)}</strong>
        <ol className="area-attacks">
          {preview.attacks.map((attack, index) => (
            <li key={attack.target}>
              <em>{th.previewAreaTarget(index + 1, name(attack.target))}</em>
              <AttackOdds preview={attack} name={name} data={data} />
            </li>
          ))}
        </ol>
      </div>
    )
  }
  if (preview.type === 'heal') {
    return (
      <div className="preview" aria-live="polite">
        <strong>
          {th.previewHeal(name(preview.user), skillName(data, preview.skill), name(preview.target), preview.min, preview.max, preview.hp, preview.maxHp)}
        </strong>
      </div>
    )
  }
  if (preview.type === 'terrain') {
    return (
      <div className="preview" aria-live="polite">
        <strong>
          {th.previewTerrain(
            name(preview.user),
            skillName(data, preview.skill),
            tileName(preview.tile),
            th.terrain[preview.from],
            th.terrain[preview.to],
            preview.turns,
            th.terrain[preview.original],
          )}
        </strong>
      </div>
    )
  }
  if (preview.type === 'effect' && data.skills[preview.skill]?.effects?.cover === true) {
    return (
      <div className="preview" aria-live="polite">
        <strong>{th.logSkillUsed(name(preview.user), skillName(data, preview.skill), preview.units.map(name).join(', '))}</strong>
        <div>{th.previewCover(name(preview.user), preview.units.map(name).join(', '))}</div>
      </div>
    )
  }
  if (preview.type === 'effect') {
    const statuses = preview.statuses.map((id) => statusName(data.statuses, id)).join(', ')
    return (
      <div className="preview" aria-live="polite">
        <strong>
          {th.logSkillUsed(name(preview.user), skillName(data, preview.skill), '')}
          {data.skills[preview.skill]?.effects?.free === true && ` ${th.noAction}`}
        </strong>
        <div>{th.previewEffect(statuses, preview.units.map(name).join(', '))}</div>
      </div>
    )
  }
  if (preview.type === 'save') {
    return (
      <div className="preview" aria-live="polite">
        <strong>{th.previewSaveTitle(name(preview.user), skillName(data, preview.skill), name(preview.target))}</strong>
        <StatusOddsList odds={preview.statuses} statuses={data.statuses} />
      </div>
    )
  }
  return (
    <div className="preview" aria-live="polite">
      <strong>{th.previewTitle(name(preview.attacker), skillName(data, preview.skill), name(preview.target))}</strong>
      <AttackOdds preview={preview} name={name} data={data} />
    </div>
  )
}

/** One attack's odds: hit, damage, critical, statuses, roll mode sources and the roll itself. */
function AttackOdds({ preview, name, data }: { preview: AttackPreview; name: (id: string) => string; data: GameData }) {
  return (
    <>
      <div className="preview-numbers">
        <span className="big">{th.previewHit(percent(preview.hitChance))}</span>
        <span className="big">
          {preview.damage === null ? th.previewNoDamage : th.previewDamage(preview.damage.min, preview.damage.max)}
        </span>
      </div>
      {preview.criticalDamage !== null && (
        <div>
          {th.previewCritical(percent(preview.criticalChance), preview.criticalDamage.min, preview.criticalDamage.max)}
        </div>
      )}
      {preview.statuses.length > 0 && (
        <div>
          {th.previewIfHit}: <StatusOddsList odds={preview.statuses} statuses={data.statuses} />
        </div>
      )}
      {preview.counterattack !== undefined && preview.counterattack.damage !== null && (
        <div>
          {th.previewCounterattack(
            name(preview.counterattack.attacker),
            percent(preview.counterattack.hitChance),
            preview.counterattack.damage.min,
            preview.counterattack.damage.max,
          )}
        </div>
      )}
      <RollModeSources preview={preview} name={name} statuses={data.statuses} />
      <div className="muted">
        {th.previewRoll(preview.attackBonus, th.defence[preview.defenceKind], preview.defence)}
        {preview.statusAttackBonuses.map((b) => ` (${th.previewAttackBonusStatus(statusName(data.statuses, b.status), b.bonus)})`)}
        {preview.guardedBonus > 0 && ` ${th.previewGuarded(preview.guardedBonus)}`}
        {(preview.damage?.statusModifiers ?? []).map(
          (m) => ` (${th.previewDamageStatus(statusName(data.statuses, m.status), m.bonus)})`,
        )}{' '}
        · {th.previewRules}
      </div>
    </>
  )
}
