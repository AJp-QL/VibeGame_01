# P1X-12 Threat zone

- [1280 px desktop](threat-zone-1280.png) · [360 px mobile](threat-zone-360.png)

Move preview reads the session count directly, with zero muted and positive counts in purple. Its explanation refers to the previewed tile. Without a visible Move preview, the whole-Board toggle explains the estimate for each tile; with a preview, that explanation appears only in the preview. Player text remains in the web string table, and the warning uses a deterministic vector icon with an accessible count label.

The overlay starts off. Toggling sends display options to the live Phaser scene and redraws only the threat layer, preserving the canvas, Unit views, tweens and animation completion. Browser tests retain the same canvas through both toggle directions, verify exact Board restoration and unchanged session state, and toggle during a real walk to verify the same tween survives and reaches its destination.

Shared palette digit patterns serve both threat counts and target-order badges; overlay colours live in the palette. Removed the unused title and the three orphan Action plan evidence PNGs. Only these two Threat zone captures remain, refreshed from the passing final run and inspected at desktop/mobile widths. Purple counts, blue movement borders and red swords/dots remain distinct.

Includes updated PR #61 and main c1474cb; merge #61 first. Frozen install, typecheck, 1,051 tests passed / 1 skipped, build, path ownership and replay validation passed. All 37 pinned Linux Chromium visual cases passed with no baseline changes for these review corrections. The 16 fixture data hashes refreshed in #61 match current main; every other replay field is unchanged. Final CI status is recorded in the PR.
