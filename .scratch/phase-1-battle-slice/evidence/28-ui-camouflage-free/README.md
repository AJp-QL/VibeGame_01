# Ticket 28 — Camouflage UI evidence

The real BattleScreen/TurnPanel components were captured using a public session:
Scenario 1 / Crossroads, B first, Quillfox moves d7 → e7 (forest). No game state
was fabricated. Hint/preview follow Defend, so Move and Action are both spent.
The used-button capture uses Camouflage after Move, leaving Action available so
the disabled button and its reason remain visible. Browser assertions checked
the expected text, absence of page errors and absence of horizontal overflow.
The temporary capture entry points were removed after capture.

| State | Desktop (1280 px) | Mobile (360 px) |
| --- | --- | --- |
| Free skill remains after Move + Action | [Screenshot](hint-1280.png) | [Screenshot](hint-360.png) |
| Camouflage effect preview | [Screenshot](preview-1280.png) | [Screenshot](preview-360.png) |
| Used button and free-skill event log | [Screenshot](used-1280.png) | [Screenshot](used-360.png) |

## Fixture and baseline review

All 16 Replay fixtures regenerated using engine 0.9.0 and current bundled data.
Only engineVersion/dataHash changed; Dice Seeds, placements and actions stayed
identical. Generation checks each expected event/status, and the visual suite
asserts these again before capturing.

Pinned Linux Playwright 1.62.1 / Chromium 151.0.7922.34 (build 1234).
All 19 captures were inspected. Sixteen PNGs remain byte-for-byte unchanged.
Three need refresh because of the already-merged balance changes (tickets 19/27):

| Capture | Before | Current baseline | Expected difference |
| --- | --- | --- | --- |
| push-slide | [Before](push-slide-before.png) | [After](../../../../packages/web/visual/baselines/push-slide.png) | Fangrel HP bar reflects increased Shield Bash damage |
| push-landed | [Before](push-landed-before.png) | [After](../../../../packages/web/visual/baselines/push-landed.png) | Damage float 12 → 16, and corresponding HP bar |
| pin | [Before](pin-before.png) | [After](../../../../packages/web/visual/baselines/pin.png) | Wispling HP bar reflects current Pin damage |

The other reviewed captures are burst-order; blink-fade-out, blink-fade-in,
blink-landed; counter-label; bleed-float; attune; command-cover; guarded; rallied;
marked; hidden; countering; weakened; off-balance; taunted. Skill animation,
placement, target order, terrain and status icons remain correct. No renderer
change was needed.

## Checks

Frozen install, typecheck and production build passed. Vitest: 756 passed,
1 skipped. Ownership check passed on the committed branch. Baseline update:
19 passed; the final unchanged-baseline comparison passed 57/57
(`test:visual --repeat-each=3`). The text/centralized-string tests passed 13/13
in a focused follow-up run.
