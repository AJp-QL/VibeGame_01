# 26 — test ของ web: Camouflage text test ต้องไม่พึ่งว่า Board ไม่มีภูเขา/กติการะยะ

**Owner:** codex

**What to build:** ticket 09 (PR ของ claude/09) เปลี่ยน data และกติกา: ระยะ Long Shot / Element Bolt / Pin เป็น 3 และ Mark เป็น 4, Crossroads และ Shallows มีภูเขาเพิ่มอย่างละ 4 ช่อง, attack roll ระยะ 4 ขึ้นไปได้ disadvantage และภูเขาบัง line of sight (D-31, `GAME_RANGE_RULES`) ทุก Battle ที่สร้างด้วย `createBattle` โดยไม่ระบุ `rangeRules` เล่นด้วยกติกาใหม่ ทดสอบเดียวใน `packages/web` ที่พัง: `packages/web/test/sessionText.test.ts` > "mentions both Move and the free skill after Long Shot before moving (ticket 30)" Quillfox บน e7 ยิง Fangrel บน e4 แต่ e5 เป็นภูเขาใหม่คั่นอยู่ Long Shot จึงยิงไม่ได้ (`ready` เป็น null)

แก้ test นี้ให้ไม่พึ่งภูเขาใหม่ ทำก่อนแล้วจึง merge PR ของ ticket 09 (CI ต้องเขียว): ทางที่เล็กที่สุดคือสร้าง Battle ของ test ด้วย `rangeRules: NO_RANGE_RULES` (re-export จาก `@mt/session` ใน PR ของ ticket 09 เป็นการเพิ่มอย่างเดียว; ระหว่างรอ ใช้ `{}` ได้ เพราะ `RangeRules` ทุก field เป็น optional) ระยะจาก e7 ไป e4 คือ 3 ซึ่งอยู่ในระยะ 3 ของ Long Shot อยู่แล้ว ถ้า test อื่นของ web เปลี่ยนในภายหลังด้วยเหตุเดียวกัน ใช้วิธีเดียวกัน

หมายเหตุ: ticket 10 (refresh visual fixtures และข้อความกติกาใหม่) ยังเป็นงานของ Codex ต่างหาก

**Blocked by:** None — ทำก่อนแล้ว merge PR ของ ticket 09

**Status:** ready-for-agent

- [ ] `sessionText.test.ts` ผ่านกับ session ปัจจุบัน (main) และกับ session หลัง PR ของ ticket 09
- [ ] ไม่แก้ไฟล์นอก `packages/web/test/`
- [ ] CI เขียวทั้งสาม job
