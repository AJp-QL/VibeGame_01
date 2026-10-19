# P1X-15 — contract ค่าคงที่ขนาด Board และเพิ่ม Board 9x9

**Owner:** claude

**What to build:** ขั้น contract: ลบค่าคงที่ขนาด Board เดิมเมื่อไม่มีใครใช้แล้ว และเพิ่ม Board 9x9 ใน data คู่กับ 7x7 (ไม่แทน) start zone ปรับตามขนาด Board AI เล่นบน 9x9 ได้สมเหตุสมผล และ simulator รายงาน 9x9 เทียบ 7x7 ด้วยตัวชี้วัดเดียวกัน (spec user stories 44, 46–47)

**Blocked by:** P1X-13 — expand engine, P1X-14 — migrate battle/web, P1X-09 — ใช้ชุดแก้ระยะ skill ที่ผู้ใช้เลือก (วัด 9x9 ด้วยระยะสุดท้าย)

**Status:** in-review (PR open; 9x9 misses balance targets, options in docs/balance/ticket-15-findings.md)

- [x] ไม่มี code ไหนใช้ค่าคงที่ขนาด Board เดิม และค่าคงที่ถูกลบ
- [x] Board 9x9 อย่างน้อย 1 อัน (แนะนำ 2 ให้คู่กับ Crossroads/Shallows) ใน data ผ่านการตรวจ data และมี start zone ตามกติกาที่ปรับตามขนาด (rules และ D-row ถ้ากติกา start zone เปลี่ยน)
- [x] simulator ≥ 2,000 Battle ต่อชุดบน 9x9: A win %, turn limit %, Turn ก่อนการโจมตีครั้งแรก เทียบ 7x7 ในรายงาน docs/balance; ถ้า 9x9 ออกนอกเป้า (40–60%, turn limit ≤ 15%) ให้รายงานทางเลือกแทนการแก้กติกาเอง
- [x] Board ใหม่ทำให้ dataHash เปลี่ยน: ticket 16 ระบุว่าต้อง refresh visual fixtures
