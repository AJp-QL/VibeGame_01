import { useLayoutEffect, useRef } from 'react'
import { createBattleGame, fitBattleGame, type BattleSessionPort, type BoardLabels } from '@mt/battle'
import { th } from './strings.ts'

const LABELS: BoardLabels = { miss: th.boardMiss, critical: th.boardCritical }

/** Hosts the Phaser Board. Phaser reads the same session as React. */
export function BattleView({ session }: { session: BattleSessionPort }) {
  const parentRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const parent = parentRef.current
    if (parent === null) return
    const game = createBattleGame(parent, session, LABELS)
    const observer = new ResizeObserver(() => {
      if (game.isBooted) fitBattleGame(game)
    })
    observer.observe(parent)
    // StrictMode mounts twice in development: destroy(true) removes the
    // canvas; never pass noReturn, or a new Game could not be created.
    return () => {
      observer.disconnect()
      game.destroy(true)
    }
  }, [session])

  return <div ref={parentRef} className="board" />
}
