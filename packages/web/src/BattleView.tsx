import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { boardPixels, mountBattleGame, type BoardLabels } from '@mt/battle'
import type { BattleSessionPort } from '@mt/session'
import { th } from './strings.ts'

const LABELS: BoardLabels = {
  miss: th.boardMiss,
  critical: th.boardCritical,
  counter: th.boardCounter,
  pushBlocked: th.boardPushBlocked,
}

/** Hosts the Phaser Board. Phaser reads the same session as React. */
export function BattleView({ session, showThreatZone = false }: { session: BattleSessionPort; showThreatZone?: boolean }) {
  const mountedRef = useRef<ReturnType<typeof mountBattleGame> | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const parent = parentRef.current
    if (parent === null) return
    // StrictMode mounts twice in development: the teardown removes the first canvas at once.
    const mounted = mountBattleGame(parent, session, LABELS)
    mountedRef.current = mounted
    return () => { mountedRef.current = null; mounted() }
  }, [session])

  useLayoutEffect(() => {
    mountedRef.current?.setDisplay({ showThreatZone })
  }, [session, showThreatZone])

  return <div ref={parentRef} className="board" style={{ '--board-pixels': `${boardPixels(session.getSnapshot().state)}px` } as CSSProperties} />
}
