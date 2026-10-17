import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.visual.ts', // Deliberately outside Vitest's *.test / *.spec patterns.
  snapshotPathTemplate: '{testDir}/baselines/{arg}{ext}',
  outputDir: '../.cache/visual-results',
  reporter: [['list'], ['html', { outputFolder: '../.cache/visual-report', open: 'never' }]],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  updateSnapshots: 'none',
  forbidOnly: !!process.env.CI,
  timeout: 30_000,
  expect: { toHaveScreenshot: { threshold: 0.1, maxDiffPixels: 8, animations: 'allow' } },
  use: {
    browserName: 'chromium',
    headless: true,
    viewport: { width: 720, height: 720 },
    deviceScaleFactor: 1,
    locale: 'th-TH',
    timezoneId: 'UTC',
    colorScheme: 'light',
    baseURL: 'http://127.0.0.1:4178',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      // Optional local smoke check only; baselines use Playwright's pinned browser.
      ...(process.env.VISUAL_CHROMIUM ? { executablePath: process.env.VISUAL_CHROMIUM } : {}),
      args: ['--disable-lcd-text', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  webServer: {
    command: 'pnpm exec vite --host 127.0.0.1 --port 4178 --strictPort',
    url: 'http://127.0.0.1:4178/visual/',
    reuseExistingServer: false,
  },
})
