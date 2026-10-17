import type { BattleSession, SessionSnapshot } from '@mt/session'

export interface PendingStart {
  readonly current: string
  readonly next: string
  readonly snapshot: SessionSnapshot
  readonly run: () => void
}

/** Hold only the UI command; the session remains the source of Battle state. */
export function createActionConfirmation(session: BattleSession) {
  let pending: PendingStart | null = null
  const listeners = new Set<() => void>()
  const publish = () => listeners.forEach(listener => listener())
  function guard(run: () => void) {
    const snapshot = session.getSnapshot()
    const { actionAtStake: current, selectedUnit: next } = snapshot
    if (current !== null && next !== null && current !== next) {
      pending = { current, next, snapshot, run }
      publish()
    } else run()
  }
  function clear() {
    const previous = pending
    pending = null
    publish()
    return previous
  }
  return {
    getPending: () => pending,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    confirm() {
      const previous = clear()
      if (previous?.snapshot === session.getSnapshot()) previous.run()
    },
    cancel() {
      const previous = clear()
      if (previous?.snapshot === session.getSnapshot()) session.selectUnit(previous.current)
    },
    session: {
      ...session,
      input(input) {
        const snapshot = session.getSnapshot()
        if (input.type === 'tapTile' && snapshot.mode === 'move' &&
          snapshot.reachable.some(tile => tile.x === input.tile.x && tile.y === input.tile.y)) {
          guard(() => session.input(input))
        } else session.input(input)
      },
      defend() {
        if (session.getSnapshot().canDefend) guard(() => session.defend())
      },
      confirmAttack() {
        const { ready } = session.getSnapshot()
        if (ready === null) return
        guard(() => session.confirmAttack())
      },
      confirmMove() {
        if (session.getSnapshot().movePreview !== null) guard(() => session.confirmMove())
      },
    } satisfies BattleSession,
  }
}

export type ActionConfirmation = ReturnType<typeof createActionConfirmation>
