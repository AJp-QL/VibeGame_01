# P1X-07 evidence

The real Battle screen and Replay viewer at 1280 px and 360 px. All six screenshots were inspected for wrapping, disabled controls and readable confirmation text.

- [Undo, desktop](undo-1280.png) · [mobile](undo-360.png)
- [Start over confirmation, desktop](start-over-1280.png) · [mobile](start-over-360.png)
- [Withdrawn Replay action, desktop](replay-undone-1280.png) · [mobile](replay-undone-360.png)

Web tests cover Start over in AI and Hotseat, preserving choices, generating a new Dice Seed, marking the old Battle abandoned, accepted-only Undo counts, and export of a ready format 2 Replay retaining withdrawn actions. Text tests cover both safe-point labels, disabled Undo and hidden controls during the AI Turn. Browser tests cover Undo, cancelling and confirming Start over, one canvas after replacement, and toggling withdrawn Replay actions at both widths (4/4 passed).

Typecheck, full workspace tests (1,032 passed, 1 skipped) and build passed. The P1X-30 fixture commit is included so actual screenshot comparisons use engine 0.12.0; merge P1X-30 first. Baseline PNGs are unchanged. The full visual comparison and path check are listed in the PR.

Browser checks used the pinned Linux Chromium build 1234. A temporary Playwright config changed only the local server port to 4180 because P1X-30's repeated suite occupied 4178.
