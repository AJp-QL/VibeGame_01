/**
 * The Phaser scene that draws the Board and its Units from the session's
 * snapshot, animates the engine's events (Moves, attacks, damage, Units going
 * down) and turns taps into BoardInput. It keeps view objects only, never
 * game state. Each element tile carries a small corner mark (palette
 * TERRAIN_GLYPHS); statuses show as small icons (Guarded shield, Bleed drop, Rallied arrow, Pin cross, Marked
 * crosshair, Hidden leaf); enemies that line of sight blocks, or that are Hidden 2 or more tiles away, are crossed
 * out while choosing a target. A tile Attune changed shows its new terrain
 * with a white frame and the Turns it has left; Cover and Command show as
 * icons next to the statuses. Tile and area skills
 * light up the tiles they can be aimed at, Burst's 3x3 area shows around its
 * centre and its chosen targets carry their order number; Blink plays as a
 * fade out and in. It draws only the Units in `snapshot.units`, so Units hidden
 * during deployment never appear and cannot be tapped.
 */
import * as Phaser from 'phaser'
import type { Tile } from '@mt/shared'
import { boardPixels, tileAtPoint, tileCentre, TILE_SIZE } from './boardGeometry.ts'
import { derivedValues, type BattleSessionPort, type BattleSnapshot, type BattleState, type SessionSnapshot, type UnitId, type UnitState } from '@mt/session'
import {
  AREA,
  ATTUNED,
  COMMAND_ICON,
  COVER_ICON,
  BLOCKED_TARGET,
  GLYPH_ALPHA,
  glyphColour,
  GRID_LINE,
  HP_BAR_BACK,
  HP_BAR_FILL,
  HP_BAR_LOW,
  PENDING_TARGET,
  REACHABLE,
  SELECTED,
  OUTLINE,
  ORDER_DIGITS,
  STATUS_DOT,
  STATUS_ICONS,
  STATUS_NEGATIVE,
  STATUS_POSITIVE,
  TARGET,
  TERRAIN_COLOURS,
  TERRAIN_GLYPHS,
  TILE_CHOICE,
} from './palette.ts'
import type { BoardLabels } from './labels.ts'
import { drawUnit } from './silhouettes.ts'


/** Milliseconds per step when a Unit walks its path. */
const STEP_MS = 90
/** Attack placeholder animation: lunge, then the result, then a fall. */
const LUNGE_MS = 110
const LUNGE_PIXELS = 9
const RESULT_AT_MS = 2 * LUNGE_MS
const FALL_AT_MS = RESULT_AT_MS + 350
const FALL_MS = 300
const FLOAT_MS = 800
/** A counterattack (and whatever follows it, e.g. Shield Bash's push) starts once the attack it answers has shown its result. */
const FOLLOW_UP_MS = RESULT_AT_MS + 250
const PUSH_MS = 160
/** Blink: fade out, appear on the new tile, fade in. */
const TELEPORT_FADE_MS = 140

/** Units of the side to act that have nothing left to do this Turn. */
const SPENT_ALPHA = 0.5

/** Status icons drawn on a Unit; the Unit card lists them all. */
const MAX_STATUS_ICONS = 3


  private drawHighlights(snapshot: PlanSnapshot): void {
