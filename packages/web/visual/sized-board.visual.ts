import { test, expect, type Page } from '@playwright/test'
import type { BattleSession } from '@mt/session'

declare global { interface Window { sizedSession: BattleSession } }

async function tap(page: Page, x: number, y: number) {
  const canvas = page.locator('canvas')
  const box = (await canvas.boundingBox())!
  await page.mouse.click(box.x + (x + 0.5) * box.width / 9, box.y + (y + 0.5) * box.height / 9)
}

for (const width of [1280, 360]) {
  test(`9x9 rendering and input at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('/sized-board.html')
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()
    await expect(canvas).toHaveAttribute('width', '288')
    await expect(canvas).toHaveAttribute('height', '288')
    const box = (await canvas.boundingBox())!
    expect(box.width).toBeLessThanOrEqual(width - 32)
    await expect(page.locator('.mini-board').first().locator('span')).toHaveCount(81)
    await expect(page.locator('.mini-board').last().locator('span')).toHaveCount(49)
    const columns = await page.locator('.mini-board').evaluateAll(elements => elements.map(element => ({
      display: getComputedStyle(element).display,
      count: getComputedStyle(element).gridTemplateColumns.split(' ').length,
    })))
    expect(columns).toEqual([{ display: 'grid', count: 9 }, { display: 'grid', count: 7 }])
    await test.info().attach(`sized-board-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    await tap(page, 6, 4)
    await expect.poll(() => page.evaluate(() => window.sizedSession.getSnapshot().selectedUnit)).toBe('A.m1')
    // Walk two columns past the old edge using the actual scaled canvas input.
    await tap(page, 8, 4)
    await expect.poll(() => page.evaluate(() => window.sizedSession.getSnapshot().units.find(unit => unit.id === 'A.m1')?.tile)).toEqual({ x: 8, y: 4 })
    // The bottom-right cell also identifies the correct Unit, not an off-Board tap.
    await tap(page, 8, 8)
    await expect.poll(() => page.evaluate(() => window.sizedSession.getSnapshot().inspectedUnit)).toBe('B.tamer')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    expect(errors).toEqual([])
  })
}
