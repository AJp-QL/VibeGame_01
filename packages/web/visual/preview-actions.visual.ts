import { test, expect, type Page } from '@playwright/test'
import { th } from '../src/strings.ts'

declare global { interface Window { planViewSettled(): boolean } }

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
    if (width < 600) {
      for (const button of await page.locator('.move-preview .sheet-choices button').all()) await expect(button).toBeInViewport({ ratio: 1 })
      for (const selector of await page.locator('.move-preview .sheet-choices select').all()) await expect(selector).toBeInViewport({ ratio: 1 })
      await expect(page.getByRole('button', { name: th.confirmMove, exact: true })).toBeInViewport({ ratio: 1 })
    }
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
      for (const button of await page.locator('.plan-choices button').all()) await expect(button).toBeInViewport({ ratio: 1 })
      await expect(page.getByRole('button', { name: th.actionPlan.confirm, exact: true })).toBeInViewport({ ratio: 1 })
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
    await page.waitForFunction(() => window.planViewSettled())
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

test('desktop keeps Unit cards and End Turn reachable during Move preview and Action plan', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/action-plan.html')
  await expect(page.locator('canvas')).toBeVisible()
  await page.evaluate(() => {
    const s = window.planSession
    s.previewMove(s.getSnapshot().reachable[0]!)
  })
  await expect(page.locator('.sheet-unit-cards .unit-card')).toBeVisible()
  await page.getByRole('button', { name: th.endTurn, exact: true }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.getByRole('button', { name: th.keepPlaying, exact: true }).click()
  await expect(page.locator('.move-preview')).toBeVisible()
  await page.locator('.move-support button').filter({ hasText: th.defend }).click()
  await expect(page.locator('.action-plan')).toBeVisible()
  await expect(page.locator('.sheet-unit-cards .unit-card')).toBeVisible()
  await page.getByRole('button', { name: th.endTurn, exact: true }).click()
  await page.getByRole('button', { name: th.endTurnAnyway, exact: true }).click()
  expect(await page.evaluate(() => window.planSession.getSnapshot().actions.at(-1)?.type)).toBe('endTurn')
})
