import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// session is the Battle's interaction model without a UI (ADR 0004): it uses
// shared, engine and ai only, never battle, web, React or Phaser, never
// touches the DOM, real time or randomness (the clock and storage are passed
// in), and holds no player-facing text (that is web's string table).

const SESSION_DIR = fileURLToPath(new URL('../', import.meta.url))
const SRC_DIR = join(SESSION_DIR, 'src')

function sourceFiles(): { name: string; raw: string; code: string }[] {
  return readdirSync(SRC_DIR, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => {
      const raw = readFileSync(join(entry.parentPath, entry.name), 'utf8')
      // Drop comments so prose such as "a short delay" does not trip the scan.
      const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
      return { name: entry.name, raw, code }
    })
}

describe('session boundaries', () => {
  it('depends on @mt/shared, @mt/engine and @mt/ai only', () => {
    const pkg = JSON.parse(readFileSync(join(SESSION_DIR, 'package.json'), 'utf8'))
    expect(Object.keys(pkg.dependencies ?? {}).sort()).toEqual(['@mt/ai', '@mt/engine', '@mt/shared'])
  })

  it('imports nothing but its own files, @mt/shared, @mt/engine and @mt/ai', () => {
    for (const { name, code } of sourceFiles()) {
      const specifiers = [...code.matchAll(/\bfrom\s+'([^']+)'|\bimport\s*\(\s*'([^']+)'/g)].map((m) => m[1] ?? m[2])
      for (const specifier of specifiers) {
        expect(`${name}: ${specifier}`).toMatch(/: (\.\/[\w/]+\.ts|@mt\/(shared|engine|ai))$/)
      }
    }
  })

  it('uses no real time, randomness, timers, network, storage or DOM globals', () => {
    // `Date` as a type is fine (the stats clock is injected); creating or reading the time is not.
    const forbidden =
      /\b(Math\.random|new Date|Date\.now|performance|setTimeout|setInterval|requestAnimationFrame|fetch|XMLHttpRequest|WebSocket|window|document|navigator|localStorage|sessionStorage|crypto|process|Blob|URL)\b/
    for (const { name, code } of sourceFiles()) {
      expect(`${name}: ${code.match(forbidden)?.[0] ?? 'ok'}`).toBe(`${name}: ok`)
    }
  })

  it('has no player-facing text: no Thai anywhere in src (the words live in web)', () => {
    for (const { name, raw } of sourceFiles()) {
      expect(`${name}: ${raw.match(/[฀-๿]+/)?.[0] ?? 'ok'}`).toBe(`${name}: ok`)
    }
  })
})
