import type { BattleSession } from '@mt/session'

type PreviewSubject = { kind: 'unit' | 'skill'; id: string } | { kind: 'action'; id: 'attack' | 'defend' | 'command' }
const subjects = new WeakMap<BattleSession, () => PreviewSubject | null>()

/** UI-only description of the last attempted input; session alone decides whether it was refused. */
export function previewRefusalSubject(session: BattleSession): PreviewSubject | null {
  return subjects.get(session)?.() ?? null
}

/** Board taps look before committing; all legality and preview data stay in session. */
export function withMovePreview(session: BattleSession): BattleSession {
  let subject: PreviewSubject | null = null
  const wrapped: BattleSession = {
    ...session,
    aimTarget(unit) { subject = { kind: 'unit', id: unit }; session.aimTarget(unit) },
    chooseSkill(skill) { subject = { kind: 'skill', id: skill }; session.chooseSkill(skill) },
    chooseAttack() { subject = { kind: 'action', id: 'attack' }; session.chooseAttack() },
    defend() { subject = { kind: 'action', id: 'defend' }; session.defend() },
    chooseCommand() { subject = { kind: 'action', id: 'command' }; session.chooseCommand() },
    choosePlanAction(key) {
      const snapshot = session.getSnapshot()
      const choice = (snapshot.plan?.choices ?? snapshot.movePreview?.options ?? []).find(choice => choice.key === key)
      if (choice?.target != null) subject = { kind: 'unit', id: choice.target }
      else if (choice?.skill != null) subject = { kind: 'skill', id: choice.skill }
      else if (choice?.kind === 'defend') subject = { kind: 'action', id: 'defend' }
      session.choosePlanAction(key)
    },
    input(input) {
      const snapshot = session.getSnapshot()
      if (input.type === 'tapUnit') subject = { kind: 'unit', id: input.unit }
      if (snapshot.state.phase === 'play' && snapshot.state.pending === null && snapshot.mode === 'move' &&
        input.type === 'tapUnit' && snapshot.attackable.some(enemy => enemy.unit === input.unit)) {
        session.aimTarget(input.unit)
      } else if (snapshot.plan !== null && input.type === 'tapUnit' && input.unit === snapshot.plan.unit) {
        session.cancel()
      } else if (snapshot.plan === null && input.type === 'tapTile' && snapshot.state.phase === 'play' && snapshot.state.pending === null &&
        snapshot.mode === 'move' && snapshot.reachable.some(tile => tile.x === input.tile.x && tile.y === input.tile.y)) {
        session.previewMove(input.tile)
      } else session.input(input)
    },
  }
  subjects.set(wrapped, () => subject)
  return wrapped
}
