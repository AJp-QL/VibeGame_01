# Phase 1 orchestration notes

Working state for the lead session. Survives compaction; read this first when resuming.

## Status (2026-10-15)

- Done on main: tickets 01-16. Tests: 680 passing. ENGINE_VERSION 0.7.0.
- Done: 16 simulator (parity passed; baseline in docs/balance/phase-1-baseline.md).
- Next: 17 playtest build. Real-rules baseline from ticket 15: S1 team A ~79%, S2 ~90% (Tidewall move 2 likely cause).

## Process rules

- One agent at a time (user rule 2026-10-15; usage limits kept cutting parallel agents).
- Agents work in a worktree, commit at checkpoints, `git merge main` before reporting, never push.
- Lead verifies on main: `corepack pnpm install --frozen-lockfile`, `typecheck`, `test`, `build`; then marks ticket `Status: done` + ticks boxes, removes worktree + branch, pushes.
- On a usage-limit cutoff: resume the same agent with SendMessage; check whether its worktree still exists.
- ENGINE_VERSION: bump minor in the same commit as any change that alters results for the same data + Dice Seed + actions.
- Agent prompts: tool-call budget 80 (wrap up at 65), read tests first, max 2 fix attempts per failure.

## Follow-ups to fold into ticket 17 (UI never seen in a real browser)

- Phaser visuals not verified visually: status icons, Burst area/order numbers, Blink fade, push slide, "โจมตีกลับ!" label, Bleed float, Attune frames, Command/Cover icons.
- First-load click landed on wrong tile once (ticket 04) -- possible stale canvas offset.
- Non-integer devicePixelRatio (1.5625 on this machine) makes x1 zoom blurry/offset.
- Dev-mode double mount left two canvases in hidden pane (ticket 13).
- Result-screen buttons and result-screen Replay export not clicked in a browser.
- Burst aiming hides Hidden enemies without a reason (ticket 10).

## Tuning / later tickets (after 16 passes)

- D-03: Marked should last until end of the opposing side's next Turn (tuning ticket per decision log).
- Shallows Board may favour team B (river helps Tidewall + Quillfox) -- check in simulator.
- Major cooldown 2 is a code constant, not data.
- Known balance issues from sim v4: S1 stalls to turn limit 16%, S2 team A ~68-80%, unused skills (Hex, Blink, Mark, Camouflage, Pin), Tidewall/Tamer too tanky.
- Node 26 LTS from 2026-10-28: upgrade ticket.
- Cloudflare deploy not yet done (needs user account).
