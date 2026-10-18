import { test, expect, type Page } from '@playwright/test'
import type { BattleSession } from '@mt/session'

declare global { interface Window { previewSession: BattleSession } }

async function tapTile(page: Page, tile: { x: number; y: number }) {
  const canvas = page.locator('canvas')
  await canvas.scrollIntoViewIfNeeded()
  const box = (await canvas.boundingBox())!
  await page.mouse.click(box.x + (tile.x + 0.5) * box.width / 7, box.y + (tile.y + 0.5) * box.height / 7)
}

for (const width of [1280, 360]) {
  for (const mode of ['move', 'blink', 'blocked'] as const) {
    test(`preview-${mode}-${width}`, async ({ page, browser }) => {
      if (test.info().config.updateSnapshots !== 'none' && (process.env.VISUAL_CHROMIUM || process.platform !== 'linux')) {
        throw new Error('Baseline updates require Linux and the pinned Playwright Chromium')
      }
      test.info().annotations.push({ type: 'browser', description: browser.version() })
      await page.setViewportSize({ width, height: 900 })
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(`/move-preview.html?side=${mode === 'blocked' ? 'B' : 'A'}`)
      await expect(page.locator('canvas')).toBeVisible()
      if (mode === 'blink') await page.getByRole('button', { name: /^Blink/ }).click()
      const tiles = await page.evaluate(mode => {
        const session = window.previewSession
        const snapshot = session.getSnapshot()
        return mode === 'blink' ? snapshot.tileChoices : snapshot.reachable
      }, mode)
      // Exercise multiple destinations; choose a genuine blocked preview when requested.
      let destination = tiles[0]!
      if (mode === 'blocked') {
        destination = await page.evaluate(() => {
          const s = window.previewSession
          for (const tile of s.getSnapshot().reachable) {
            s.previewMove(tile)
            if (s.getSnapshot().movePreview?.reach.some(option => option.blocked.length > 0)) return tile
          }
          throw new Error('Expected a blocked target in this layout')
        })
      }
      const before = await page.evaluate(() => ({ revision: window.previewSession.getSnapshot().revision, actions: window.previewSession.getSnapshot().actions.length }))
      await tapTile(page, tiles[1]!)
      await tapTile(page, destination)
      const preview = await page.evaluate(() => window.previewSession.getSnapshot().movePreview)
      expect(preview?.tile).toEqual(destination)
      expect(await page.evaluate(() => window.previewSession.getSnapshot().revision)).toBe(before.revision)
      expect(await page.evaluate(() => window.previewSession.getSnapshot().actions.length)).toBe(before.actions)
      const panel = page.locator('.move-preview')
      await expect(panel).toBeVisible()
      if (mode === 'blocked') await expect(panel).toContainText('line of sight')
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await page.evaluate(() => document.fonts.ready)
      await expect(page.locator('main')).toHaveScreenshot(`preview-${mode}-${width}.png`, { animations: 'disabled' })
      // Original Unit cancels the preview, with no Battle change.
      const original = await page.evaluate(() => {
        const s = window.previewSession.getSnapshot()
        return s.units.find(unit => unit.id === s.selectedUnit)!.tile
      })
      await tapTile(page, original)
      await expect(panel).toHaveCount(0)
      expect(await page.evaluate(() => window.previewSession.getSnapshot().movePreview)).toBeNull()
      expect(await page.evaluate(() => window.previewSession.getSnapshot().revision)).toBe(before.revision)
      // Older sessions also deselect the Unit; ticket 18 keeps it selected (and Blink aimed).
      if (await page.evaluate(() => window.previewSession.getSnapshot().selectedUnit === null)) {
        await tapTile(page, original)
        if (mode === 'blink') await page.getByRole('button', { name: /^Blink/ }).click()
      }
      // Confirm through the real controls with either session behaviour.
      await tapTile(page, destination)
      await panel.getByRole('button', { name: mode === 'blink' ? 'Blink' : 'เดิน', exact: true }).click()
      expect(await page.evaluate(() => window.previewSession.getSnapshot().revision)).toBe(before.revision + 1)
      await expect(panel).toHaveCount(0)
      expect(errors).toEqual([])
    })
  }
}
