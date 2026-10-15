import { describe, expect, it } from 'vitest'
import { parseReplay, parseReplayText, serializeReplay, type Replay } from '../src/index.ts'

const VALID: Replay = {
  format: 'monster-tactics-replay',
  formatVersion: 1,
  engineVersion: '0.1.0',
  dataHash: 'ab'.repeat(32),
  scenarioId: 'scenario_1',
  boardId: 'shallows',
  mode: 'hotseat',
  diceSeed: '0123456789abcdef',
  meta: { appVersion: 'v0.1.0', createdAt: '2026-10-15T09:30:00.000Z', stats: { battles: 3 } },
  actions: [
    { type: 'deploy', unit: 'A.tamer', to: { x: 3, y: 0 } },
    { type: 'confirmDeployment' },
    { type: 'basicAttack', unit: 'A.m1', target: 'B.m2' },
    // A future action type: the engine, not the schema, decides whether it is legal.
    { type: 'useInspiration', reroll: true },
  ],
}

function issues(json: unknown): readonly string[] {
  const result = parseReplay(json)
  if (result.ok) throw new Error('expected the Replay to be rejected')
  return result.issues
}

describe('Replay file format', () => {
  it('accepts a well-formed Replay and keeps it unchanged', () => {
    expect(parseReplay(VALID)).toEqual({ ok: true, replay: VALID })
  })

  it('accepts a Replay with preset tiles and no metadata', () => {
    const { meta: _meta, ...bare } = VALID
    const preset = {
      tiles: {
        A: [{ x: 3, y: 0 }, { x: 2, y: 1 }, { x: 4, y: 1 }],
        B: [{ x: 3, y: 6 }, { x: 4, y: 5 }, { x: 2, y: 5 }],
      },
      firstSide: 'B',
    }
    expect(parseReplay({ ...bare, mode: 'ai', humanSide: 'A', preset }).ok).toBe(true)
  })

  it('reads back the text it writes, one action per line', () => {
    const text = serializeReplay(VALID)
    expect(text).toContain('\n    {"type":"confirmDeployment"},\n')
    expect(parseReplayText(text)).toEqual({ ok: true, replay: VALID })
    expect(parseReplayText(serializeReplay({ ...VALID, actions: [] }))).toEqual({
      ok: true,
      replay: { ...VALID, actions: [] },
    })
  })

  it('rejects a file that is not JSON', () => {
    const result = parseReplayText('{"format": "monster-tactics-replay",')
    expect(result.ok).toBe(false)
    expect(!result.ok && result.issues[0]).toMatch(/^\(file\): not JSON/)
  })

  it('rejects JSON that is not a Replay', () => {
    expect(issues({ hello: 'world' }).length).toBeGreaterThan(0)
    expect(issues([])).toHaveLength(1)
    expect(issues({ ...VALID, format: 'something-else' })[0]).toMatch(/^format:/)
    expect(issues({ ...VALID, formatVersion: 2 })[0]).toMatch(/^formatVersion:/)
  })

  it('rejects a Replay with a missing or malformed field, naming the field', () => {
    const { diceSeed: _seed, ...noSeed } = VALID
    expect(issues(noSeed)[0]).toMatch(/^diceSeed:/)
    expect(issues({ ...VALID, diceSeed: '12345' })[0]).toMatch(/^diceSeed:/)
    expect(issues({ ...VALID, dataHash: 'not-a-hash' })[0]).toMatch(/^dataHash:/)
    expect(issues({ ...VALID, engineVersion: 'latest' })[0]).toMatch(/^engineVersion:/)
    expect(issues({ ...VALID, mode: 'online' })[0]).toMatch(/^mode:/)
    expect(issues({ ...VALID, humanSide: 'C' })[0]).toMatch(/^humanSide:/)
    expect(issues({ ...VALID, boardId: 'Big Board' })[0]).toMatch(/^boardId:/)
    expect(issues({ ...VALID, meta: { createdAt: 'yesterday' } })[0]).toMatch(/^meta\.createdAt:/)
    expect(issues({ ...VALID, extra: 1 }).length).toBeGreaterThan(0)
  })

  it('rejects an action list with something that is not an action, naming its index', () => {
    expect(issues({ ...VALID, actions: 'all of them' })[0]).toMatch(/^actions:/)
    expect(issues({ ...VALID, actions: [{ type: 'endTurn' }, { unit: 'A.m1' }] })[0]).toMatch(/^actions\.1\.type:/)
    expect(issues({ ...VALID, actions: [{ type: 'endTurn' }, 'endTurn'] })[0]).toMatch(/^actions\.1:/)
    expect(issues({ ...VALID, actions: [{ type: '' }] })[0]).toMatch(/^actions\.0\.type:/)
  })
})
