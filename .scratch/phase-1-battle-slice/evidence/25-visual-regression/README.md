# Ticket 25 smoke evidence — not baselines

[All 19 captured Board frames](system-chromium-smoke.png), Linux, system Chromium
154.0.8037.57. The contact sheet shows the cases in `packages/web/visual/cases.ts`
order. Captures were inspected: all requested overlays, animations, floating text,
terrain frames and glyphs are visible; no visual defect was identified.

Three consecutive screenshot comparison runs against temporary references passed
(57/57). A temporary Guarded colour change from blue to magenta failed with 171
differing pixels; restoring the colour made the case pass again. The temporary
references were removed and are not the committed baselines required by ticket 25.

The environment blocks the pinned Playwright Chromium download. Final baselines
must be made and verified with Playwright 1.62.1's Chromium 151.0.7922.34 on Linux.
See `packages/web/visual/README.md` for the commands and remaining blocker.
