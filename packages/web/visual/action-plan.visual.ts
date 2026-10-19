import { test, expect, type Page } from '@playwright/test'
import type { BattleSession } from '@mt/session'
import { th } from '../src/strings.ts'

declare global { interface Window { planSession: BattleSession } }
async function tap(page: Page, tile: { x: number; y: number }) {
  const canvas = page.locator('canvas')
  await canvas.scrollIntoViewIfNeeded()
  const box = (await canvas.boundingBox())!
  await page.mouse.click(box.x + (tile.x + .5) * box.width / 7, box.y + (tile.y + .5) * box.height / 7)
}
for (const width of [1280, 360]) {
  test(`Action plan enemy-first and tile-first at ${width}px`, async ({ page }) => {
    test.setTimeout(60_000)
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('/action-plan.html')
    await expect(page.locator('canvas')).toBeVisible()
    const before = await page.evaluate(() => window.planSession.getSnapshot().actions.length)
    const enemy = await page.evaluate(() => window.planSession.getSnapshot().attackable[0]!)
    await tap(page, enemy.tile)
    await expect(page.locator('.action-plan')).toBeVisible()
    expect(await page.evaluate(() => window.planSession.getSnapshot().actions.length)).toBe(before)
    const origin = await page.evaluate(() => window.planSession.getSnapshot().plan!.originChoices.find(o => o.via === 'move')!)
    await tap(page, origin.tile)
    expect(await page.evaluate(() => window.planSession.getSnapshot().plan!.origin.tile)).toEqual(origin.tile)
    // Switching the plan's skill never spends a Move or Action.
    const alternate = page.locator('.plan-choices button').nth(1)
    if (await alternate.count()) {
      await alternate.click()
      expect(await page.evaluate(() => window.planSession.getSnapshot().actions.length)).toBe(before)
      await page.locator('.plan-choices button').first().click()
    }
    await expect(page.locator('.action-plan')).toContainText(th.actionPlan.rolls)
    await page.evaluate(() => document.fonts.ready)
    await test.info().attach(`action-plan-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    const steps = await page.evaluate(() => window.planSession.getSnapshot().plan!.steps.length)
    await page.getByRole('button', { name: th.actionPlan.confirm }).click()
    expect(await page.evaluate(() => window.planSession.getSnapshot().actions.length)).toBe(before + steps)
    expect(await page.evaluate(() => window.planSession.getSnapshot().eventBatches.length)).toBe(steps)
    await expect(page.locator('.action-plan')).toHaveCount(0)
    // Tile-first: choose a destination, then an enemy button from that shadow.
    await page.reload()
    const destination = await page.evaluate(() => {
      const s = window.planSession
      for (const tile of s.getSnapshot().reachable) {
        s.previewMove(tile)
        if (s.getSnapshot().movePreview?.options.some(c => c.kind === 'attack')) return tile
      }
      throw new Error('Expected an attack from a reachable tile')
    })
    await tap(page, destination)
    await page.locator('.move-targets button').first().click()
    await expect(page.locator('.action-plan')).toBeVisible()
    expect(await page.evaluate(() => window.planSession.getSnapshot().plan!.origin.tile)).toEqual(destination)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(errors).toEqual([])
  })
}

test('the real renderer walks to the planned origin before lunging', async ({ page }) => {
  await page.goto('/plan-animation.html')
  await page.waitForFunction(() => 'planAnimation' in window)
  const result = await page.evaluate(() => (window as unknown as { planAnimation: {
    missingViewCompletions: number; lunges: { at: number; x: number; y: number }[]; walkMs: number; origin: { x: number; y: number }; batches: string[][]
  } }).planAnimation)
  expect(result.missingViewCompletions).toBe(2)
  expect(result.batches[0]).toContain('unitMoved')
  expect(result.batches[1]).toContain('attackRolled')
  expect(result.lunges).toHaveLength(1)
  expect(result.lunges[0]!.at).toBeGreaterThanOrEqual(result.walkMs)
  expect(result.lunges[0]!.x).toBe((result.origin.x + .5) * 32)
  expect(result.lunges[0]!.y).toBe((result.origin.y + .5) * 32)
  await test.info().attach('walk-before-attack', { body: await page.locator('canvas').screenshot(), contentType: 'image/png' })
})
