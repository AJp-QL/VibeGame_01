# Phase 1.x — แก้ตาม playtest: วางแผนการเดิน, hint การเดิน, ระยะ skill กับขนาด Board

**Status:** ready-for-agent

ที่มา: playtest v0.1.5 (2026-10-17, Scenario 1 Crossroads, ผู้เล่นทีม B vs AI, แพ้ Round 8) comment ของผู้เล่น 3 ข้อ และผลวิเคราะห์ Replay; ตัดสินใจใน grill-with-docs 2026-10-17 (Q1–Q22) ศัพท์ทั้งหมดตาม CONTEXT.md (Move preview, Threat zone, Undo, Start over, Board, Replay)

## Problem Statement

ผู้เล่นตัดสินใจเดินโดยไม่เห็นผลก่อน: แตะช่องที่สว่างแล้ว Unit เดินทันที ย้อนไม่ได้ และไม่รู้ว่าจากช่องนั้นจะโจมตีใครได้ หรือศัตรูจะโจมตีกลับได้กี่ตัว ใน playtest Quillfox วิ่งขึ้นหน้า 4 ช่องใน Round 1 แล้วผู้เล่นไปเล่น Tidewall ต่อ ทำให้ Quillfox เสีย Action ทั้งที่ยิงได้ เกมไม่ถามยืนยัน Quillfox ถูกรุมจนล้มใน Round 4

ผู้เล่นยังรู้สึกว่าระยะ skill ไม่เข้ากับขนาด Board: Board 7x7 วัดระยะแบบนับทแยงเป็น 1 ช่อง ระยะ 4 จากกลาง Board ครอบทุกช่อง และ Unit ที่ยืนแถวหลังเดิน 3 แล้วยิง 4 ถึงทุกช่องตั้งแต่ Turn แรก ตำแหน่งจึงแทบไม่มีผล ไม่มีที่ปลอดภัย

นอกจากนี้เกมถาม Inspiration หลังผู้เล่นทอยโดนเองด้วย (6 จาก 7 ครั้งใน Battle นั้น) ซึ่งแทบไม่มีประโยชน์และขัดจังหวะ และคำอธิบาย Camouflage ไม่บอกว่าศัตรูที่ยืนติดกันยังเล็ง Unit ที่ Hidden ได้

## Solution

- **Move preview**: แตะช่องที่สว่างแล้วเห็นเงาของ Unit บนช่องนั้น พร้อมแผงบอกว่าจากช่องนั้น skill ไหนถึงศัตรูตัวไหน และ Threat zone (จำนวนศัตรูที่อาจโจมตีช่องนั้นได้ใน Turn หน้า) กดปุ่ม "เดิน" จึงเดินจริง Blink ใช้ flow เดียวกัน (ปุ่ม "Blink")
- **Undo**: ย้อน action ของ Turn ตัวเองกลับถึงจุดปลอดภัยล่าสุด (ต้น Turn หรือหลังการทอยลูกเต๋าครั้งล่าสุด) ผลลูกเต๋าย้อนไม่ได้
- **Start over**: เริ่ม Battle ใหม่ด้วย Scenario, Board และฝั่งเดิม Dice Seed ใหม่ Battle เดิมนับเป็นถูกทิ้ง
- **ยืนยันก่อนเปลี่ยน Unit** เมื่อ Unit ปัจจุบันยังใช้ Action ได้ และคำเตือนตอนจบ Turn ครอบ Unit ที่เดินแล้วแต่ยังไม่ได้ใช้ Action
- **Inspiration** เสนอเฉพาะเมื่อพลาดหรือ save ไม่ผ่าน (กติกาใหม่)
- **ระยะ skill**: ทดลอง 3 ทางใน simulator (ลดระยะใน data, disadvantage เมื่อโจมตีระยะไกล, terrain บัง line of sight) แล้วเลือกชุดที่ดีที่สุด และเพิ่ม Board 9x9 เป็นทางเลือกคู่กับ 7x7
- Replay บันทึกการ Undo ด้วยเพื่อวิเคราะห์ playtest

## User Stories

### Move preview
1. As a player, I want tapping a lit tile to show a ghost of my Unit there instead of moving it, so that I can look before I commit.
2. As a player, I want to tap another lit tile to move the ghost, so that I can compare several destinations.
3. As a player, I want to tap my Unit again to cancel the preview, so that I can go back to choosing.
4. As a player, I want a "เดิน" button in the preview panel, so that the Unit only moves when I mean it.
5. As a player, I want the panel to list, for each of my Unit's skills that is ready, which enemies it can reach from the ghost tile, so that I know what I can do after moving.
6. As a player, I want enemies out of line of sight from the ghost tile to be shown as blocked, so that the list matches what will really be legal.
7. As a player, I want the panel to show "⚠ N" for the ghost tile, the number of enemies that could attack that tile on their next Turn, so that I can avoid walking into danger.
8. As a player, I want the Threat zone count to be described as an estimate, so that I don't treat it as a guarantee.
9. As a Wispling player, I want Blink to use the same preview with a "Blink" button, so that teleporting feels like moving.
10. As a player, I want the preview to work the same on a 360 px phone and on desktop, so that I can plan anywhere.
11. As a player on Hotseat, I want the preview to work for whichever side is playing, so that both players get the same help.
12. As a player, I want the existing hint text to explain the preview, so that I learn the new flow.
13. As a player who already moved, I want no movement preview for that Unit, so that the UI only offers what is legal.

### Undo
14. As a player, I want an "ย้อนกลับ" button during my Turn, so that I can take back a move I regret.
15. As a player, I want Undo to go back to the most recent safe point (start of my Turn, or right after the last dice roll), so that I can fix mistakes without rerolling dice.
16. As a player, I want the button to say where it will go back to ("ต้น Turn" or "หลังการทอยล่าสุด"), so that I know what will be undone.
17. As a player, I want Undo disabled when nothing can be undone, so that I don't press it for nothing.
18. As a player, I want Undo to restore positions, Commands, Defend, Camouflage, Attune choices made after the safe point, so that the Board is exactly as it was.
19. As a player, I want dice results, Inspiration decisions and the opponent's save decisions to stay, so that nobody can fish for better rolls.
20. As a player vs AI, I want the Undo button hidden during the AI's Turn, so that I can't interfere with its Turn.
21. As a Hotseat player, I want only the side whose Turn it is to Undo, and only within that Turn, so that I can't undo my opponent's moves.
22. As a player, I want the activation rules to be restored too (which Units have started, which is current), so that Undo never lets me break the Turn rules.

### Start over
23. As a player, I want a "เริ่มใหม่" item in the in-Battle menu, so that I can restart a Battle I set up badly.
24. As a player, I want a confirmation dialog before starting over, so that I don't lose a Battle by accident.
25. As a player, I want the new Battle to use the same Scenario, Board, mode and side but a new Dice Seed, so that I get a fresh game, not a known one.
26. As a playtest organiser, I want the abandoned Battle recorded in play stats as abandoned, so that I can see how often players restart.
27. As a Hotseat player, I want Start over available too, so that both modes behave the same.

### Switching Unit and ending the Turn
28. As a player, I want a dialog "X ยังใช้ Action ได้ เริ่ม Y เลยไหม" when I start another Unit while the current one still has its Action, so that I don't lose an attack by accident.
29. As a player, I want to choose "เริ่ม Y" or "กลับไปเล่น X" in that dialog, so that I stay in control.
30. As a player, I want the end-of-Turn warning to list Units that moved but haven't used their Action, so that I don't end my Turn with an attack left.
31. As a player, I want no dialog when the current Unit has no legal Action left, so that the game doesn't nag me.

### Inspiration
32. As a player, I want Inspiration offered only when my attack roll misses, so that I'm not interrupted after a hit.
33. As a player, I want Inspiration offered when my save fails, so that I can still try to avoid a status.
34. As a player, I want Inspiration on initiative to stay as it is (the losing side may reroll), so that the start of a Battle doesn't change.
35. As a player, I want each Burst target, Mark and counterattack treated as separate attack rolls for this rule, so that the rule is consistent.
36. As a player vs AI, I want the AI's use of Inspiration unchanged, so that its strength doesn't shift.

### Camouflage text
37. As a player, I want Camouflage's description to say that adjacent enemies can still target a Hidden Unit, so that I hide where it actually helps.

### Skill range and Board size
38. As a player, I want positioning to matter, so that moving and terrain are real decisions.
39. As a designer, I want the simulator to measure "Turns before the first attack", so that I can see whether range changes create an approach phase.
40. As a designer, I want to run shorter ranges, a long-range disadvantage and line-of-sight-blocking terrain as separate simulator variants, so that I know which change helps.
41. As a designer, I want each variant measured with the same targets (team A 40–60%, turn limit ≤ 15%, at least 2,000 Battles per set), so that results are comparable.
42. As a designer, I want to choose a combination after seeing each variant alone, so that we don't overcorrect.
43. As a designer, I want every chosen rule change recorded as a D-row and every data change as a decision-log row with simulator results, so that the reasons stay visible.
44. As a player, I want 9x9 Boards to choose alongside the 7x7 ones, so that I can play a game with more room to move.
45. As a player, I want 9x9 Boards to fit a 375 px phone screen, so that they are playable on mobile.
46. As a player, I want the AI to play sensibly on 9x9 Boards, so that larger Boards are not trivially easy.
47. As a designer, I want the simulator to report 9x9 next to 7x7 with the same metrics, so that I can compare Board sizes.

### Threat zone overlay (added 2026-10-18)
53. As a player, I want a button that shows the Threat zone on the whole Board, so that I can see at a glance where enemies can reach next Turn.
54. As a player, I want to tap an enemy and see its move and attack range, so that I can plan around one dangerous enemy.

### Action plan: move and act in fewer taps (added 2026-10-18)
55. As a player, I want enemies my selected Unit can attack this activation (from its tile or after moving) marked with a sword badge, so that I see my options at a glance.
56. As a player, I want to tap a badged enemy and have the game pick a tile to attack it from, with the ghost Unit there and the attack preview (hit chance, damage), so that move-and-attack takes 3 taps.
57. As a player, I want the suggested tile to be my current tile when the enemy is already in range, so that attacking first and moving after (and Hit and Run) still work.
58. As a player, I want to switch the attack-from tile or the skill before confirming, so that the suggestion never decides for me.
59. As a player, I want to tap an enemy in the Move preview panel to attack it from the ghost tile, so that tile-first planning takes 4 taps.
60. As a player, I want one confirm button to do the Move and then the Action, labelled that the result cannot be undone once dice are rolled, so that I commit knowingly.
61. As a player, I want a tap on the Board never to commit anything, so that a mis-tap on a small tile is harmless.

### Act from the Move preview (added 2026-10-26, playtest of v0.2.0 on a phone)
Problem: during a Move preview, choosing a skill, Attack or Defend, or tapping an enemy the shadow cannot reach, acted from the Unit's real tile, so the Unit seemed to "go back". Decided in a grill session with the user on 2026-10-26 (decision log).
62. As a player, I want every action I choose during a Move preview (skills, Basic Attack, Defend, Burst with its centre in range of the shadow, Command) to be worked out from the shadow's tile and planned as Move (or Blink) + that action with one confirm, so that the Unit never acts from where it stood.
63. As a player, I want a tap on an enemy, or a skill target, that the shadow cannot reach to do nothing but show a hint ("from this tile X is out of reach, choose another tile"), so that the shadow never jumps to a tile I did not pick.
64. As a player, I want to cancel the Move preview (tap my Unit or Cancel) to act from my real tile again (attack first, Hit and Run), so that the old order still works.
65. As a player, I want a free skill that cannot join a plan (Camouflage) shown but disabled during a Move preview, with the hint to confirm the move first, so that I learn the order.
66. As a player, I want only the enemies the shadow can reach to carry the sword badge during a Move preview (others faded, line-of-sight blocked ones crossed), so that the Board shows what the shadow can do.
67. As a player on a phone, I want the Move preview panel and the Action plan card as a bottom sheet over the lower part of the Board, so that I do not scroll to find my actions.
68. As a player, I want the sheet to show "actions from here" right after I confirm a move only (an attack per enemy in range with hit chance, Defend, support skills and a "เสร็จ" button), and the enemies in range badged on the Board, so that I can still act in the same activation.
69. As a player, I want "เสร็จ" to only close the sheet and deselect the Unit (the activation ends as before: starting another Unit with the switch confirmation, or ending the Turn), so that no rule changes and an Action is not lost by mistake.
70. As a player, I want every action to keep one confirm (story 61), so that a mis-tap on a phone is harmless.

### Replay and analysis
48. As a playtest analyst, I want the Replay to record Undo actions, so that I can see where players changed their mind.
49. As a playtest analyst, I want Replay playback to skip undone actions by default with a toggle to show them, so that I can watch either the clean game or the full story.
50. As a player, I want Replay files from v0.1.x (format 1) to still open, so that old playtest files are not lost.
51. As a playtest organiser, I want play stats to count Undo uses per Battle, so that I can see how much players experiment.

### Release
52. As a playtest organiser, I want a new release after these changes with the visual fixtures refreshed, so that the next playtest uses them.

## Implementation Decisions

**Ownership and order (ADR 0004).** Engine, session, data, simulator, rules and Replay format are Claude tickets; UI (battle, web) is Codex tickets blocked by the matching Claude ticket. Order: 1 quick fixes → 2 Move preview → 3 Undo, Start over, Replay v2 → 4 range experiments → 5 Threat zone → 6 9x9 Boards → 7 release and next playtest. One Claude agent at a time; Codex may work in parallel on unblocked UI tickets.

**Seams (confirmed).** (1) Engine public interface: legal actions, apply action, preview, Replay playback. (2) Session API: the snapshot and commands Codex uses. (3) Simulator CLI. (4) Web text and Board screenshot tests. No new layer.

**Inspiration rule (rules §18, new D-row).** Offered only when the side's own attack roll misses (incl. Mark, each Burst target, counterattack) or its own save fails, and on initiative to the losing side as today. A hit is never offered. Rule change: ENGINE_VERSION minor bump; visual fixtures need the Codex refresh ticket (AGENTS.md rule). AI behaviour unchanged (it already uses Inspiration only on a missed attack against a Tamer and on its own failed saves); SIM_PROFILES and sim-v4 parity unchanged.

**Move preview (session, additive).** A new selection step between choosing a reachable tile and moving: the session holds a previewed tile (UI state, not game state) and the snapshot exposes it with, per skill that is ready, the enemies reachable from that tile and those blocked by line of sight, computed by the engine as if the Unit stood there (no state change, no dice). A confirm command performs the Move (or Blink) to the previewed tile. Tapping another reachable tile replaces the preview; tapping the Unit cancels it. The snapshot also carries the Threat zone count for the previewed tile (story 7) once ticket 5 lands; before that the field is absent.

**Act from the Move preview (session, additive; 2026-10-26).** While `movePreview` is set, `chooseSkill`, `defend`, `chooseCommand` and target aiming plan from the shadow's tile (an Action plan with origin = the shadow, `via` move or blink) instead of acting from the real tile; `defend` no longer dispatches at once during a preview. A target the shadow cannot reach is refused with a rejection code and the preview stays. Board highlights for the preview come from `movePreview.reach`. Camouflage and other free skills stay out of plans (disabled during a preview). No new engine action, no `ENGINE_VERSION` bump. "เสร็จ" after a move is UI only (deselect). UI: bottom sheet on phones, "actions from here" after a move only.

**Threat zone (engine helper + session field).** Rough estimate by agreement: for each enemy Unit still on the Board, it threatens a tile if Chebyshev distance from the enemy to the tile ≤ the enemy's walk range plus the longest range among its attack or save skills. Ignores cooldown, line of sight, Command, Taunt, Pin and other Units blocking. Shown at the previewed tile as a count, and (decided 2026-10-18 after docs/research/tactics-benchmark.md) as a full-Board overlay the player can toggle, off by default. Tapping an enemy to see its own move and attack range is a separate, low-priority pair of tickets (21, 22). Built after the range experiments (its value depends on the ranges).

**Switching Unit / end of Turn (session, additive).** The snapshot tells the UI whether starting another Unit would end a current activation that still has a legal Action (and which Unit), and lists Units that moved but have not used their Action, for the end-of-Turn warning. The dialog itself is UI.

**Undo (engine + session).** Why Undo never crosses a roll: the Dice Seed fixes the whole dice sequence, so after a roll is undone the player would already know the next result and could replay the Turn to steer around bad rolls (commercial games treat rewinds past dice the same way: the sequence does not change; docs/research/tactics-benchmark.md). Safe point = the later of the start of the current Turn and the last action whose events include a dice roll (attack roll, save, damage, heal, Bleed tick, initiative, Inspiration reroll), plus any decision that answered a roll (Inspiration use/decline). Undo is available only to the side whose Turn it is, only within that Turn, and only if at least one action lies after the safe point; it is hidden during the AI's Turn. Undoing removes the actions after the safe point and rebuilds state deterministically from the Replay (actions without dice do not consume the dice stream, so the rebuilt state is identical). The engine owns the meaning of an undo action inside a Replay; the session exposes whether Undo is available, what it would return to (start of Turn / after last roll), and the command.

**Replay format v2 (shared + engine).** formatVersion 2 adds an undo action recording that the actions since the safe point were withdrawn. Playback of a v2 file applies undo actions; the playback snapshot can skip undone actions (default) or show them. Format 1 files still open and play unchanged. Play stats gain an Undo count per Battle and an abandoned flag (additive to play-stats format).

**Start over (web + play stats).** In-Battle menu item with a confirmation dialog, both modes. Creates a new Battle with the same Scenario, Board, mode and side and a new Dice Seed; the old Battle is recorded in play stats as abandoned. No engine or session change beyond the play-stats field.

**Range experiments (simulator, data, rules).** Three variants measured separately, each with ≥ 2,000 Battles per set (Scenario 1/2 × each Board), game profiles on both sides: (a) shorter ranges in data (starting point: Long Shot, Element Bolt, Pin 4 → 3; Mark 5 → 4); (b) disadvantage on attacks at range 4 or more (rule switch); (c) a terrain type that blocks line of sight placed on Boards (rule + data). New metric: average Turns before the first attack roll. Targets: team A 40–60%, turn limit ≤ 15%, first-attack Turn higher than today. Then a combination is chosen and applied; rule changes bump ENGINE_VERSION, get D-rows, and keep sim-v4 parity by staying out of the sim-equivalent layer like ticket 27 did. A short report compares variants and the chosen combination.

**9x9 Boards (data, engine, AI, simulator, UI).** Board size becomes a property of each Board, not a game constant; start zones scale to the Board. New 9x9 Boards are added alongside 7x7 (players choose in the menu). AI and simulator handle any square size; the simulator report covers 9x9 next to 7x7. UI fits 9x9 in 375 px wide (tiles about 37 px) and needs new art/baselines (Codex).

**Action plan (session, additive; decided 2026-10-18 from docs/research/tactics-input-ux.md).** With a Unit selected, the snapshot marks enemies it can attack this activation (from its tile or after a legal Move/Blink) and the tiles it could attack each from. Tapping such an enemy forms an Action plan: attack-from tile chosen by the session (current tile if in range; else fewest steps; then lowest Threat zone once ticket 11 is in; then tile order), the skill, and the attack preview (hit chance and damage; this is aiming an attack, so it does not conflict with "no hit % while browsing tiles"). The player may change tile or skill. Confirm sends the existing Move or Blink action and then the existing Action (no new engine action, ENGINE_VERSION unchanged), goes through the switch-Unit guard of ticket 02, and the view must receive the Move's events as well as the Action's so the Unit walks before it attacks. Non-attack actions reachable from a tile (Defend, support skills) are listed too. A tap on the Board never commits. Tickets 23 (session) and 24 (UI).

**Text.** All new player-facing text lives in the web package's strings; the session carries no Thai text (ADR 0004). Camouflage description adds that adjacent enemies can still target a Hidden Unit.

## Testing Decisions

- Good tests exercise behaviour through the public interfaces only: engine tests apply actions and check state, events and legal actions; session tests drive commands and read snapshots; no test reaches into internals.
- **Engine:** Inspiration offered/not offered (hit, miss, failed save, initiative, Burst targets, counterattack); undo inside a Replay rebuilds the same state, never crosses a dice roll or a Turn boundary; Replay v1 and v2 both play; variant rules (long-range disadvantage, sight-blocking terrain) and any Board size. Prior art: existing engine rule tests and replay tests.
- **Session:** previewing a tile changes no game state; preview lists match the legal actions the Unit would have after moving there; confirm moves; cancel/replace; Blink preview; Undo availability, target label and result; hidden in AI Turn; switching-Unit and end-of-Turn data; Threat zone count on hand-built positions. Prior art: packages/session/test (e.g. the move-then-act selection test, free Camouflage tests).
- **AI and simulator:** SIM_PROFILES and sim-v4 parity unchanged; determinism; new first-attack metric; variant runs; 9x9 runs. Prior art: simulator tests and simParity tests.
- **Web (Codex):** text tests rendering components to static HTML (prior art: sessionText.test.ts from ticket 28); Board screenshot tests for the ghost, the panel and 9x9 (prior art: ticket 25 visual suite, run in CI by ticket 26). Every rules or data ticket comes with the Codex fixture-refresh ticket.

## Out of Scope

- Undo across a dice roll, into the opponent's Turn, or restarting with the same Dice Seed.
- An AI-suggested best move, or an exact Threat zone (cooldown, line of sight).
- Showing hit % per target inside the Move preview while browsing tiles (decided 2026-10-18: hit chance is shown when aiming an attack, which includes the Action plan confirm card, not while previewing a move).
- An automatic end-of-Turn option (decided 2026-10-18: conflicts with Undo; revisit after playtest).
- Planning several Units at once before playing them.
- Replacing 7x7 Boards; changing deployment rules other than scaling start zones.
- Phase 2 features (campaign, ranch, Combine/Hybrid, Hall of Fame).
- Blink balance (nearly unused; wait for playtest feedback).

## Further Notes

- 2026-10-18: touch input research in docs/research/tactics-input-ux.md led to the Action plan (enemy-first 3 taps, tile-first 4 taps, down from 6): tickets 23–24, a Threat zone tie-break in 11, badge-safe colours in 12, and the enemy-tap meaning in 22 (badged = target, unbadged = show range).

- 2026-10-18: benchmark of commercial tactics games in docs/research/tactics-benchmark.md led to: ticket 20 (distance-rule variants, ranges 2–3, safe/threatened-tile metric; ticket 08 was already in progress), the full-Board Threat zone overlay (tickets 11, 12), tickets 21–22 (tap an enemy to see its range, low priority), and the Undo-reason text (ticket 07). Hit % in Move preview and auto end-of-Turn were declined.

- Glossary updated in CONTEXT.md: Move preview, Threat zone, Undo, Start over; Board (size per Board) and Replay (includes undone actions).
- The Threat zone is meaningful only after the range fix; with today's ranges almost every tile on a 7x7 Board shows every enemy.
- Shorter ranges may lengthen Battles; the turn-limit target guards against that.
- Playtest evidence: Replay `replay_scenario_1_crossroads_dbcac3b2df899cba_20261017-040634.json` (v0.1.5), analysed 2026-10-17.
