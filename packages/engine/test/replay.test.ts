import { describe, expect, it } from 'vitest'
import {
  dataHash,
  parseReplayText,
  serializeReplay,
  tileFromName,
  type GameData,
  type Replay,
  type Tile,
} from '@mt/shared'
import {
  applyAction,
  createBattle,
  ENGINE_VERSION,
  legalActions,
  nextUint32,
  recordReplay,
  replayBattle,
  replayCompatibility,
  seedXoshiro128,
  type Action,
  type BattleEvent,
  type BattleReplay,
  type BattleState,
  type ReplayHeader,
  type ReplayResult,
  type Xoshiro128State,
} from '../src/index.ts'
import { gameData } from './fixtures.ts'

// Replay (CONTEXT.md): the Dice Seed of a Battle plus every action in order
// plays the same Battle again, every time.

interface Played {
  readonly header: ReplayHeader
  readonly actions: readonly Action[]
  readonly states: readonly BattleState[]
  readonly events: readonly BattleEvent[]
  readonly final: BattleState
}

/**
 * Play a Battle by picking legal actions with a chooser seeded from its own
 * stream (never the Battle's dice): confirm deployment as soon as it is legal,
 * attack whenever possible, otherwise usually Move and sometimes end the Turn.
 */
function playBattle(header: ReplayHeader, data: GameData = gameData, maxActions = 600): Played {
  const scenario = data.scenarios[header.scenarioId]!
  const board = data.boards[header.boardId]!
  let state = createBattle({
    scenario,
    board,
    species: data.species,
    skills: data.skills,
    dice: { seed: header.diceSeed },
    ...(header.preset ? { preset: header.preset } : {}),
  })
  let chooser: Xoshiro128State = seedXoshiro128(header.diceSeed.split('').reverse().join(''))
  const pick = <T>(list: readonly T[]): T => {
    const next = nextUint32(chooser)
    chooser = next.state
    return list[next.value % list.length]!
  }
  const actions: Action[] = []
  const states: BattleState[] = []
  const events: BattleEvent[] = []
  while (actions.length < maxActions) {
    const legal = legalActions(state)
    if (legal.length === 0) break
    const confirm = legal.find((a) => a.type === 'confirmDeployment')
    const attacks = legal.filter((a) => a.type === 'basicAttack')
    const moves = legal.filter((a) => a.type === 'move' || a.type === 'deploy')
    const endTurn = legal.find((a) => a.type === 'endTurn')
    const action =
      confirm ??
      (attacks.length > 0 ? pick(attacks) : moves.length > 0 && pick([0, 1, 2, 3]) !== 0 ? pick(moves) : endTurn ?? pick(legal))
    const result = applyAction(state, action)
    if (!result.ok) throw new Error(`legal action rejected: ${result.rejection.message}`)
    state = result.state
    actions.push(action)
    states.push(state)
    events.push(...result.events)
  }
  return { header, actions, states, events, final: state }
}

/** Record → write the file → read it back → replay: the full round trip a playtester's file makes. */
function roundTrip(played: Played): ReplayResult {
  const replay = recordReplay(played.header, gameData, played.actions, {
    appVersion: 'test',
    createdAt: '2026-10-15T12:00:00.000Z',
  })
  const parsed = parseReplayText(serializeReplay(replay))
  if (!parsed.ok) throw new Error(parsed.issues.join('\n'))
  return replayBattle(parsed.replay, gameData)
}

function okResult(result: ReplayResult) {
  if (!result.ok) throw new Error(`replay failed: ${JSON.stringify(result.error)}`)
  return result
}

const SEEDS = [
  '0000000000000001',
  '0123456789abcdef',
  'fedcba9876543210',
  'deadbeefcafef00d',
  '1111111111111111',
  '8badf00d8badf00d',
]

const tiles = (names: readonly [string, string, string]) =>
  names.map(tileFromName) as unknown as readonly [Tile, Tile, Tile]

describe('Replay of a Battle', () => {
  it('replays Battles through deployment and initiative to the same final state, for many Dice Seeds, Scenarios and Boards', () => {
    let ended = 0
    let played = 0
    for (const diceSeed of SEEDS) {
      for (const scenarioId of ['scenario_1', 'scenario_2']) {
        for (const boardId of ['crossroads', 'shallows']) {
          const game = playBattle({ scenarioId, boardId, mode: 'hotseat', diceSeed })
          const result = okResult(roundTrip(game))
          expect(result.final).toEqual(game.final)
          expect(result.steps.map((s) => s.state)).toEqual(game.states)
          expect(result.steps.flatMap((s) => s.events)).toEqual(game.events)
          // Deployment and initiative really were part of it.
          expect(result.initial.phase).toBe('deployment')
          expect(result.final.initiative).not.toBeNull()
          played++
          if (game.final.outcome !== null) ended++
        }
      }
    }
    expect(played).toBe(SEEDS.length * 4)
    // Most of these Battles run to a winner, so whole Battles are covered, not just openings.
    expect(ended).toBeGreaterThan(played / 2)
  })

  it('gives the same result every time it is replayed', () => {
    const game = playBattle({ scenarioId: 'scenario_1', boardId: 'crossroads', mode: 'hotseat', diceSeed: SEEDS[1]! })
    const replay = recordReplay(game.header, gameData, game.actions)
    const first = okResult(replayBattle(replay, gameData))
    const second = okResult(replayBattle(replay, gameData))
    expect(second.final).toEqual(first.final)
    expect(JSON.stringify(second.steps)).toBe(JSON.stringify(first.steps))
  })

  it('replays a Battle that started from preset tiles', () => {
    const header: ReplayHeader = {
      scenarioId: 'scenario_2',
      boardId: 'shallows',
      mode: 'hotseat',
      diceSeed: SEEDS[3]!,
      preset: { tiles: { A: tiles(['d1', 'c2', 'e2']), B: tiles(['d7', 'e6', 'c6']) }, firstSide: 'B' },
    }
    const game = playBattle(header)
    const result = okResult(roundTrip(game))
    expect(result.initial.phase).toBe('play')
    expect(result.final).toEqual(game.final)
  })

  it('replays a Battle abandoned part-way to the state it was left in', () => {
    const game = playBattle({ scenarioId: 'scenario_1', boardId: 'shallows', mode: 'hotseat', diceSeed: SEEDS[2]! }, gameData, 25)
    expect(game.final.outcome).toBeNull()
    const result = okResult(roundTrip(game))
    expect(result.steps).toHaveLength(25)
    expect(result.final).toEqual(game.states[24])
  })

  it('replays an empty action list to the Battle as created', () => {
    const header: ReplayHeader = { scenarioId: 'scenario_1', boardId: 'crossroads', mode: 'hotseat', diceSeed: SEEDS[0]! }
    const result = okResult(replayBattle(recordReplay(header, gameData, []), gameData))
    expect(result.steps).toEqual([])
    expect(result.final).toBe(result.initial)
  })

  it('records the header, the engine version and the data hash', () => {
    const replay = recordReplay(
      { scenarioId: 'scenario_2', boardId: 'crossroads', mode: 'ai', humanSide: 'B', diceSeed: SEEDS[4]! },
      gameData,
      [{ type: 'confirmDeployment' }],
      { appVersion: 'v0.1.0' },
    )
    expect(replay).toEqual({
      format: 'monster-tactics-replay',
      formatVersion: 1,
      engineVersion: ENGINE_VERSION,
      dataHash: dataHash(gameData),
      scenarioId: 'scenario_2',
      boardId: 'crossroads',
      mode: 'ai',
      humanSide: 'B',
      diceSeed: SEEDS[4],
      meta: { appVersion: 'v0.1.0' },
      actions: [{ type: 'confirmDeployment' }],
    })
  })
})

describe('Replay compatibility', () => {
  const game = playBattle({ scenarioId: 'scenario_1', boardId: 'crossroads', mode: 'hotseat', diceSeed: SEEDS[5]! })
  const replay: BattleReplay = recordReplay(game.header, gameData, game.actions)

  it('accepts a Replay recorded by this engine version with this data', () => {
    expect(replayCompatibility(replay, gameData)).toEqual({ compatible: true })
  })

  it('rejects a Replay whose data hash does not match, reporting both hashes, and does not replay it', () => {
    const other = { ...replay, dataHash: 'f'.repeat(64) }
    const mismatch = { field: 'dataHash', replay: 'f'.repeat(64), current: dataHash(gameData) }
    expect(replayCompatibility(other, gameData)).toEqual({ compatible: false, mismatches: [mismatch] })
    expect(replayBattle(other, gameData)).toEqual({ ok: false, error: { kind: 'incompatible', mismatches: [mismatch] } })
  })

  it('rejects a Replay played with numbers that have since changed', () => {
    const tuned: GameData = structuredClone(gameData)
    ;(tuned.species.fangrel as { guardBonus: number }).guardBonus += 1
    const result = replayBattle(replay, tuned)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toEqual({
        kind: 'incompatible',
        mismatches: [{ field: 'dataHash', replay: replay.dataHash, current: dataHash(tuned) }],
      })
    }
  })

  it('rejects a Replay recorded by another engine version, reporting both versions', () => {
    const old: Replay = { ...replay, engineVersion: '0.0.1' }
    expect(replayCompatibility(old, gameData)).toEqual({
      compatible: false,
      mismatches: [{ field: 'engineVersion', replay: '0.0.1', current: ENGINE_VERSION }],
    })
    const both: Replay = { ...old, dataHash: '0'.repeat(64) }
    const result = replayBattle(both, gameData)
    expect(!result.ok && result.error.kind === 'incompatible' && result.error.mismatches.map((m) => m.field)).toEqual([
      'engineVersion',
      'dataHash',
    ])
  })
})

describe('A changed or broken Replay', () => {
  const game = playBattle({ scenarioId: 'scenario_1', boardId: 'crossroads', mode: 'hotseat', diceSeed: SEEDS[1]! })
  const replay: Replay = recordReplay(game.header, gameData, game.actions)
  const firstMove = game.actions.findIndex((a) => a.type === 'move')

  function withAction(index: number, action: Replay['actions'][number]): Replay {
    return { ...replay, actions: replay.actions.map((a, i) => (i === index ? action : a)) }
  }

  function rejectedAt(result: ReplayResult) {
    if (result.ok || result.error.kind !== 'rejected') throw new Error(`expected a rejected action, got ${JSON.stringify(result)}`)
    return { index: result.error.index, code: result.error.rejection.code }
  }

  it('fails at the action that was changed to an illegal one', () => {
    const moved = game.actions[firstMove] as Extract<Action, { type: 'move' }>
    const result = replayBattle(withAction(firstMove, { ...moved, to: { x: 9, y: 9 } }), gameData)
    expect(rejectedAt(result)).toEqual({ index: firstMove, code: 'off-board' })
  })

  it('fails at an action the engine does not know', () => {
    expect(rejectedAt(replayBattle(withAction(firstMove, { type: 'teleport' }), gameData))).toEqual({
      index: firstMove,
      code: 'unknown-action',
    })
  })

  it('fails at an action with missing fields instead of crashing', () => {
    const moved = game.actions[firstMove] as Extract<Action, { type: 'move' }>
    expect(rejectedAt(replayBattle(withAction(firstMove, { type: 'move', unit: moved.unit }), gameData))).toEqual({
      index: firstMove,
      code: 'unknown-action',
    })
    expect(rejectedAt(replayBattle(withAction(firstMove, { type: 'move' }), gameData))).toEqual({
      index: firstMove,
      code: 'unknown-unit',
    })
  })

  it('fails where an inserted action no longer fits', () => {
    const inserted: Replay = { ...replay, actions: [{ type: 'endTurn' }, ...replay.actions] }
    expect(rejectedAt(replayBattle(inserted, gameData))).toEqual({ index: 0, code: 'wrong-phase' })
  })

  it('fails when an action was dropped', () => {
    const confirm = replay.actions.findIndex((a) => a.type === 'confirmDeployment')
    const dropped: Replay = { ...replay, actions: replay.actions.filter((_, i) => i !== confirm) }
    // Team B's placements now come while team A is still placing.
    expect(rejectedAt(replayBattle(dropped, gameData))).toEqual({ index: confirm, code: 'not-your-turn' })
  })

  it('reports a Scenario or Board this data does not have', () => {
    const result = replayBattle({ ...replay, boardId: 'nowhere' }, gameData)
    expect(result).toEqual({ ok: false, error: { kind: 'setup', message: 'Unknown Board "nowhere"' } })
  })
})
