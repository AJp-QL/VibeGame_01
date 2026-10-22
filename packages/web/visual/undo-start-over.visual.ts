import { test, expect } from '@playwright/test'
import type { BattleSession, PlayStatsStore } from '@mt/session'
import type { Screen } from '../src/appScreens.ts'
import { th } from '../src/strings.ts'

declare global { interface Window { undoReview: { getScreen(): Screen; stats: PlayStatsStore; session: BattleSession } } }

for (const width of [1280, 360]) {
  test(`Undo and Start over at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/undo-start-over.html')
    await expect(page.locator('canvas')).toBeVisible()
    const undo = page.getByRole('button', { name: th.undo.button, exact: true })
    await expect(undo).toBeDisabled()
    await expect(page.locator('.undo-controls')).toContainText(th.undo.disabled['turn-start'])
    await test.info().attach(`undo-turn-start-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    await page.evaluate(() => {
      const s = window.undoReview.session
      s.selectUnit('A.m2')
      s.input({ type: 'tapTile', tile: { x: 3, y: 4 } })
    })
    await expect(undo).toBeEnabled()
    await expect(page.locator('.undo-controls')).toContainText(th.undo.to.turnStart)
    await test.info().attach(`undo-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    await undo.click()
    expect(await page.evaluate(() => window.undoReview.stats.read().battles[0]?.undos)).toBe(1)
    await expect(undo).toBeDisabled()
    await page.evaluate(() => {
      const s = window.undoReview.session
      s.selectUnit('A.m1')
      s.aimTarget('B.m1')
      s.confirmPlan()
    })
    await expect(undo).toBeDisabled()
    await expect(page.locator('.undo-controls')).toContainText(th.undo.disabled['after-roll'])
    await test.info().attach(`undo-after-roll-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    await page.getByRole('button', { name: th.battleMenu.open }).click()
    await page.getByRole('button', { name: th.battleMenu.startOver, exact: true }).click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toContainText(th.battleMenu.startOverConfirm)
    await test.info().attach(`start-over-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    await dialog.getByRole('button', { name: th.battleMenu.leaveNo }).click()
    expect(await page.evaluate(() => window.undoReview.stats.read().battlesStarted)).toBe(1)
    await page.getByRole('button', { name: th.battleMenu.open }).click()
    await page.getByRole('button', { name: th.battleMenu.startOver, exact: true }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: th.battleMenu.startOver, exact: true }).click()
    expect(await page.evaluate(() => window.undoReview.stats.read().battles[0]?.abandonedAt)).toBeDefined()
    expect(await page.evaluate(() => window.undoReview.getScreen().kind)).toBe('battle')
    await expect(page.locator('canvas')).toHaveCount(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
  test(`Replay withdrawn actions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/undo-start-over.html?replay')
    const toggle = page.getByRole('checkbox', { name: th.replay.showUndone })
    await expect(toggle).not.toBeChecked()
    await expect(toggle).toBeEnabled()
    await toggle.check()
    await page.getByRole('button', { name: th.replay.forward }).click()
    await expect(page.locator('.replay-controls')).toContainText(th.replay.undone)
    await test.info().attach(`replay-undone-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    await toggle.uncheck()
    await expect(page.locator('.replay-controls')).not.toContainText(th.replay.undone)
  })
}
