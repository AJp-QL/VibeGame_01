import { test, expect, type Page } from '@playwright/test'
import { th } from '../src/strings.ts'
import type { BattleSession } from '@mt/session'

test.use({ hasTouch: true })

declare global { interface Window { sizedSession: BattleSession } }

async function tap(page: Page, x: number, y: number) {
  const canvas = page.locator('canvas')
  await canvas.scrollIntoViewIfNeeded()
  const box = (await canvas.boundingBox())!
  await page.touchscreen.tap(box.x + (x + 0.5) * box.width / 9, box.y + (y + 0.5) * box.height / 9)
}

for (const width of [1280, 360, 375]) {
  for (const board of ['grand_crossroads', 'wide_shallows']) {
    test(`${board} rendering and input at ${width}px`, async ({ page, browser }) => {
      test.info().annotations.push({ type: 'browser', description: browser.version() })
      await page.setViewportSize({ width, height: 900 })
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      if (test.info().config.updateSnapshots !== 'none' && (process.env.VISUAL_CHROMIUM || process.platform !== 'linux')) {
        throw new Error('Baseline updates require Linux and the pinned Playwright Chromium')
      }
      await page.goto(`/sized-board.html?board=${board}`)
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
      await expect(page.locator('.swatches li')).toHaveCount(7)
      await page.evaluate(() => document.fonts.ready)
      await expect(page.locator('main')).toHaveScreenshot(`${board}-${width}.png`, { animations: 'disabled' })
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
}

for (const width of [1280, 360, 375]) {
  test(`menu selects both 9x9 Boards at ${width}px`, async ({ page, browser }) => {
    if (test.info().config.updateSnapshots !== 'none' && (process.env.VISUAL_CHROMIUM || process.platform !== 'linux')) {
      throw new Error('Baseline updates require Linux and the pinned Playwright Chromium')
    }
    test.info().annotations.push({ type: 'browser', description: browser.version() })
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/sized-board.html?menu')
    const choices = page.getByRole('group', { name: th.menu.boardTitle, exact: true })
    await expect(choices.getByRole('radio')).toHaveCount(4)
    for (const board of ['grand_crossroads', 'wide_shallows']) {
      const radio = choices.locator(`input[value="${board}"]`)
      await radio.check()
      await expect(radio).toBeChecked()
      await expect(radio.locator('..')).toContainText('9×9')
      await expect(radio.locator('..')).toContainText(th.menu.boardBlurb[board]!)
      await expect(choices.locator('.mini-board span')).toHaveCount(81)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.evaluate(() => document.fonts.ready)
      await expect(choices).toHaveScreenshot(`menu-${board}-${width}.png`, { animations: 'disabled' })
    }
    await page.getByRole('button', { name: th.menu.start, exact: true }).click()
    await expect(page.locator('canvas')).toHaveAttribute('width', '288')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
