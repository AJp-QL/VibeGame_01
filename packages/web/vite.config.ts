import { execSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { loadGameData } from '@mt/shared'

const DATA_DIR = fileURLToPath(new URL('../../data/', import.meta.url))

/**
 * Version shown in the UI: APP_VERSION if set (CI sets it to the git tag),
 * otherwise `git describe`, which is the tag itself on a tagged commit.
 */
function appVersion(): string {
  if (process.env.APP_VERSION) return process.env.APP_VERSION
  try {
    return execSync('git describe --tags --always --dirty', { encoding: 'utf8' }).trim()
  } catch {
    return 'dev'
  }
}

/** Fail the build (and dev server start) when any file in data/ breaks its schema. */
function validateGameData(): Plugin {
  return {
    name: 'mt-validate-game-data',
    buildStart() {
      const files: Record<string, unknown> = {}
      for (const entry of readdirSync(DATA_DIR, { recursive: true, withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith('.json')) continue
        const fullPath = join(entry.parentPath, entry.name)
        this.addWatchFile(fullPath)
        files[relative(DATA_DIR, fullPath).split(sep).join('/')] = JSON.parse(readFileSync(fullPath, 'utf8'))
      }
      loadGameData(files)
    },
  }
}

export default defineConfig({
  // "/" for Cloudflare (served from the domain root); set BASE_PATH for a sub-path host.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), validateGameData()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion()),
  },
  // Phaser alone is ~1.2 MB minified; the default 500 kB warning is just noise here.
  build: { chunkSizeWarningLimit: 2000 },
})
