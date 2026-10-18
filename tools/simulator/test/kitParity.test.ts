import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { EXTRA_MOUNTAINS, LEGACY_RANGES } from '../src/variants.ts'

// The ranges and mountains from before phase 1.x ticket 09 (D-31) are written out in four places that
// cannot import each other (a package's tests do not import tools, and tools do not import tests):
//   tools/simulator/src/variants.ts            the source of truth (also the sim-equivalent data)
//   packages/engine/test/fixtures.ts            the kit of the rule tests
//   packages/session/test/kit.ts                the kit of the session tests
//   packages/ai/test/simParity/rebuild.ts       sim v4 parity
// This test reads the other three as text and checks that they say the same as variants.ts.

const REPO = fileURLToPath(new URL('../../../', import.meta.url))
const source = (path: string): string => readFileSync(`${REPO}${path}`, 'utf8')

/** `long_shot: 4, element_bolt: 4, …` out of the `{ … }` that follows `name`. */
function rangesIn(text: string, name: string): Record<string, number> {
  const body = new RegExp(`${name}[^=]*=\\s*\\{([^}]*)\\}`).exec(text)?.[1]
  if (body === undefined) throw new Error(`no ${name}`)
  return Object.fromEntries([...body.matchAll(/(\w+):\s*(\d+)/g)].map((m) => [m[1]!, Number(m[2])]))
}

/** The `[x, y]` pairs written after `label` up to the end of that line or of the array. */
function pairs(text: string): [number, number][] {
  return [...text.matchAll(/\[(\d+),\s*(\d+)\]/g)].map((m) => [Number(m[1]), Number(m[2])])
}

function mountainsIn(text: string, name: string): Record<string, [number, number][]> {
  const start = text.indexOf(`const ${name}`)
  if (start < 0) throw new Error(`no ${name}`)
  const declaration = text.slice(start, text.indexOf('\n\n', start) < 0 ? undefined : text.indexOf('\n\n', start))
  const named = [...declaration.matchAll(/(crossroads|shallows):\s*(\[[^\n]*\])/g)]
  // A list with no Board names is Crossroads.
  if (named.length === 0) return { crossroads: pairs(declaration.slice(declaration.indexOf('='))) }
  return Object.fromEntries(named.map((m) => [m[1]!, pairs(m[2]!)]))
}

describe('the kit before ticket 09 is written the same everywhere', () => {
  it('the four skill ranges', () => {
    expect(rangesIn(source('packages/engine/test/fixtures.ts'), 'KIT_RANGES')).toEqual(LEGACY_RANGES)
    expect(rangesIn(source('packages/session/test/kit.ts'), 'KIT_RANGES')).toEqual(LEGACY_RANGES)
    expect(rangesIn(source('packages/ai/test/simParity/rebuild.ts'), 'SIM_RANGES')).toEqual(LEGACY_RANGES)
  })

  it('the extra mountain tiles', () => {
    const expected = Object.fromEntries(Object.entries(EXTRA_MOUNTAINS).map(([id, tiles]) => [id, tiles.map(([x, y]) => [x, y])]))
    expect(mountainsIn(source('packages/engine/test/fixtures.ts'), 'EXTRA_MOUNTAINS')).toEqual(expected)
    // The session kit and sim v4 parity only have Crossroads.
    expect(mountainsIn(source('packages/session/test/kit.ts'), 'EXTRA_MOUNTAINS')).toEqual({ crossroads: expected.crossroads })
    expect(mountainsIn(source('packages/ai/test/simParity/rebuild.ts'), 'EXTRA_MOUNTAINS')).toEqual({ crossroads: expected.crossroads })
  })
})
