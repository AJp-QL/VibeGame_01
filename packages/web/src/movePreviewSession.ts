import type { BattleSession } from '@mt/session'

/** Board taps look before committing; all legality and preview data stay in session. */
export function withMovePreview(session: BattleSession): BattleSession {
  return {
    ...session,
    input(input) {
      const snapshot = session.getSnapshot()
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
}
