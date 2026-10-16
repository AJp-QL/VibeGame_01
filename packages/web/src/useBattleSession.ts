import { useEffect, useSyncExternalStore } from 'react'
import type { BattleOutcome, BattleSession } from '@mt/session'

/**
 * Against the AI: wait this long before each AI action, so the human sees
 * every step (move, roll, damage) on the Board and in the log (spec user story 51).
 */
const AI_STEP_MS = 700
/** A quicker pause before the AI answers an Inspiration decision. */
const AI_DECISION_MS = 400

/** Subscribe to the Battle, record its result, and schedule the AI one action at a time. */
export function useBattleSession(session: BattleSession, onFinished: (outcome: BattleOutcome, rounds: number) => void) {
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot)
  const { state } = snapshot

  const { outcome, round } = state
  useEffect(() => {
    if (outcome !== null) onFinished(outcome, round)
    // Once per Battle end (onFinished is a new function every render; the stats ignore a repeat).
  }, [outcome])

  // The AI plays one action at a time; each one changes the snapshot, which schedules the next.
  const { aiToAct, revision } = snapshot
  const aiDeciding = aiToAct && state.pending !== null
  useEffect(() => {
    if (!aiToAct) return undefined
    const timer = setTimeout(() => session.aiStep(), aiDeciding ? AI_DECISION_MS : AI_STEP_MS)
    return () => clearTimeout(timer)
  }, [session, aiToAct, aiDeciding, revision])
  return snapshot
}
