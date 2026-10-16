import { defineConfig } from 'vitest/config'

// One Vitest run over the workspace; each listed package is its own project,
// named after its package.json ("@mt/engine", …). Add a package here when it
// gets its first test.
export default defineConfig({
  test: {
    projects: ['packages/shared', 'packages/engine', 'packages/ai', 'packages/web', 'tools/simulator'],
  },
})
