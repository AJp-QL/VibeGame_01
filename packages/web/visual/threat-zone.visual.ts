import { test, expect } from '@playwright/test'
import type { BattleSession } from '@mt/session'
import { th } from '../src/strings.ts'

declare global { interface Window { threatSession: BattleSession } }
for (const width of [1280, 360]) {
  test(`Threat zone counts and reversible overlay at ${width}px`, async ({ page }) => {
    test.setTimeout(60_000)
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/threat-zone.html')
    await expect(page.locator('canvas')).toBeVisible()
    const toggle = page.getByRole('button', { name: th.threatZone.toggle })
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    const before = await page.evaluate(() => {
      const s = window.threatSession
      const tile = s.getSnapshot().reachable[0]!
      s.previewMove(tile)
      const snapshot = s.getSnapshot()
      return { actions: snapshot.actions.length, revision: snapshot.revision, tile, reachable: snapshot.reachable, threat: snapshot.threatZone[tile.y]![tile.x] }
    })
    await expect(page.locator('.threat-value')).toHaveAttribute('aria-label', th.threatZone.count(before.threat!))
    await expect(page.locator('.threat-count')).toContainText(th.threatZone.estimate)
    const canvas = await page.locator('canvas').elementHandle()
    await expect(page.getByText(th.threatZone.estimate, { exact: true })).toHaveCount(1)
    const plain = await page.locator('canvas').screenshot()
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('canvas')).toHaveCount(1)
    expect(await canvas!.evaluate(element => element === document.querySelector('canvas'))).toBe(true)
    const overlaid = await page.locator('canvas').screenshot()
    expect(overlaid.equals(plain)).toBe(false)
    await expect(page.locator('canvas')).toHaveScreenshot(`threat-zone-${width}.png`)
    await test.info().attach(`threat-zone-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    await toggle.click()
    const restored = await page.locator('canvas').screenshot()
    expect(restored.equals(plain)).toBe(true)
    expect(await page.evaluate(() => {
      const snapshot = window.threatSession.getSnapshot()
      return { actions: snapshot.actions.length, revision: snapshot.revision, tile: snapshot.movePreview?.tile, reachable: snapshot.reachable, threat: snapshot.movePreview?.threat }
    })).toEqual(before)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('toggling Threat zone preserves a running walk and its completion', async ({ page }) => {
  await page.goto('/threat-zone.html')
  await expect(page.locator('canvas')).toBeVisible()
  await page.evaluate(() => (window as unknown as { startThreatAnimation(): Promise<void> }).startThreatAnimation())
  const canvas = await page.locator('canvas').elementHandle()
  await page.getByRole('button', { name: th.threatZone.toggle }).click()
  expect(await canvas!.evaluate(element => element === document.querySelector('canvas'))).toBe(true)
  expect(await page.evaluate(() => (window as unknown as { checkThreatAnimation(): unknown }).checkThreatAnimation()))
    .toEqual({ preserved: true, landed: true })
})
