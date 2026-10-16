import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Every visible UI text comes from the string table (packages/web/src/strings.ts,
 * ticket 17): this scans the web app and the Phaser Board for Thai text, JSX
 * text and text attributes written straight into the code.
 */
const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const SOURCES = ['packages/web/src', 'packages/battle/src', 'packages/session/src']
/** The string table itself. */
const TABLES = new Set(['packages/web/src/strings.ts'])
/** Visible text that is deliberately not translated: symbols and the like. Keep it short. */
const ALLOWED_TEXT = new Set<string>([])

function sourceFiles(): string[] {
  return SOURCES.flatMap((dir) =>
    readdirSync(join(ROOT, dir), { recursive: true, withFileTypes: true })
      .filter((e) => e.isFile() && /\.(ts|tsx)$/.test(e.name) && !e.name.endsWith('.d.ts'))
      .map((e) => relative(ROOT, join(e.parentPath, e.name)).split('\\').join('/')),
  )
}

/** The code without comments (string contents kept). */
function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
}

function findHardCoded(file: string, code: string): string[] {
  const found: string[] = []
  const lines = stripComments(code).split('\n')
  lines.forEach((line, i) => {
    const at = `${file}:${i + 1}`
    if (/[\u0E00-\u0E7F]/.test(line)) found.push(`${at} Thai text: ${line.trim()}`)
    if (file.endsWith('.tsx')) {
      // Text between JSX tags: >Some words<
      for (const m of line.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*)</g)) {
        const text = m[1]!.trim()
        if (text !== '' && !ALLOWED_TEXT.has(text) && !/[=;()]|=>|&&/.test(m[1]!)) found.push(`${at} JSX text: ${text}`)
      }
      // A line of bare text inside a multi-line element.
      const previous = lines[i - 1]?.trim() ?? ''
      const text = line.trim()
      if (previous.endsWith('>') && !previous.endsWith('=>') && /^[A-Za-z][^<>{}=;()'"`]*$/.test(text) && !ALLOWED_TEXT.has(text)) {
        found.push(`${at} JSX text: ${text}`)
      }
      for (const m of line.matchAll(/\b(aria-label|title|placeholder|alt)="([^"]*[A-Za-z][^"]*)"/g)) {
        if (!ALLOWED_TEXT.has(m[2]!)) found.push(`${at} ${m[1]}: ${m[2]}`)
      }
    }
    // Phaser text on the Board: this.add.text(x, y, 'literal'
    for (const m of line.matchAll(/(?:\.text|setText)\([^)]*?(['"`])([^'"`]*[A-Za-z][^'"`]*)\1/g)) {
      if (!ALLOWED_TEXT.has(m[2]!)) found.push(`${at} Board text: ${m[2]}`)
    }
  })
  return found
}

describe('UI text comes from the string table', () => {
  it('finds hard-coded text in a sample (the scan works)', () => {
    const sample = [
      '<button>Start</button>',
      "<p>{th.ok}</p> // <p>ok</p> in a comment",
      '<img alt="Board" />',
      "const s = 'เริ่ม'",
      "this.add.text(0, 0, 'MISS', style)",
      '<p className="x">',
      '  Plain words',
      '</p>',
    ].join('\n')
    expect(findHardCoded('Sample.tsx', sample)).toEqual([
      'Sample.tsx:1 JSX text: Start',
      'Sample.tsx:3 alt: Board',
      'Sample.tsx:4 Thai text: const s = \'เริ่ม\'',
      'Sample.tsx:5 Board text: MISS',
      'Sample.tsx:7 JSX text: Plain words',
    ])
  })

  it('packages/web/src and packages/battle/src have none outside strings.ts', () => {
    const files = sourceFiles()
    expect(files).toContain('packages/web/src/App.tsx')
    expect(files).toContain('packages/battle/src/BattleScene.ts')
    const found = files.filter((f) => !TABLES.has(f)).flatMap((f) => findHardCoded(f, readFileSync(join(ROOT, f), 'utf8')))
    expect(found).toEqual([])
  })
})
