# P1X-12 Threat zone

Move preview reads `preview.threat` directly from session. Zero uses muted styling; positive counts use a purple accent. The accompanying text describes the count as an estimate, not a guarantee.

The full-Board overlay starts off. It shades threatened tiles purple and prints the session count in each cell. Movement and targeting highlights are drawn above it, Units remain visible, and Action plan swords/dots retain their separate red colour. Toggling changes only the Board presentation. Browser tests verify that switching it off restores the original canvas exactly and leaves actions, revision, reachable tiles and preview unchanged.

- [1280 px desktop](threat-zone-1280.png)
- [360 px mobile](threat-zone-360.png)

The final branch includes P1X-30 (#59), P1X-07 (#60) and P1X-24 (#61) to resolve overlapping UI and baseline changes before handoff. Merge those PRs first. The final captures and baselines include the combined features; all 19 Board-only images remain unchanged.

Standalone validation: typecheck, 1,029 tests passed / 1 skipped, build, check-replays, 29/29 pinned Chromium visual comparisons. Combined typecheck, 1,035 tests passed / 1 skipped, build and check-replays passed. Baseline refresh passed 36/36 on the pinned Linux Chromium build 1234. Inspected all eight updated baseline PNGs and both full-page captures; the red swords/dots, blue movement borders and purple count marks remain distinct. The final comparison and CI are recorded in the PR. The local visual server used port 4184 while other ticket suites ran on separate ports. No gameplay rules or session contracts changed.
