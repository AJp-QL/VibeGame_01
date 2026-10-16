import { expect, test } from '@playwright/test'
import type { BattleEvent, BattleState } from '@mt/session'
import { th } from '../src/strings.ts'
import { cases } from './cases.ts'

interface Capture {
  name: string
  step: number
  events: BattleEvent[]
  area: { x: number; y: number }[]
  chosenTargets: string[]
  state: BattleState
  labels: string[]
}

declare global {
  interface Window { visualReady?: Capture }
}

for (const capture of cases) {
  test(capture.name, async ({ page, browser }) => {
    // Baselines must never be silently regenerated with an unrelated system browser.
    if (test.info().config.updateSnapshots !== 'none' && (process.env.VISUAL_CHROMIUM || process.platform !== 'linux')) {
      throw new Error('Baseline updates require Linux and the pinned Playwright Chromium; unset VISUAL_CHROMIUM')
    }
    test.info().annotations.push({ type: 'browser', description: browser.version() })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`/visual/?case=${capture.name}`)
    await page.waitForFunction(() => window.visualReady !== undefined)
    const actual = await page.evaluate(() => window.visualReady!)
    expect(actual.name).toBe(capture.name)
    expect(errors).toEqual([])
    if ('event' in capture) expect(actual.events.map(e => e.type)).toContain(capture.event)
    if (capture.name === 'burst-order') {
      expect(actual.area).toHaveLength(9)
      expect(actual.chosenTargets).toEqual(['B.m2', 'B.m1'])
    }
    if (capture.name === 'counter-label') expect(actual.labels).toContain(th.boardCounter)
    if (capture.name === 'bleed-float') {
      const tick = actual.events.find(e => e.type === 'statusTicked')!
      if (tick.type !== 'statusTicked') throw new Error('Expected a Bleed tick')
      expect(actual.labels).toContain(`-${tick.amount}`)
    }
    if (capture.name === 'attune') expect(actual.state.attuned).toMatchObject([{ tile: { x: 1, y: 3 }, turnsLeft: 3 }])
    if (capture.name === 'command-cover') {
      expect(actual.state.command).toMatchObject({ target: 'A.m2' })
      expect(actual.state.command?.spent).not.toBe(true)
      expect(actual.state.units.find(u => u.id === 'A.m2')?.coveredBy).toBe('A.tamer')
    }
    const status = capture.name === 'off-balance' ? 'off_balance' : capture.name
    if (['guarded', 'rallied', 'pin', 'marked', 'hidden', 'countering', 'weakened', 'off_balance', 'taunted'].includes(status)) {
      expect(actual.state.units.flatMap(u => u.statuses.map(s => s.id))).toContain(status)
    }
    const canvas = page.locator('canvas')
    await test.info().attach('board', { body: await canvas.screenshot(), contentType: 'image/png' })
    await expect(canvas).toHaveScreenshot(`${capture.name}.png`)
  })
}
