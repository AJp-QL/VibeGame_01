/** Capture times are measured from one replay step, on the fixed 10 ms Phaser clock. */
export const cases = [
  { name: 'burst-order', fixture: 'burst', mode: 'burst', at: 0 },
  { name: 'blink-fade-out', fixture: 'blink', event: 'unitTeleported', at: 80 },
  { name: 'blink-fade-in', fixture: 'blink', event: 'unitTeleported', at: 230 },
  { name: 'blink-landed', fixture: 'blink', event: 'unitTeleported', at: 350 },
  { name: 'push-slide', fixture: 'push', event: 'unitPushed', at: 90 },
  { name: 'push-landed', fixture: 'push', event: 'unitPushed', at: 250 },
  { name: 'counter-label', fixture: 'counter', event: 'counterattack', at: 500 },
  { name: 'bleed-float', fixture: 'bleed', event: 'statusTicked', at: 100 },
  ...['attune', 'command-cover', 'guarded', 'rallied', 'pin', 'marked', 'hidden', 'countering', 'weakened', 'off-balance', 'taunted'].map(name => ({ name, fixture: name, mode: 'still', at: 0 })),
] as const

export type VisualCase = (typeof cases)[number]
