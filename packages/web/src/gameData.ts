/**
 * Game data bundled from data/ and validated at load time with the schemas
 * in @mt/shared (the Vite plugin in vite.config.ts runs the same check at
 * build time). Anything that fails throws a DataError.
 */
import { loadGameData, type GameData } from '@mt/shared'

const files = import.meta.glob<unknown>('../../../data/**/*.json', { eager: true, import: 'default' })

export function loadBundledGameData(): GameData {
  const byDataPath: Record<string, unknown> = {}
  for (const [path, content] of Object.entries(files)) {
    byDataPath[path.slice(path.indexOf('/data/') + '/data/'.length)] = content
  }
  return loadGameData(byDataPath)
}
