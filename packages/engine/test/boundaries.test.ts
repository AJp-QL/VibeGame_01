import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The engine imports only @mt/shared and never touches UI, network or real
// time (spec "โครงสร้าง module", ticket 03). tsconfig already leaves out the
// DOM and Node types; this test also catches what the ES library allows.

const ENGINE_DIR = fileURLToPath(new URL('../', import.meta.url))
const SRC_DIR = join(ENGINE_DIR, 'src')

function sourceFiles(): { name: string; code: string }[] {
  return readdirSync(SRC_DIR, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => {
      const raw = readFileSync(join(entry.parentPath, entry.name), 'utf8')
      // Drop comments so prose such as "real time" does not trip the scan.
      const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
      return { name: entry.name, code }
    })
}

describe('engine boundaries', () => {
  it('depends on @mt/shared only', () => {
    const pkg = JSON.parse(readFileSync(join(ENGINE_DIR, 'package.json'), 'utf8'))
    expect(Object.keys(pkg.dependencies ?? {})).toEqual(['@mt/shared'])
  })

  it('imports nothing but its own files and @mt/shared', () => {
    for (const { name, code } of sourceFiles()) {
      const specifiers = [...code.matchAll(/\bfrom\s+'([^']+)'|\bimport\s*\(\s*'([^']+)'/g)].map(
        (m) => m[1] ?? m[2],
      )
      for (const specifier of specifiers) {
        expect(`${name}: ${specifier}`).toMatch(/: (\.\/[\w/]+\.ts|@mt\/shared)$/)
      }
    }
  })

  it('uses no real time, randomness, network, storage or UI globals', () => {
    const forbidden =
      /\b(Math\.random|Date|performance|setTimeout|setInterval|requestAnimationFrame|fetch|XMLHttpRequest|WebSocket|window|document|localStorage|sessionStorage|crypto|process)\b/
    for (const { name, code } of sourceFiles()) {
      expect(`${name}: ${code.match(forbidden)?.[0] ?? 'ok'}`).toBe(`${name}: ok`)
    }
  })
})
