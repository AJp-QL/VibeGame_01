# P1X-04 — UI: Move preview

**Owner:** codex

**What to build:** แตะช่องที่สว่างแล้วเห็นเงาของ Unit บนช่องนั้นแทนการเดินทันที พร้อมแผงที่บอกว่าจากช่องนั้น skill ไหนถึงศัตรูตัวไหน (ตัวที่ line of sight บังแสดงว่าเล็งไม่ได้) กดปุ่ม "เดิน" จึงเดินจริง Wispling ใช้ปุ่ม "Blink" แตะช่องอื่นย้ายเงา แตะ Unit ยกเลิก hint อธิบาย flow ใหม่ ใช้ได้ทั้งจอ 360 px และ desktop (spec user stories 1–13)

**Blocked by:** P1X-03 — Move preview ใน session

**Status:** done

- [x] เงา Unit และแผง preview แสดงตามข้อมูลของ session ไม่คำนวณกติกาเอง
- [x] ปุ่ม "เดิน" / "Blink" ยืนยันการเดิน; แตะช่องอื่นและแตะ Unit ทำงานตามที่บอก
- [x] hint ใน TurnPanel อธิบาย Move preview และบอกว่า "ยังเดินได้" เฉพาะเมื่อ Unit มีช่องที่เดินได้จริง (ตาม reachable ของ session ไม่ใช่แค่ยังไม่ได้เดิน) เช่น Unit ที่ติด Pin ต้องไม่ถูกบอกว่ายังเดินได้ (พบจาก review PR #16)
- [x] ข้อความอยู่ใน strings ของ web มี text test
- [x] screenshot test ของเงาและแผงที่ desktop และ 360 px ไม่มี horizontal scroll; CI เขียวทั้งสาม job


## Comments

- Preview taps call `previewMove`; Move/Blink confirmation calls `confirmMove`
  through ticket 02's activation guard. Target and blocker lists come directly
  from `snapshot.movePreview.reach`. The renderer reads the optional live-session
  preview while Replay ports continue to work unchanged.
- Movement hints use `reachable.length`, including free-skill hints after Action.
- Added six Linux/pinned Chromium baselines and browser interaction cases at
  1280 and 360 px. All 19 original Board baselines remain unchanged.
- Local checks: frozen install, typecheck, 817 tests passed (1 intentional skip),
  build and Replay validation passed.
- [Every-image inspection and screenshots](../evidence/04-move-preview-ui/README.md).
- Merge-order rule: whichever of tickets 04 and 14 merges second must merge
  latest `origin/main` into its branch and rerun all checks before merging.
- Final validation: 25/25 visual tests passed locally; all three CI jobs passed
  on [run 39044913923](https://github.com/AJp-QL/VibeGame_01/actions/runs/39044913923).
  The screenshot browser disables LCD text so pinned-font text compares across
  Debian and Ubuntu. No baselines changed for this fix.
- [PR #26](https://github.com/AJp-QL/VibeGame_01/pull/26), pending review/merge.
