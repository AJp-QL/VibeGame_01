import { test, expect, type Page } from '@playwright/test'
import { th } from '../src/strings.ts'

async function tap(page: Page, tile: { x: number; y: number }) {
  const box = (await page.locator('canvas').boundingBox())!
  await page.mouse.click(box.x + (tile.x + .5) * box.width / 7, box.y + (tile.y + .5) * box.height / 7)
}
async function checkPhoneLayout(page: Page, width: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (width > 600) return
  const board = (await page.locator('canvas').boundingBox())!
  const sheet = (await page.locator('.action-sheet').boundingBox())!
  const footer = (await page.locator('.sheet-footer').boundingBox())!
  expect(board.y).toBeGreaterThanOrEqual(0)
  expect(board.y + board.height).toBeLessThanOrEqual(sheet.y)
  expect(footer.y + footer.height).toBeLessThanOrEqual(640)
  expect(footer.y).toBeGreaterThan(sheet.y)
  expect(await page.evaluate(() => scrollY)).toBe(0)
}
for (const width of [1280, 360, 375]) {
  test(`shadow attack and post-move actions ${width}`, async ({ page, browser }) => {
    test.setTimeout(60_000)
    if (test.info().config.updateSnapshots !== 'none') {
      expect(process.platform).toBe('linux')
      expect(process.env.VISUAL_CHROMIUM).toBeUndefined()
      expect(browser.version()).toBe('151.0.7922.34')
    }
    await page.setViewportSize({ width, height: 640 })
    await page.goto('/action-plan.html')
    await expect(page.locator('canvas')).toBeVisible()
    const start = await page.evaluate(() => window.planSession.getSnapshot().actions.length)
    const destination = await page.evaluate(() => {
      const s = window.planSession
      for (const tile of s.getSnapshot().reachable) {
        s.previewMove(tile)
        if (s.getSnapshot().movePreview?.reach.some(r => r.targets.length > 0)) return tile
      }
      throw new Error('Expected an attackable target from shadow')
    })
    await expect(page.locator('.move-preview')).toBeVisible()
    await checkPhoneLayout(page, width)
    await expect(page).toHaveScreenshot(`shadow-preview-${width}.png`, { animations: 'disabled', fullPage: width > 600 })
    const enemyTile = await page.evaluate(() => {
      const s = window.planSession.getSnapshot()
      const id = s.movePreview!.reach.flatMap(r => r.targets)[0]!
      return s.units.find(u => u.id === id)!.tile
    })
    await tap(page, enemyTile)
    await expect(page.locator('.action-plan')).toBeVisible()
    expect(await page.evaluate(() => window.planSession.getSnapshot().plan!.origin.tile)).toEqual(destination)
    expect(await page.evaluate(() => window.planSession.getSnapshot().actions.length)).toBe(start)
    await checkPhoneLayout(page, width)
    if (width < 600) {
      const odds = (await page.locator('.preview-numbers').boundingBox())!
      const footer = (await page.locator('.sheet-footer').boundingBox())!
      expect(odds.y + odds.height).toBeLessThan(footer.y)
    }
    await expect(page).toHaveScreenshot(`shadow-plan-${width}.png`, { animations: 'disabled', fullPage: width > 600 })
    await page.getByRole('button', { name: th.cancel, exact: true }).click()
    await page.getByRole('button', { name: th.confirmMove, exact: true }).click()
    await expect(page.locator('.actions-from-here')).toBeVisible()
    expect(await page.evaluate(() => window.planSession.getSnapshot().actions.length)).toBe(start + 1)
    await expect(page.locator('.actions-from-here')).toContainText(th.actionsFromHere)
    await expect(page.locator('.actions-from-here')).toContainText('%')
    await checkPhoneLayout(page, width)
    // Wait for the real Move animation to complete before the static capture.
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot(`actions-from-here-${width}.png`, { animations: 'disabled', fullPage: width > 600 })
    const beforeDone = await page.evaluate(() => {
      const s = window.planSession.getSnapshot()
      return { state: s.state, actions: s.actions, current: s.state.activations.current }
    })
    await page.getByRole('button', { name: th.finishUnit, exact: true }).click()
    await expect(page.locator('.actions-from-here')).toHaveCount(0)
    expect(await page.evaluate(() => {
      const s = window.planSession.getSnapshot()
      return { state: s.state, actions: s.actions, current: s.state.activations.current }
    })).toEqual(beforeDone)
    expect(await page.evaluate(() => window.planSession.getSnapshot().selectedUnit)).toBeNull()
  })
}
