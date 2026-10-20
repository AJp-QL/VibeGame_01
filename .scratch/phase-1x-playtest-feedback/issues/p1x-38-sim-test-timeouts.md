# P1X-38 — test ของ simulator ชน timeout 5000ms บน CI เป็นบางครั้ง

**Owner:** claude

**What to build:** job "Typecheck, test, build" ล้มแบบ flaky เพราะ test ใน `tools/simulator/test/` ที่ไม่มี timeout ของตัวเองชน default 5000ms ของ vitest เห็นใน PR 75 (แก้แค่ markdown): run 39462544371 ล้มที่ `test/ranges.test.ts:119` (abc เท่ากับเกมจริง) และรันซ้ำล้มที่ `test/boardSize.test.ts:16` (9x9) ส่วน run `pull_request` บน commit เดียวกันผ่าน

สาเหตุ: Battle เต็มตาที่ AI greedy เล่นสองฝั่งใช้ราว 100–150ms ต่อ Battle บนเครื่อง dev (7x7 ~110ms, 9x9 ~140ms) test เหล่านี้เล่น 9–16 Battle ต่อ test (เช่น 9x9: 6 Battle × 2 รอบ, abc: 6 × 2) จึงใช้ 1–1.7s บนเครื่อง dev ที่ไม่มีงานอื่นแย่ง CPU แต่บน runner ของ GitHub (ubuntu-24.04, repo private) ช้ากว่าราว 3 เท่า (9x9 ใช้ >5.1s บน CI เทียบ 1.7s บนเครื่อง dev) เพราะ vitest รันทุก project พร้อมกันข้าง test หนัก (parity 100 Battle, variant 8 ชุด, lookahead ของ `@mt/ai`) และบาง test สร้าง `worker_threads` เพิ่ม CPU จึงถูกแย่ง เวลาของ test ที่ไม่มี timeout จึงแกว่งไปถึง 5s บนเครื่อง dev ก็เห็นผลเดียวกัน: รันแบบ 16 worker test abc ใช้ 4.8s แทน 1.3s

แก้ที่ test ไม่แก้ `src/`: ลดจำนวน Battle ต่อ test ให้เหลือน้อยที่สุดที่ยังตรวจสิ่งเดิม (อย่างน้อย 2 Battle ทุกที่ที่เทียบ `aggregate` หรือความ deterministic) ใส่ timeout เฉพาะ test ที่มีต้นทุนคงที่ซึ่งลดไม่ได้ (สร้าง worker thread) พร้อมเหตุผลใน comment ไม่แตะ test parity (สถิติ 100 Battle, มี timeout 180s อยู่แล้ว) และ test "variants ต่างจาก baseline" (ต้องใช้ 30 Battle ให้มีพลังทางสถิติ, มี timeout แล้ว) ไม่เปลี่ยนผลของ simulator หรือ baseline ของ parity ไม่ขยับ ENGINE_VERSION

**Blocked by:** None — can start immediately

**Status:** done

- [x] test ของ simulator ที่ไม่มี timeout ของตัวเองใช้ไม่เกิน ~1s บนเครื่อง dev แม้ CPU ถูกแย่ง (เผื่อ CI ช้ากว่า 3 เท่าแล้วยังต่ำกว่า 5s; ส่วนใหญ่ ≤0.7s) รายงานเวลาก่อน/หลังใน PR
- [x] แต่ละ test ยังตรวจสิ่งเดิม: test abc ยังล้มถ้า variant abc ไม่ตรงกับเกม (ลองทำให้พังแล้วเห็นแดง)
- [x] timeout ที่เพิ่มมีเหตุผลใน comment
- [x] typecheck, test, build, path check ผ่าน; ENGINE_VERSION และ `src/` ของ simulator ไม่เปลี่ยน

## Comments

- 2026-10-21 (claude): Battles per test: 9x9 6→2, ranges `job` 6→2, determinism 3→2, distance 3→2 and 8→2; distance worker-thread test on 2 sets + 60s timeout (fixed cost of starting threads). Local, pinned to 2 cores, whole suite: 9x9 1715→338ms, abc 1301→528ms, determinism 902→765ms, distance baseline 948→318ms; at 16 workers abc 4791→696ms, simulator project 50.2s→25.9s. Breaking abc's long-range rule in `applyVariant` still turns the abc test red. `src/`, parity and ENGINE_VERSION unchanged.
