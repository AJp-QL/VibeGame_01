import { describe, expect, it } from 'vitest'
import {
  diceStream,
  nextUint32,
  rollDie,
  seedXoshiro128,
  type DiceStream,
  type Xoshiro128State,
} from '../src/index.ts'
import { scenario1Battle } from './fixtures.ts'

// ---------------------------------------------------------------------------
// Independent reference: a line-by-line BigInt port of the C reference
// xoshiro128starstar.c 1.1 and splitmix64.c (prng.di.unimi.it). uint32_t and
// uint64_t arithmetic is modelled by masking after every operation, so this
// shares no code or tricks (Math.imul, >>> 0) with the engine.
// ---------------------------------------------------------------------------
const M32 = 0xffffffffn
const M64 = 0xffffffffffffffffn

function referenceXoshiro(seed: readonly bigint[]): () => bigint {
  const s = [...seed]
  const rotl = (x: bigint, k: bigint) => ((x << k) | (x >> (32n - k))) & M32
  return () => {
    const [s0 = 0n, s1 = 0n] = s
    const result = (rotl((s1 * 5n) & M32, 7n) * 9n) & M32
    const t = (s1 << 9n) & M32
    s[2] = (s[2] ?? 0n) ^ s0
    s[3] = (s[3] ?? 0n) ^ s1
    s[1] = s1 ^ s[2]
    s[0] = s0 ^ s[3]
    s[2] = s[2] ^ t
    s[3] = rotl(s[3], 11n)
    return result
  }
}

function referenceSplitmix64(seed: bigint): () => bigint {
  let x = seed
  return () => {
    x = (x + 0x9e3779b97f4a7c15n) & M64
    let z = x
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & M64
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & M64
    return z ^ (z >> 31n)
  }
}

function engineOutputs(state: Xoshiro128State, count: number): number[] {
  const values: number[] = []
  let s = state
  for (let i = 0; i < count; i++) {
    const next = nextUint32(s)
    values.push(next.value)
    s = next.state
  }
  return values
}

describe('PRNG: xoshiro128** 1.1 (rules §21.5)', () => {
  it('matches the test vector in rules §21.5 item 5', () => {
    expect(engineOutputs([1, 2, 3, 4], 6)).toEqual([11520, 0, 5927040, 70819200, 2031721883, 1637235492])
  })

  it('the rules test vector agrees with the C reference algorithm', () => {
    const next = referenceXoshiro([1n, 2n, 3n, 4n])
    const reference = Array.from({ length: 6 }, () => Number(next()))
    expect(reference).toEqual([11520, 0, 5927040, 70819200, 2031721883, 1637235492])
  })

  it('agrees with the C reference for 10 000 outputs from seeded states', () => {
    for (const seed of ['0000000000000000', '0123456789abcdef', 'ffffffffffffffff']) {
      const state = seedXoshiro128(seed)
      const next = referenceXoshiro(state.map(BigInt))
      const reference = Array.from({ length: 10_000 }, () => Number(next()))
      expect(engineOutputs(state, 10_000)).toEqual(reference)
    }
  })

  it('seeds the state from a Dice Seed with SplitMix64, hi then lo words', () => {
    for (const seed of ['0000000000000000', '0123456789abcdef', 'deadbeefcafef00d']) {
      const next = referenceSplitmix64(BigInt(`0x${seed}`))
      const a = next()
      const b = next()
      const expected = [a >> 32n, a & M32, b >> 32n, b & M32].map(Number)
      expect(seedXoshiro128(seed)).toEqual(expected)
    }
  })

  it('rejects a Dice Seed that is not 16 hex digits', () => {
    expect(() => seedXoshiro128('123')).toThrow()
    expect(() => seedXoshiro128('0123456789abcdeg')).toThrow()
    expect(() => scenario1Battle({ dice: { seed: 'not a seed' } })).toThrow()
  })
})

describe('dice: dN from the stream (rules §21.5 item 3)', () => {
  function rolls(stream: DiceStream, sides: number, count: number): number[] {
    const values: number[] = []
    for (let i = 0; i < count; i++) {
      const roll = rollDie(stream, sides)
      values.push(roll.value)
      stream = roll.stream
    }
    return values
  }

  it('maps raw values to 1..N with rejection, matching the reference', () => {
    const seed = '0123456789abcdef'
    for (const sides of [4, 6, 8, 20]) {
      const next = referenceXoshiro(seedXoshiro128(seed).map(BigInt))
      const limit = 2n ** 32n % BigInt(sides)
      const expected = Array.from({ length: 2000 }, () => {
        for (;;) {
          const x = next()
          if (x >= limit) return Number((x % BigInt(sides)) + 1n)
        }
      })
      expect(rolls(diceStream({ seed }), sides, 2000)).toEqual(expected)
    }
  })

  it('the same Dice Seed always gives the same rolls; another seed gives others', () => {
    const a = rolls(diceStream({ seed: 'deadbeefcafef00d' }), 20, 50)
    expect(rolls(diceStream({ seed: 'deadbeefcafef00d' }), 20, 50)).toEqual(a)
    expect(rolls(diceStream({ seed: 'deadbeefcafef00e' }), 20, 50)).not.toEqual(a)
    expect(a.every((v) => Number.isInteger(v) && v >= 1 && v <= 20)).toBe(true)
  })

  it('does not change the stream it was given', () => {
    const stream = diceStream({ seed: 'deadbeefcafef00d' })
    const copy = structuredClone(stream)
    rollDie(stream, 20)
    expect(stream).toEqual(copy)
  })
})

describe('scripted dice travel through the same channel as a Dice Seed', () => {
  it('a Battle created with scripted rolls yields exactly those rolls', () => {
    const state = scenario1Battle({ dice: { rolls: [17, 1, 6] } })
    const first = rollDie(state.dice, 20)
    const second = rollDie(first.stream, 20)
    const third = rollDie(second.stream, 6)
    expect([first.value, second.value, third.value]).toEqual([17, 1, 6])
  })

  it('a scripted roll the die cannot show, or a missing roll, is a test error', () => {
    const stream = diceStream({ rolls: [7] })
    expect(() => rollDie(stream, 6)).toThrow(/d6/)
    expect(() => rollDie(rollDie(stream, 8).stream, 8)).toThrow(/ran out/)
  })
})
