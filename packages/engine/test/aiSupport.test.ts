import { describe, expect, it } from 'vitest'
import {
  aiDiceStream,
  diceStream,
  jumpXoshiro128,
  legalActions,
  nextUint32,
  previewAction,
  previewAttackWhatIf,
  type Xoshiro128State,
} from '../src/index.ts'
import { scenario1Battle } from './fixtures.ts'

// Exports for the AI (ticket 15). They add no rule and change no behaviour.

/** The xoshiro128** state transition as a 128×128 matrix over GF(2): one BigInt column per input bit. */
function transitionColumns(): bigint[] {
  const toBits = (s: Xoshiro128State) => s.reduce((acc, word, i) => acc | (BigInt(word) << BigInt(32 * i)), 0n)
  const fromBits = (b: bigint): Xoshiro128State => {
    const w = (i: number) => Number((b >> BigInt(32 * i)) & 0xffffffffn)
    return [w(0), w(1), w(2), w(3)]
  }
  const columns: bigint[] = []
  for (let i = 0; i < 128; i++) columns.push(toBits(nextUint32(fromBits(1n << BigInt(i))).state))
  return columns
}

function applyMatrix(columns: readonly bigint[], v: bigint): bigint {
  let out = 0n
  for (let i = 0; i < 128; i++) if ((v >> BigInt(i)) & 1n) out ^= columns[i]!
  return out
}

describe('jumpXoshiro128 (rules §21.5 item 4)', () => {
  it('equals 2^64 steps of the generator: the transition matrix squared 64 times', () => {
    let columns = transitionColumns()
    for (let k = 0; k < 64; k++) columns = columns.map((c) => applyMatrix(columns, c))
    const start: Xoshiro128State = [0x12345678, 0x9abcdef0, 0x0fedcba9, 0x87654321]
    const bits = start.reduce((acc, word, i) => acc | (BigInt(word) << BigInt(32 * i)), 0n)
    const expected = applyMatrix(columns, bits)
    const jumped = jumpXoshiro128(start)
    expect(jumped.reduce((acc, word, i) => acc | (BigInt(word) << BigInt(32 * i)), 0n)).toBe(expected)
  })

  it('aiDiceStream jumps a copy of the Battle stream and leaves the Battle stream alone', () => {
    const battle = diceStream({ seed: '0123456789abcdef' })
    const before = JSON.stringify(battle)
    const ai = aiDiceStream(battle)
    expect(JSON.stringify(battle)).toBe(before)
    expect(ai).toEqual({ kind: 'seeded', state: jumpXoshiro128(battle.kind === 'seeded' ? battle.state : [1, 0, 0, 0]) })
    expect(aiDiceStream(diceStream({ rolls: [1, 2] })).kind).toBe('seeded')
  })
})

describe('previewAttackWhatIf', () => {
  it('matches previewAction for a legal attack', () => {
    const state = scenario1Battle({ tiles: { A: ['a1', 'd3', 'g1'], B: ['a7', 'd4', 'g7'] } })
    const action = legalActions(state).find((a) => a.type === 'basicAttack')
    if (action?.type !== 'basicAttack') throw new Error('expected a Basic Attack')
    const preview = previewAction(state, action)
    expect(preview.ok && preview.preview).toEqual(previewAttackWhatIf(state, action.unit, action.target, 'basic_attack'))
  })

  it('previews from other tiles without checking whose Turn it is, and changes nothing', () => {
    const state = scenario1Battle()
    const snapshot = JSON.stringify(state)
    const preview = previewAttackWhatIf(state, 'B.m2', 'A.m1', 'long_shot', { attackerTile: { x: 2, y: 4 } })
    expect(preview.distance).toBe(3)
    expect(preview.damage?.dice).toEqual({ count: 1, sides: 8 })
    expect(JSON.stringify(state)).toBe(snapshot)
  })
})
