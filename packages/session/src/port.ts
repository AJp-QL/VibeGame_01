/**
 * What the Phaser view needs from the session that wraps the engine (the
 * port, ADR 0004). battle and web both import it from here; the session and
 * the Replay player implement it. The view keeps no game state of its own: it
 * draws `getSnapshot()` and reports taps.
 */
import type { Tile } from '@mt/shared'
import type { BattleEvent, BattleState, UnitId, UnitState } from '@mt/engine'
import type { ActionPlan, AttackableEnemy } from './actionPlan.ts'
import type { MovePreview, SelectionMode } from './session.ts'

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
  /**
   * Move preview (phase 1.x ticket 03): the selected Unit as if it stood on the
   * tile being looked at (a reachable tile, or the Blink destination being
   * aimed), with what it could attack from there. `null` or absent when there
   * is none; optional so other ports (the Replay player, fakes in tests) need
   * not provide it.
   */
  readonly movePreview?: MovePreview | null
  /**
   * Events of each action the last accepted command sent, in order (phase 1.x ticket 23): one entry
   * for a single action, a Move's and an Action's for a confirmed Action plan, so the Unit can walk
   * before it attacks. `events` keeps its meaning. Optional like `movePreview`.
   */
  readonly eventBatches?: readonly (readonly BattleEvent[])[]
  /**
   * Threat zone (phase 1.x ticket 11): enemies that could attack each tile next Turn, for the side the
   * Board is shown to, indexed `[y][x]`; empty outside play. Optional like `movePreview`; the Replay player gives none.
   */
  readonly threatZone?: readonly (readonly number[])[]
  /**
   * Action plan (phase 1.x tickets 23, 32): the enemies the selected Unit can attack in this activation,
   * and from where, for the Board's sword marks and the standing tiles. Same value as
   * `SessionSnapshot.attackable`. Optional like `movePreview`; the Replay player gives none.
   */
  readonly attackable?: readonly AttackableEnemy[]
  /**
   * Action plan: where the selected Unit would act from and what it would do, or `null` until a target
   * or choice is picked. Same value as `SessionSnapshot.plan`. Optional like `movePreview`; the Replay player gives none.
   */
  readonly plan?: ActionPlan | null
  /**
   * What the player is aiming: `move`, `attack`, `skill` or `command`. Same value as
   * `SessionSnapshot.mode`. Optional like `movePreview`; the Replay player gives none.
   */
  readonly mode?: SelectionMode
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
