import type { BattleSession, SessionSnapshot } from '@mt/session'
import type { GameData } from '@mt/shared'
import { skillSummary } from './skillText.ts'
import { skillName } from './battleText.ts'
import { th } from './strings.ts'

/** The selected Unit's loadout: tap to aim; cooldown shows as a number on the button (rules §13.2). */
export function SkillButtons({ snapshot, session, data }: { snapshot: SessionSnapshot; session: BattleSession; data: GameData }) {
  const statuses = snapshot.state.statusTypes
  return (
    <div className="skills">
      <strong>{th.skillsTitle}</strong>
      <ul>
        {snapshot.skills.map((button) => {
          const skill = data.skills[button.skill]
          const reason = !button.implemented
            ? button.tier === 'passive'
              ? th.skillPassive
              : th.skillNotYet
            : button.usedThisActivation === true
              ? th.skillUsedThisActivation
              : button.spent
                ? th.skillSpent
                : button.cooldown > 0
                  ? th.cooldownTitle(button.cooldown)
                  : null
          return (
            <li key={button.skill}>
              <button
                type="button"
                className={`skill tier-${button.tier}`}
                disabled={!button.usable}
                aria-pressed={snapshot.pendingSkill === button.skill}
                onClick={() => session.chooseSkill(button.skill)}
              >
                <span className="skill-name">{skillName(data, button.skill)}</span>
                {button.cooldown > 0 && (
                  <span className="cooldown" aria-label={th.cooldownTitle(button.cooldown)}>
                    {button.cooldown}
                  </span>
                )}
              </button>
              <span className="skill-info">
                {skill !== undefined && skillSummary(skill, statuses)}
                {reason !== null && <span className="reason"> · {reason}</span>}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
