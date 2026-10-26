import type { BattleSession, SessionSnapshot } from '@mt/session'
import type { GameData } from '@mt/shared'
import { skillSummary } from './skillText.ts'
import { skillName } from './battleText.ts'
import { th } from './strings.ts'

/** The selected Unit's loadout: tap to aim; cooldown shows as a number on the button (rules §13.2). */
export function SkillButtons({ snapshot, session, data, skills = snapshot.skills }: { snapshot: SessionSnapshot; session: BattleSession; data: GameData; skills?: SessionSnapshot['skills'] }) {
  const statuses = snapshot.state.statusTypes
  const shownSkills = skills.filter(button => button.skill !== snapshot.movePreview?.skill)
  if (shownSkills.length === 0) return null
  return (
    <div className="skills">
      <strong>{th.skillsTitle}</strong>
      <ul>
        {shownSkills.map((button) => {
          const skill = data.skills[button.skill]
          const reason = button.fromMovePreview === 'move-first'
            ? th.skillMoveFirst(skillName(data, button.skill))
            : button.fromMovePreview === 'out-of-reach'
              ? th.skillPreviewOutOfReach
              : !button.implemented
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
                disabled={!button.implemented || button.fromMovePreview === 'move-first' || (button.fromMovePreview == null && !button.usable)}
                aria-describedby={`skill-reason-${button.skill}`}
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
              <span className="skill-info" id={`skill-reason-${button.skill}`}>
                <span className="skill-summary">{skill !== undefined && skillSummary(skill, statuses)}</span>
                {reason !== null && <span className="reason"> · {reason}</span>}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
