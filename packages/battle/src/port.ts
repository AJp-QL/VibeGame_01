/**
 * What the Phaser view needs from the session that wraps the engine.
 *
 * battle must not import web, so it declares the interface here and web
 * passes in an implementation (docs/research/phase-1-stack.md §3). The view
 * keeps no game state of its own: it draws `getSnapshot()` and reports taps.
 */
import type { Tile } from '@mt/shared'
import type { BattleEvent, BattleState, UnitId, UnitState } from '@mt/engine'

export interface BattleSnapshot {
  readonly state: BattleState
  /**
   * The Units to draw: what the player holding the device may see. During
   * deployment only the placing side's own Units (the other side's stay
   * hidden); in play every Unit.
   */
  readonly units: readonly UnitState[]
  /** Units of the side to act that still have a legal action; the view dims the others. */
  readonly canAct: readonly UnitId[]
  /** Events of the last accepted action, in order, for animation. */
  readonly events: readonly BattleEvent[]
  /** Goes up by one with every accepted action, so a view can tell new events from old. */
  readonly revision: number
  /** Unit the player has selected, if any (UI state, not game state). */
  readonly selectedUnit: UnitId | null
  /**
   * Tiles the selected Unit can Move to (play) or be placed on (deployment),
   * taken from the engine's legal actions.
   */
  readonly reachable: readonly Tile[]
  /** Tiles of the Units the selected Unit can attack now, from the engine's legal actions. */
  readonly targets: readonly Tile[]
  /** Tiles of enemies in range that line of sight blocks: shown as not selectable. */
  readonly blockedTargets: readonly Tile[]
  /** The target picked for the attack being previewed, if any. */
  readonly pendingTarget: UnitId | null
  /** Tiles a tile or area skill may be aimed at now (Blink's destinations, Burst's centres), from the legal actions. */
  readonly tileChoices: readonly Tile[]
  /** The tile picked for a tile or area skill (Blink's destination, Burst's centre), if any. */
  readonly pendingTile: Tile | null
  /** The tiles an area skill covers around `pendingTile` (Burst's 3x3), for the overlay. */
  readonly area: readonly Tile[]
  /** Targets picked for an area skill, in the order they will be attacked (numbered on the Board). */
  readonly chosenTargets: readonly UnitId[]
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

/** Words the Board draws, from the web string table (battle has no text of its own). */
export interface BoardLabels {
  readonly miss: string
  readonly critical: string
}
