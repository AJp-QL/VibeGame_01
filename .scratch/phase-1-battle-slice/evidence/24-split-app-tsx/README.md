# Ticket 24 visual comparison

Pure refactor: no intended behavior, text, style, or session-call changes.

Chromium 154, device scale 1, desktop viewport 1280 × 800 and mobile viewport
360 × 640. These are full-page captures. Before uses the original `App.tsx`
at `df07284`; after uses the extracted components. Both runs use fresh browser
contexts and the fixed Dice Seed `123456789abcdef0` supplied by the external
browser harness, without changes to application code.

| Screen | Before | After |
| --- | --- | --- |
| Desktop menu | [Before](before-desktop-menu.png) | [After](after-desktop-menu.png) |
| Desktop Battle | [Before](before-desktop-battle.png) | [After](after-desktop-battle.png) |
| 360 px menu | [Before](before-mobile-menu.png) | [After](after-mobile-menu.png) |
| 360 px Battle | [Before](before-mobile-battle.png) | [After](after-mobile-battle.png) |

Each pair is pixel-identical (no changed pixels). Deployment captures were also
pixel-identical at both widths. Menu, deployment, selected-Unit Battle and guide
DOM matched exactly. Replay DOM and exported Replay data matched after excluding
export and Battle-start timestamps.

The browser followed Hotseat deployment for both sides, declined initiative
Inspiration, selected a Unit, moved and defended, cancelled then confirmed the
End Turn warning, exported a Replay, confirmed leaving the Battle, reopened the
Replay, used next/back/last playback controls, returned to the menu, and opened
the guide. Both before and after completed without browser page errors.

Additional browser checks on the refactored app verified that a complete Hotseat
Battle records exactly one finished Battle, and that scheduled AI actions finish
an AI Turn and return controls to human Turn 2. Both completed with no browser
page errors.
