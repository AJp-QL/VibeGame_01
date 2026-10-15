/**
 * The dice stream of a Battle (rules §21.1, §21.4, §21.5).
 *
 * A Battle's only source of randomness. It is either seeded from a Dice Seed
 * (xoshiro128** 1.1, state initialised with SplitMix64) or a scripted list of
 * roll results for tests. Both travel through the same `DiceSource` parameter
 * and the same `rollDie` call, so rules code never knows which one it has.
 *
 * Everything is plain data and pure functions: the stream lives inside the
 * Battle state and `rollDie` returns the advanced stream.
 */

/** xoshiro128** state: four uint32 words, not all zero. */
export type Xoshiro128State = readonly [number, number, number, number]

/** How a Battle gets its dice: a Dice Seed, or scripted results for tests. */
export type DiceSource =
  /** Dice Seed: a 64-bit value written as 16 hex digits (rules §21.5 item 2). */
  | { readonly seed: string }
  /** Scripted roll results, consumed in order; each must fit the die rolled. */
  | { readonly rolls: readonly number[] }

export type DiceStream =
  | { readonly kind: 'seeded'; readonly state: Xoshiro128State }
  | { readonly kind: 'scripted'; readonly rolls: readonly number[]; readonly position: number }

const DICE_SEED = /^[0-9a-f]{16}$/i

export function isDiceSeed(seed: string): boolean {
  return DICE_SEED.test(seed)
}

/** Turn a DiceSource into the stream stored in the Battle state. */
export function diceStream(source: DiceSource): DiceStream {
  if ('seed' in source) return { kind: 'seeded', state: seedXoshiro128(source.seed) }
  return { kind: 'scripted', rolls: [...source.rolls], position: 0 }
}

const rotl = (x: number, k: number): number => ((x << k) | (x >>> (32 - k))) >>> 0

/**
 * One step of xoshiro128** 1.1 (rules §21.5 item 1): returns the next raw
 * uint32 and the next state. 32-bit integer arithmetic only (Math.imul, >>> 0).
 */
export function nextUint32(state: Xoshiro128State): { value: number; state: Xoshiro128State } {
  let [s0, s1, s2, s3] = state
  const value = Math.imul(rotl(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0
  const t = (s1 << 9) >>> 0
  s2 = (s2 ^ s0) >>> 0
  s3 = (s3 ^ s1) >>> 0
  s1 = (s1 ^ s2) >>> 0
  s0 = (s0 ^ s3) >>> 0
  s2 = (s2 ^ t) >>> 0
  s3 = rotl(s3, 11)
  return { value, state: [s0, s1, s2, s3] }
}

const MASK64 = (1n << 64n) - 1n

/**
 * Initial xoshiro128** state from a Dice Seed (rules §21.5 item 2): two
 * SplitMix64 outputs, each split into its high then low uint32. BigInt is used
 * only here, for SplitMix64's 64-bit multiply.
 */
export function seedXoshiro128(seed: string): Xoshiro128State {
  if (!isDiceSeed(seed)) {
    throw new Error(`Dice Seed must be 16 hex digits, got "${seed}"`)
  }
  let x = BigInt(`0x${seed}`)
  const splitmix64 = (): bigint => {
    x = (x + 0x9e3779b97f4a7c15n) & MASK64
    let z = x
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK64
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK64
    return z ^ (z >> 31n)
  }
  const a = splitmix64()
  const b = splitmix64()
  const words = [a >> 32n, a & 0xffffffffn, b >> 32n, b & 0xffffffffn].map(Number)
  return [words[0] ?? 0, words[1] ?? 0, words[2] ?? 0, words[3] ?? 0]
}

const TWO_POW_32 = 4294967296

/**
 * Roll one die with `sides` faces: 1..sides (rules §21.5 item 3).
 * Seeded: unbiased by rejection (redraw while x < 2^32 mod sides).
 * Scripted: takes the next scripted result; a missing or out-of-range result
 * is a mistake in the test and throws.
 */
export function rollDie(stream: DiceStream, sides: number): { value: number; stream: DiceStream } {
  if (!Number.isInteger(sides) || sides < 2) throw new Error(`Cannot roll a d${sides}`)

  if (stream.kind === 'scripted') {
    const value = stream.rolls[stream.position]
    if (value === undefined) {
      throw new Error(`Scripted dice ran out after ${stream.position} rolls (needed a d${sides})`)
    }
    if (!Number.isInteger(value) || value < 1 || value > sides) {
      throw new Error(`Scripted roll #${stream.position + 1} is ${value}, which a d${sides} cannot roll`)
    }
    return { value, stream: { ...stream, position: stream.position + 1 } }
  }

  const limit = TWO_POW_32 % sides
  let state = stream.state
  for (;;) {
    const next = nextUint32(state)
    state = next.state
    if (next.value >= limit) {
      return { value: (next.value % sides) + 1, stream: { kind: 'seeded', state } }
    }
  }
}
