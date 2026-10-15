/**
 * What the Phaser view needs from the session that wraps the engine.
 *
 * battle must not import web, so it declares the interface here and web
 * passes in an implementation (docs/research/phase-1-stack.md §3). The view
 * keeps no game state of its own: it draws `getSnapshot()` and reports taps.
 */
import type { Tile } from '@mt/shared'
import type { BattleEvent, BattleState, UnitId } from '@mt/engine'

export interface BattleSnapshot {
  readonly state: BattleState
  /** Events of the last accepted action, in order, for animation. */
  readonly events: readonly BattleEvent[]
  /** Goes up by one with every accepted action, so a view can tell new events from old. */
  readonly revision: number
  /** Unit the player has selected, if any (UI state, not game state). */
  readonly selectedUnit: UnitId | null
  /** Tiles the selected Unit can Move to, taken from the engine's legal actions. */
  readonly reachable: readonly Tile[]
}

/** A tap or click on the Board. No hover: mobile has none. */
export type BoardInput =
  | { readonly type: 'tapUnit'; readonly unit: UnitId }
  | { readonly type: 'tapTile'; readonly tile: Tile }

export interface BattleSessionPort {
  getSnapshot(): BattleSnapshot
  /** Returns the unsubscribe function. */
  subscribe(listener: () => void): () => void
  input(input: BoardInput): void
}
