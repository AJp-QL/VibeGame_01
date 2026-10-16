# 24 — แตก App.tsx เป็น component ย่อย (ไม่เปลี่ยนพฤติกรรม)

**Owner:** codex

**What to build:** แตก `packages/web/src/App.tsx` (~1,450 บรรทัด) เป็น component และ module ย่อยที่แต่ละไฟล์ทำเรื่องเดียว (เช่น หน้าจอ Battle, แผงข้อมูล Unit, ปุ่ม action, log, หน้าสรุปผล, hook ที่ต่อกับ `@mt/session`) โดยพฤติกรรมเดิมทุกอย่าง: ผู้เล่นเห็นและกดได้เหมือนเดิมทุกหน้าจอ เป็นงานแรกของ Codex จึงใช้ทดสอบขั้นตอนทั้งวง: branch `codex/` → PR → CI → Claude review (`/code-review`) → ผู้ใช้ merge (decision log 2026-10-16 "งานแรกของ Codex") ขอบเขตอยู่ใน `packages/web/**` เท่านั้น ถ้าพบว่าต้องการอะไรเพิ่มจาก `@mt/session` ให้เปิด ticket `Owner: claude` แทนการแก้เอง (`docs/agents/codex.md`)

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `App.tsx` เหลือเป็นตัวประกอบหน้าจอ (routing ระหว่างเมนู / Battle / Replay / วิธีเล่น) ส่วนอื่นย้ายไปไฟล์ใหม่ใน `packages/web/src/` ไม่มีไฟล์ใหม่ที่ยาวเกิน ~400 บรรทัด
- [ ] ไม่เปลี่ยนพฤติกรรม: ไม่แก้ logic, ข้อความ, style หรือลำดับการเรียก `@mt/session`; ระบุใน PR ว่าเป็น refactor ล้วน
- [ ] test เดิมของ web ผ่านทั้งหมดโดยไม่แก้ assertion (แก้ได้แค่ path ของ import ถ้า test import ไฟล์ที่ย้าย)
- [ ] ไม่มีข้อความที่ผู้เล่นเห็นฝังในโค้ดใหม่: `packages/web/test/uiStrings.test.ts` ผ่าน ข้อความยังมาจาก `src/strings.ts`
- [ ] import ชื่อจาก engine ผ่าน `@mt/session` เท่านั้น (ไม่ import `@mt/engine` / `@mt/ai` ตรง)
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm build` ผ่าน และ bundle build ได้
- [ ] PR มาจาก branch `codex/24-…` และ CI ผ่านทั้งสอง job รวม path check (แก้เฉพาะ `packages/web/**` และ `.scratch/**`)
- [ ] PR description ลิงก์ ticket นี้ บอกคำสั่งที่รันพร้อมจำนวน test และมี screenshot เมนูกับหน้าจอ Battle (desktop และกว้าง 360 px) ก่อน/หลังที่เหมือนกัน
