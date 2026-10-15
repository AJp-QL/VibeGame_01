import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const DATA_DIR = fileURLToPath(new URL('../../../data/', import.meta.url))

/** Every JSON file under data/, parsed, keyed by "<folder>/<file>.json". */
export function readDataDir(dir: string = DATA_DIR): Record<string, unknown> {
  const files: Record<string, unknown> = {}
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue
    const fullPath = join(entry.parentPath, entry.name)
    const key = relative(dir, fullPath).split(sep).join('/')
    files[key] = JSON.parse(readFileSync(fullPath, 'utf8'))
  }
  return files
}
