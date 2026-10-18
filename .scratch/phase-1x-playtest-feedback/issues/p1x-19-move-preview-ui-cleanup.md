# P1X-19 — UI: Move preview cleanup หลัง ticket 18

**Owner:** codex

**What to build:** เก็บงานของ ticket 04 ตามที่ review PR #26 พบ หลังจาก session มี `BattleSnapshot.movePreview` และแตะ Unit ยกเลิกแค่ preview (ticket 18): Board อ่าน `snapshot.movePreview` ตรงจาก port แทนการ cast, ตรวจว่าแตะ Unit ขณะมีเงาแล้วเงาหายแต่ Unit ยังเลือกอยู่และช่องยังสว่าง (spec user story 3) และ hint "แตะ Unit เพื่อยกเลิก" ตรงกับพฤติกรรมนี้ รวมถึงเรื่องเล็กจาก review: ชื่อ field ใน BattleScene ใช้คำตาม CONTEXT.md (Move preview ไม่ใช่ "ghost move"), และ `packages/web/visual/README.md` อธิบาย flag `--disable-lcd-text` กับหน้า `move-preview` (ขนาดภาพ, threshold, รายการ capture `preview-*`)

**Blocked by:** P1X-18 — Move preview ใน session: แตะ Unit ยกเลิกแค่ preview และ movePreview ใน BattleSnapshot; P1X-25 (แก้ test re-select) ควร merge ก่อน

**Status:** done

- [x] `BattleScene.ts` อ่าน `snapshot.movePreview` จาก `BattleSnapshot` โดยไม่มี type cast
- [x] แตะ Unit ขณะมีเงา: เงาและแผงหาย Unit ยังเลือกอยู่และช่องที่เดินได้ยังสว่าง (Move และ Blink); มี test
- [x] field ใน BattleScene ใช้ชื่อตามคำใน CONTEXT.md
- [x] `visual/README.md` อธิบาย `--disable-lcd-text` และหน้า `move-preview` พร้อมรายการ capture
- [x] screenshot ไม่เปลี่ยน (หรือ update baseline และตรวจทุกภาพถ้าเปลี่ยน); CI เขียวทั้งสาม job


## Verification notes

- The cleanup reads `BattleSnapshot.movePreview` directly and renames the view
  graphics field to `movePreview`. Rendering and gameplay behaviour are unchanged.
- The six browser cases assert the Move preview hint, unchanged selection, mode,
  reachable/available Blink tiles, action count and Battle revision after tapping
  the selected Unit. The cancelled Board must match its pre-preview pixels,
  showing that the shadow disappears while selection and highlights remain.
- Removed PR #41's pre-ticket-18 reselection branch. Each case now continues
  directly from cancellation to a new preview and confirms with the real button.

- Validation: frozen install, typecheck, build, visual TypeScript build and path
  ownership check passed. `pnpm test --maxWorkers=2 --testTimeout=60000`:
  908 passed, 1 skipped. Longer timeout is only a command-line setting for the
  cloud simulator tests; normal `pnpm test` passed in CI.
- All 27 Linux pinned-Chromium visual integration cases passed with ticket 10's
  refreshed assets, without any baseline changes. All six cancellation images
  were inspected: [evidence](../evidence/19-move-preview-ui-cleanup/README.md).
- Standalone `check-replays` returns 3 because main still has the old 0.10.0
  fixtures. Merge ticket 10 / PR #45 first, update this branch from main, and
  rerun normal visual CI. This PR contains no fixture or baseline refresh.
- All three implementation CI jobs passed:
  https://github.com/AJp-QL/VibeGame_01/actions/runs/39131905413
  (visual job skips stale fixtures until ticket 10 lands).
