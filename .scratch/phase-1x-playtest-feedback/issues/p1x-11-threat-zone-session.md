# P1X-11 — Threat zone ใน session

**Owner:** claude

**What to build:** Move preview บอกจำนวนศัตรูที่อาจโจมตีช่องที่กำลังดูได้ใน Turn หน้าของอีกฝั่ง แบบหยาบตามที่ตกลง: ศัตรูที่ยังอยู่บน Board นับเมื่อระยะ (Chebyshev) จากศัตรูถึงช่อง ≤ ระยะเดินของศัตรู + ระยะ skill โจมตีหรือ skill แบบ save ที่ไกลที่สุดของมัน ไม่คิด cooldown, line of sight, Command, Taunt, Pin หรือ Unit ที่ขวาง และให้ข้อมูล Threat zone ของทุกช่องบน Board (จำนวนต่อช่อง) สำหรับ overlay ทั้ง Board ที่ผู้เล่นเปิด/ปิดได้ (ตัดสิน 2026-10-18 จาก docs/research/tactics-benchmark.md: เกมที่เทียบทุกเกมมี overlay ทั้ง Board แบบเปิด/ปิด) (spec: Threat zone, user stories 7–8, 53)

**Blocked by:** P1X-03 — Move preview ใน session, P1X-09 — ใช้ชุดแก้ระยะ skill ที่ผู้ใช้เลือก

**Status:** done

- [x] engine มี helper นับ Threat zone ของช่องตามนิยามใน CONTEXT.md
- [x] snapshot ของ Move preview มีจำนวน Threat zone ของช่องที่ดู (แบบเพิ่มเท่านั้น)
- [x] session ให้ Threat zone ของทุกช่องบน Board สำหรับฝั่งที่กำลังเล่น (แบบเพิ่มเท่านั้น) ใช้นิยามเดียวกับจำนวนที่ช่อง Move preview
- [x] ถ้า ticket 23 (Action plan) merge แล้ว: ใช้จำนวน Threat zone เป็นตัวตัดสินลำดับที่ 2 ในการเลือกช่องที่จะยืนโจมตี (หลังจำนวนก้าวน้อยสุด ก่อนลำดับช่อง) มี test
- [x] test บนตำแหน่งที่สร้างเอง: ศัตรูระยะใกล้/ไกล, ศัตรูที่ล้มแล้วไม่นับ, ช่องที่ไม่มีใครถึง

## Comments

- Engine: `src/threat.ts` (`threatCount`, `threatZone`, `threatReach`, `longestAttackReach`), tests `packages/engine/test/threat.test.ts`. Session: `MovePreview.threat`, `SessionSnapshot.threatZone`, tie-break in the Action plan (`compareOrigins` threat callback), tests `packages/session/test/sessionThreat.test.ts` (layout found by scan where Threat zone beats tile order). Tests cut skill ranges to 1 because on 7x7 reach is mostly 6+ and every tile reads 3. Branch includes P1X-23 (PR #51) for the tie-break; merge #51 first. ENGINE_VERSION unchanged.
