import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { canonicalJson, dataHash, loadGameData, sha256Hex } from '../src/index.ts'
import { DATA_DIR, readDataDir } from './readDataDir.ts'

const nodeSha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex')

/** Web Crypto: the SHA-256 a browser has (Node 24 has the same API on globalThis). */
async function webCryptoSha256(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Every data file as raw text, keyed by "<folder>/<file>.json". */
function dataTexts(): Record<string, string> {
  const texts: Record<string, string> = {}
  for (const entry of readdirSync(DATA_DIR, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue
    const fullPath = join(entry.parentPath, entry.name)
    texts[relative(DATA_DIR, fullPath).split(sep).join('/')] = readFileSync(fullPath, 'utf8')
  }
  return texts
}

/** The same value with every object's keys in reverse order. */
function reverseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseKeys)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .reverse()
        .map(([key, item]) => [key, reverseKeys(item)]),
    )
  }
  return value
}

describe('SHA-256', () => {
  it('matches the FIPS 180-4 examples', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    )
  })

  it("matches Node's and the browser's (Web Crypto) SHA-256 across padding boundaries and UTF-8", async () => {
    const texts = [
      ...Array.from({ length: 140 }, (_, n) => 'x'.repeat(n)),
      'ทีม A ชนะ',
      'emoji 🐉 and a lone surrogate \ud800 here',
      'é'.repeat(1000),
    ]
    for (const text of texts) {
      expect(sha256Hex(text)).toBe(nodeSha256(text))
      expect(sha256Hex(text)).toBe(await webCryptoSha256(text))
    }
  })

  it('hashes the canonical game data exactly as Node and Web Crypto do', async () => {
    const text = canonicalJson(loadGameData(readDataDir()))
    expect(sha256Hex(text)).toBe(nodeSha256(text))
    expect(sha256Hex(text)).toBe(await webCryptoSha256(text))
  })
})

describe('canonical JSON', () => {
  it('sorts keys at every level, keeps array order and writes no whitespace', () => {
    expect(canonicalJson({ b: [3, { z: 1, a: 'x' }], a: { d: true, c: null }, skip: undefined })).toBe(
      '{"a":{"c":null,"d":true},"b":[3,{"a":"x","z":1}]}',
    )
  })

  it('refuses values JSON cannot hold', () => {
    expect(() => canonicalJson({ n: Number.NaN })).toThrow()
    expect(() => canonicalJson({ f: () => 1 })).toThrow()
  })
})

describe('data hash', () => {
  const files = readDataDir()
  const hash = dataHash(loadGameData(files))

  it('is 64 lowercase hex digits', () => {
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('does not depend on key order inside the files', () => {
    const reordered = Object.fromEntries(Object.entries(files).map(([file, json]) => [file, reverseKeys(json)]))
    expect(dataHash(loadGameData(reordered))).toBe(hash)
  })

  it('does not depend on the order the files were read in', () => {
    const backwards = Object.fromEntries(Object.entries(files).reverse())
    expect(Object.keys(backwards)).not.toEqual(Object.keys(files))
    expect(dataHash(loadGameData(backwards))).toBe(hash)
  })

  it('does not depend on whitespace or line endings', () => {
    const texts = dataTexts()
    const variants = [
      (text: string) => text.replace(/\r?\n/g, '\r\n'),
      (text: string) => text.replace(/\r?\n/g, '\n'),
      (text: string) => JSON.stringify(JSON.parse(text)),
      (text: string) => JSON.stringify(JSON.parse(text), null, '\t'),
    ]
    for (const variant of variants) {
      const parsed = Object.fromEntries(Object.entries(texts).map(([file, text]) => [file, JSON.parse(variant(text))]))
      expect(dataHash(loadGameData(parsed))).toBe(hash)
    }
  })

  it('changes when any number in the data changes', () => {
    const tuned = structuredClone(files) as Record<string, any>
    tuned['species/fangrel.json'].guardBonus += 1
    expect(dataHash(loadGameData(tuned))).not.toBe(hash)

    const board = structuredClone(files) as Record<string, any>
    board['boards/crossroads.json'].name = 'Crossroads 2'
    expect(dataHash(loadGameData(board))).not.toBe(hash)
  })
})
