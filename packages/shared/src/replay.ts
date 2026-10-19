/**
 * The Replay file format (CONTEXT.md "Replay", spec user stories 55–59).
 *
 * A Replay is everything needed to play a Battle again exactly: the Dice
 * Seed, what the Battle was created from (Scenario, Board, mode, optional
 * preset tiles) and every accepted action in order. It also carries the
 * engine version and the data hash, so a Replay recorded with other rules or
 * other numbers is reported as a version mismatch instead of being converted
 * (decision log 2026-10-14). The engine replays it (`replayBattle`).
 *
 * Actions are stored exactly as the engine's `Action` values (plain JSON
 * objects with a `type`). This file only checks that shape; the engine
 * decides whether each action is legal when it replays it, so new action
 * types (Defend, skills, Inspiration, …) need no change here.
 *
 * Bump REPLAY_FORMAT_VERSION when the fields of the file change shape.
 * Format 2 (phase 1.x ticket 06) adds the `undo` entry to `actions`
 * ({@link UndoRecord}); every other field is as in format 1, and format 1
 * files are still read (they never hold an `undo`).
 */
import * as z from 'zod'
import { SIDES, type Side } from './model.ts'
import type { Tile } from './tiles.ts'

/** Ways to play a Battle (spec user story 9). Hotseat: two people, one device. AI: one person against the AI. */
export const BATTLE_MODES = ['hotseat', 'ai'] as const
export type BattleMode = (typeof BATTLE_MODES)[number]

/** Marks a JSON file as a Monster Tactics Replay. */
export const REPLAY_FORMAT = 'monster-tactics-replay'
export const REPLAY_FORMAT_VERSION = 2
/** Every format version this build reads: 1 (v0.1.x, no Undo) and 2. */
export const REPLAY_FORMAT_VERSIONS = [1, 2] as const
export type ReplayFormatVersion = (typeof REPLAY_FORMAT_VERSIONS)[number]

/** One recorded action: an engine `Action` as plain JSON. */
export interface ReplayAction {
  readonly type: string
  readonly [field: string]: unknown
}

/** `type` of the Undo entry of format 2. */
export const UNDO_RECORD_TYPE = 'undo'

/**
 * Format 2: the player went back to the safe point, withdrawing the last
 * `withdraw` actions still standing (rules §17.5). The withdrawn actions stay
 * in the file, before this entry, so the analyst can see where the player
 * changed their mind. The engine checks it against its own Undo rule when it
 * replays; it is not an action `applyAction` accepts.
 */
export interface UndoRecord extends ReplayAction {
  readonly type: typeof UNDO_RECORD_TYPE
  readonly withdraw: number
}

/** Optional facts about where the Replay came from; never used to replay. */
export interface ReplayMeta {
  /** Version of the build that recorded it (the deployed git tag, `__APP_VERSION__`). */
  readonly appVersion?: string
  /** When it was exported, ISO 8601, supplied by the UI (the engine never reads the clock). */
  readonly createdAt?: string
  /** Reserved for the playtester's local stats (ticket 17); any JSON. */
  readonly stats?: unknown
}

export interface Replay<A extends ReplayAction = ReplayAction> {
  readonly format: typeof REPLAY_FORMAT
  readonly formatVersion: ReplayFormatVersion
  /** `ENGINE_VERSION` of the engine that recorded it. */
  readonly engineVersion: string
  /** `dataHash` of the game data it was played with (64 hex digits). */
  readonly dataHash: string
  readonly scenarioId: string
  /** Chosen separately from the Scenario (the Scenario only has a default Board). */
  readonly boardId: string
  readonly mode: BattleMode
  /** Against the AI: the team the person played. */
  readonly humanSide?: Side
  /** Dice Seed: 16 hex digits (rules §21.5). */
  readonly diceSeed: string
  /** Only for a Battle created with preset tiles (tests, tools): skipped deployment and initiative. */
  readonly preset?: {
    readonly tiles: Readonly<Record<Side, readonly [Tile, Tile, Tile]>>
    readonly firstSide: Side
  }
  readonly meta?: ReplayMeta
  /** Every accepted action of the Battle, in order. */
  readonly actions: readonly A[]
}

const ID = z.string().regex(/^[a-z][a-z0-9_]*$/, 'id must be snake_case')
const SideSchema = z.enum(SIDES)
const TileSchema = z.strictObject({ x: z.int(), y: z.int() })
const TilesSchema = z.tuple([TileSchema, TileSchema, TileSchema])

const ReplayActionSchema = z.looseObject({ type: z.string().min(1) })
const UndoRecordSchema = z.looseObject({ type: z.literal(UNDO_RECORD_TYPE), withdraw: z.int().min(1) })

const ReplayShape = z.strictObject({
  format: z.literal(REPLAY_FORMAT),
  formatVersion: z.union([z.literal(1), z.literal(2)]),
  engineVersion: z.string().regex(/^\d+\.\d+\.\d+$/, 'engine version must be semver, e.g. "0.1.0"'),
  dataHash: z.string().regex(/^[0-9a-f]{64}$/, 'data hash must be 64 lowercase hex digits'),
  scenarioId: ID,
  boardId: ID,
  mode: z.enum(BATTLE_MODES),
  humanSide: SideSchema.exactOptional(),
  diceSeed: z.string().regex(/^[0-9a-f]{16}$/i, 'Dice Seed must be 16 hex digits'),
  preset: z
    .strictObject({
      tiles: z.strictObject({ A: TilesSchema, B: TilesSchema }),
      firstSide: SideSchema,
    })
    .exactOptional(),
  meta: z
    .strictObject({
      appVersion: z.string().exactOptional(),
      createdAt: z.iso.datetime().exactOptional(),
      stats: z.unknown().exactOptional(),
    })
    .exactOptional(),
  actions: z.array(ReplayActionSchema),
})

export const ReplaySchema: z.ZodType<Replay> = ReplayShape.superRefine((replay, ctx) => {
  for (const [index, action] of replay.actions.entries()) {
    if (action.type !== UNDO_RECORD_TYPE) continue
    if (replay.formatVersion < 2) {
      ctx.addIssue({ code: 'custom', path: ['actions', index, 'type'], message: 'undo needs Replay format 2' })
    } else if (!UndoRecordSchema.safeParse(action).success) {
      ctx.addIssue({ code: 'custom', path: ['actions', index, 'withdraw'], message: 'withdraw must be a whole number of 1 or more' })
    }
  }
})

export type ParseReplayResult =
  | { readonly ok: true; readonly replay: Replay }
  /** `issues`: developer-facing, one per problem, e.g. "actions.3.type: …". */
  | { readonly ok: false; readonly issues: readonly string[] }

/** Check parsed JSON against the Replay schema. */
export function parseReplay(json: unknown): ParseReplayResult {
  const result = ReplaySchema.safeParse(json)
  if (result.success) return { ok: true, replay: result.data }
  return {
    ok: false,
    issues: result.error.issues.map((issue) => `${issue.path.join('.') || '(file)'}: ${issue.message}`),
  }
}

/** Read the text of a Replay file: JSON, then the schema. */
export function parseReplayText(text: string): ParseReplayResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch (error) {
    return { ok: false, issues: [`(file): not JSON (${error instanceof Error ? error.message : String(error)})`] }
  }
  return parseReplay(json)
}

/**
 * The text of a Replay file: the header indented, then one action per line,
 * so files diff and read well. `parseReplayText` reads it back unchanged.
 */
export function serializeReplay(replay: Replay): string {
  const { actions, ...header } = replay
  const head = JSON.stringify(header, null, 2)
  const lines = actions.map((action) => `    ${JSON.stringify(action)}`)
  const list = lines.length === 0 ? '[]' : `[\n${lines.join(',\n')}\n  ]`
  return `${head.slice(0, -2)},\n  "actions": ${list}\n}\n`
}
