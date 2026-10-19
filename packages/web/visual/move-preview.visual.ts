import { test, expect, type Page } from '@playwright/test'
import type { BattleSession } from '@mt/session'
import { th } from '../src/strings.ts'

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
      const selectionBoard = await page.locator('canvas').screenshot()
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
      const before = await page.evaluate(() => {
        const s = window.previewSession.getSnapshot()
        return { revision: s.revision, actions: s.actions.length, selectedUnit: s.selectedUnit, mode: s.mode, reachable: s.reachable, tileChoices: s.tileChoices }
      })
      await tapTile(page, tiles[1]!)
      await tapTile(page, destination)
      const preview = await page.evaluate(() => window.previewSession.getSnapshot().movePreview)
      expect(preview?.tile).toEqual(destination)
      expect(await page.evaluate(() => window.previewSession.getSnapshot().revision)).toBe(before.revision)
      expect(await page.evaluate(() => window.previewSession.getSnapshot().actions.length)).toBe(before.actions)
      const panel = page.locator('.move-preview')
      await expect(panel).toBeVisible()
      await expect(page.locator('.hint')).toHaveText(th.hintMovePreview)
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
      // Ticket 18: cancelling returns to destination selection, keeping its highlights.
      const cancelled = await page.evaluate(() => {
        const s = window.previewSession.getSnapshot()
        return { revision: s.revision, actions: s.actions.length, selectedUnit: s.selectedUnit, mode: s.mode, reachable: s.reachable, tileChoices: s.tileChoices }
      })
      expect(cancelled).toEqual(before)
      if (mode === 'blink') expect(cancelled.tileChoices.length).toBeGreaterThan(0)
      else expect(cancelled.reachable.length).toBeGreaterThan(0)
      // The Board removes the preview but retains the selected Unit and destination highlights.
      const cancelledBoard = await page.locator('canvas').screenshot()
      await test.info().attach('selection-before-preview', { body: selectionBoard, contentType: 'image/png' })
      await test.info().attach('selection-after-cancel', { body: cancelledBoard, contentType: 'image/png' })
      expect(cancelledBoard.equals(selectionBoard)).toBe(true)
      await test.info().attach(`preview-cancelled-${mode}-${width}`, { body: cancelledBoard, contentType: 'image/png' })
      // Pick another destination and confirm through the real controls.
      await tapTile(page, destination)
      await panel.getByRole('button', { name: mode === 'blink' ? 'Blink' : 'เดิน', exact: true }).click()
      expect(await page.evaluate(() => window.previewSession.getSnapshot().revision)).toBe(before.revision + 1)
      await expect(panel).toHaveCount(0)
      expect(errors).toEqual([])
    })
  }
}
