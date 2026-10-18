# 25 — test เทียบภาพ Move preview: ขั้น "re-select" ต้องไม่พึ่งว่าแตะ Unit แล้วเลิกเลือกด้วย

**Owner:** codex

**What to build:** `packages/web/visual/move-preview.visual.ts` (ticket 04) ยกเลิก preview ด้วยการแตะ Unit เดิม แล้วแตะ Unit เดิมอีกครั้งเพื่อ "Re-select" โดยสมมติว่าการแตะครั้งแรกเลิกเลือก Unit ทั้งหมด ticket 18 (PR #29) เปลี่ยน session ตาม spec user story 3: แตะ Unit ขณะมี Move preview ยกเลิกแค่ preview Unit ยังเลือกอยู่ (Blink: ยังเล็ง Blink อยู่) จึงการแตะครั้งที่สองจะเลิกเลือก Unit และ test หมดเวลาที่ `locator.click` (ทั้ง 6 ภาพ `preview-*`) PR #29 ผ่าน typecheck/test/build แต่ job ภาพแดงจนกว่าจะแก้ test นี้

แก้ test ให้ใช้ได้กับ session ทั้งก่อนและหลัง ticket 18 เพื่อ merge ได้ก่อน: หลังแตะ Unit เดิมเพื่อยกเลิก preview ให้ตรวจ `previewSession.getSnapshot().selectedUnit` ถ้ายังเลือกอยู่ (พฤติกรรมใหม่) ไม่ต้องแตะซ้ำ (Blink: ปุ่ม Blink ยังเล็งอยู่ ไม่ต้องกดซ้ำ) ถ้าไม่ได้เลือก (พฤติกรรมเดิม) ค่อยแตะ Unit และกด Blink เหมือนเดิม และ assert ว่า preview หาย, Battle ไม่เปลี่ยน (revision เท่าเดิม) ภาพ baseline ไม่เปลี่ยน ส่วนที่เหลือของ ticket 19 (อ่าน `movePreview` จาก port, ชื่อ field, README) ยังเป็นของ ticket 19

**Blocked by:** None — ทำก่อนแล้วจึง merge ticket 18 (PR #29)

**Status:** done

- [x] `move-preview.visual.ts` ผ่านทั้ง 6 กรณีกับ session ปัจจุบัน (main) และกับ session หลัง PR #29 (merge PR #29 เข้า branch ทดสอบ หรือรอ CI ของ PR #29 เขียวหลัง rebase)
- [x] ไม่แก้ภาพ baseline; `pnpm --filter @mt/web test:visual` ผ่านบน Linux
- [x] CI เขียวทั้งสาม job

## Verification

- Current `main`: all six Move preview cases passed without baseline changes.
- Local integration of PR #29 (`06b6a65`, ticket 18): typecheck and all six Move preview cases passed against the same baselines. The integration merge is not included in this PR.
- Full Linux visual suite: 27/27 passed with pinned Chromium; baseline images unchanged.
- All three CI jobs passed: https://github.com/AJp-QL/VibeGame_01/actions/runs/39100657065
