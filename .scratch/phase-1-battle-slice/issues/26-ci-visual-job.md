# 26 — CI: job test เทียบภาพ

**Owner:** claude

**What to build:** เพิ่ม job ใน `.github/workflows/ci.yml` ที่รัน test เทียบภาพของ ticket 25 ทุก push และ PR: ตั้ง Node 24 + pnpm แบบเดียวกับ job build, `pnpm install --frozen-lockfile`, ติดตั้ง browser ตามคำสั่งที่ PR ของ ticket 25 ระบุ (เช่น `pnpm --filter @mt/web exec playwright install --with-deps chromium`), รัน `pnpm --filter @mt/web test:visual` และ upload ภาพ diff เป็น artifact เมื่อ test ล้ม action ทุกตัว pin ด้วย commit SHA ที่อายุอย่างน้อย 2 สัปดาห์ตามกฎใน ci.yml ticket นี้มีเพราะ `.github/` เป็นของ Claude เท่านั้น (`.github/ownership.json`) ถ้า ticket 25 ต้องแก้ config ที่ root (เช่น `pnpm-workspace.yaml` สำหรับ dependency ที่ติด `minimumReleaseAge` หรือ build script) ก็ทำใน ticket นี้

job ต้องแยก "fixture ล้าสมัย" ออกจาก "ภาพเปลี่ยน": ถ้า `openReplay` ไม่คืน `ready` เพราะ `engineVersion` หรือ `dataHash` ไม่ตรง ให้ job พิมพ์ข้อความชัดเจนว่า Replay fixture ล้าสมัย ให้รัน `visual:fixtures` แล้วตรวจ baseline ด้วยตา (เปิด ticket `Owner: codex` ตาม AGENTS.md) ไม่ปล่อยให้เห็นเป็น stack trace ของ harness ทำได้โดยให้ harness โยน error ที่มีข้อความนี้ (แก้ใน `packages/web/visual/` เป็นงาน Codex ถ้าต้องแก้ ให้เปิด ticket `Owner: codex`) หรือให้ step ใน ci.yml ตรวจ output

**Blocked by:** 25 — test เทียบภาพ screenshot ของ skill visuals, 28 — fixture ต้องตรงกับ main ก่อนเปิด job (ticket 29 ถูกรวมใน 28)

**Status:** in progress (PR #12; set to done after the green run on main)

- [ ] job ใหม่ใน ci.yml รัน test ภาพบน ubuntu-latest และผ่านบน main หลัง merge ticket 25 (ผ่านบน PR แล้ว; ยืนยันบน main หลัง merge)
- [x] ภาพ diff ถูก upload เป็น artifact เมื่อล้ม (ทดลองด้วย branch ที่ทำให้ภาพเปลี่ยน แล้วลบ branch)
- [x] action ใหม่ pin SHA พร้อมเวอร์ชันและวันที่ใน comment เหมือนตัวเดิม
- [x] fixture ล้าสมัยแสดงข้อความ "ล้าสมัย + วิธีแก้" ใน log ของ CI ไม่ใช่ stack trace เฉยๆ
- [x] AGENTS.md ส่วน Commands และ docs/agents/codex.md บอกคำสั่ง test ภาพ

- PR #12. Policy decided with the user: stale fixtures -> warning + job summary, skip the screenshot comparison, job stays green (else every rules PR would deadlock, since fixtures are Codex-owned). New `pnpm --filter @mt/simulator check-replays` (exit 3 = stale). upload-artifact pinned to v7.0.1 (v7.0.2 under two weeks old).
- Verified on throwaway branches (deleted): GUARDED colour tweak -> visual job red, artifact `visual-regression` downloaded with expected/actual/diff PNGs; weakened.json tweak -> job green, 2 warning annotations, Chromium install and comparison skipped. First stale try failed (`pnpm --filter` turns exit 3 into 1 under `-o pipefail`); fixed with `pnpm --dir`.
