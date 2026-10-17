# 11 — Threat zone ใน session

**Owner:** claude

**What to build:** Move preview บอกจำนวนศัตรูที่อาจโจมตีช่องที่กำลังดูได้ใน Turn หน้าของอีกฝั่ง แบบหยาบตามที่ตกลง: ศัตรูที่ยังอยู่บน Board นับเมื่อระยะ (Chebyshev) จากศัตรูถึงช่อง ≤ ระยะเดินของศัตรู + ระยะ skill โจมตีหรือ skill แบบ save ที่ไกลที่สุดของมัน ไม่คิด cooldown, line of sight, Command, Taunt, Pin หรือ Unit ที่ขวาง (spec: Threat zone, user stories 7–8)

**Blocked by:** 03 — Move preview ใน session, 09 — ใช้ชุดแก้ระยะ skill ที่ผู้ใช้เลือก

**Status:** ready-for-agent

- [ ] engine มี helper นับ Threat zone ของช่องตามนิยามใน CONTEXT.md
- [ ] snapshot ของ Move preview มีจำนวน Threat zone ของช่องที่ดู (แบบเพิ่มเท่านั้น)
- [ ] test บนตำแหน่งที่สร้างเอง: ศัตรูระยะใกล้/ไกล, ศัตรูที่ล้มแล้วไม่นับ, ช่องที่ไม่มีใครถึง
