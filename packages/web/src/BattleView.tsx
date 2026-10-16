import { useLayoutEffect, useRef } from 'react'
import { mountBattleGame, type BattleSessionPort, type BoardLabels } from '@mt/battle'
import { th } from './strings.ts'

const LABELS: BoardLabels = {
  miss: th.boardMiss,
  critical: th.boardCritical,
  counter: th.boardCounter,
  pushBlocked: th.boardPushBlocked,
}

/** Hosts the Phaser Board. Phaser reads the same session as React. */
export function BattleView({ session }: { session: BattleSessionPort }) {
  const parentRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const parent = parentRef.current
    if (parent === null) return
    // StrictMode mounts twice in development: the teardown removes the first canvas at once.
    return mountBattleGame(parent, session, LABELS)
  }, [session])

  return <div ref={parentRef} className="board" />
}
