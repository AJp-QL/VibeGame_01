# P1X-14 — UI: ขนาด Board ต่อ Board ใน battle และ web

**Owner:** codex

**What to build:** ขั้น migrate ของ expand–contract: Phaser Board (ขนาดภาพ, เส้นตาราง, การแปลงตำแหน่งแตะเป็นช่อง, ป้ายช่อง), การจัดขนาด Board ให้พอดีจอ และ mini Board ในเมนู อ่านขนาดจาก Battle/Board แทนค่าคงที่ 7 ผู้เล่นไม่เห็นความต่างบน Board 7x7 ทุกอัน ถ้า ticket 13 ทำให้ dataHash เปลี่ยน ให้ refresh visual fixtures ด้วย

**Blocked by:** P1X-13 — ขนาด Board ต่อ Board: expand และย้าย engine, AI, simulator

**Status:** done

- [x] battle และ web ไม่ใช้ค่าคงที่ขนาด Board อีก
- [x] screenshot ของ Board 7x7 ทุกภาพเหมือนเดิม (หรือ refresh เพราะ dataHash เท่านั้น ภาพไม่เปลี่ยน)
- [x] test ด้วย Board ทดสอบขนาดอื่นแสดงได้และแตะได้ถูกช่อง (unit test ของการแปลงตำแหน่ง)
- [x] CI เขียวทั้งสาม job


## Comments

- Canvas, grid and tap conversion read `state.terrain.length`; fitting uses
  the canvas's logical size and the web box receives the Battle's pixel size.
  Menu thumbnail columns read Board terrain length. No Board-size constants
  remain in battle/web source; no engine imports bypass `@mt/session`.
- Tests cover sizes 3, 7, 9, 15 and a real 9×9 browser Battle at desktop/360 px:
  Move to i5 and tap i9, mini-Board column counts, no horizontal overflow.
- Local checks: frozen install, typecheck, 822 tests passed (1 intentional skip),
  build, Replay validation, 19 unchanged screenshot comparisons and 2 browser
  size/input cases all passed. No dataHash, fixture or baseline changes.
- Closed an existing unclosed legend CSS block so mini-Board grid styles apply.
- [Screenshots and review notes](../evidence/14-board-size-ui/README.md).
- Merge-order rule with ticket 04 / PR #26: whichever merges second must first
  merge latest `origin/main` into its branch and rerun all checks.
- Path ownership check passed (18 files). All three CI jobs passed on
  [run 39045253523](https://github.com/AJp-QL/VibeGame_01/actions/runs/39045253523),
  including actual comparisons of all original 7×7 Board screenshots.
- [PR #27](https://github.com/AJp-QL/VibeGame_01/pull/27), pending review/merge.

- PR review follow-up: EventLog checks blocked-push tiles against the Battle's
  terrain length, with a regression for an occupied i5 on a real 9×9 Battle and
  an off-Board j5 case. Zoom expectations now use independently specified
  device-pixel scales and verify that the next larger scale cannot fit.
- PR #26 was still open when these fixes began; the merge-order requirement
  remains in force before either PR is merged second.

- PR #26 merged as `295cd1a`. Merged updated `origin/main` into this branch;
  resolved BattleScene imports by retaining both size-aware geometry and the
  Move preview type, and retained both sets of text regression tests.
