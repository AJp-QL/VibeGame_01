# 18 — Tuning: Marked อยู่ถึงจบ Turn ถัดไปของฝั่งผู้ Mark

**What to build:** Mark มีประโยชน์จริงในการเล่น: Marked ไม่หมดไปทันทีหลัง Turn ที่ถูก Mark แต่อยู่จนจบ Turn ถัดไปของฝั่งที่ใช้ Mark ทำให้พวกเดียวกันที่เล่นใน Turn ถัดไปได้ advantage ด้วย ตามที่ตกลงไว้ใน rules §23 D-03 และ decision log (2026-10-15) แก้กติกาใน rules ฉบับรวม แก้ data ของ Marked และวัดผลด้วย simulator

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] rules ฉบับรวม §14 และตาราง D-03 ใน §23 อธิบายระยะเวลาใหม่ของ Marked ชัดเจน และ decision log มีแถวบันทึกการเปลี่ยน
- [ ] Marked ที่ติดใน Turn ของฝั่ง X มีผลกับผู้โจมตีทุกตัวจนจบ Turn ถัดไปของฝั่ง X (รวม Turn ของอีกฝั่งระหว่างนั้น) ติดซ้ำแล้วรีเซ็ต ไม่ซ้อน
- [ ] ENGINE_VERSION ขยับตามกฎ และ Replay เก่าถูกปฏิเสธว่าเวอร์ชันไม่ตรง
- [ ] test ผ่าน interface ของ engine ครอบคลุมระยะเวลาใหม่, advantage ของพวกเดียวกันใน Turn ถัดไป และการหมดอายุ
- [ ] รายงาน simulator ก่อนและหลัง (S1/S2 × Crossroads/Shallows) แสดงผลต่อการใช้ Mark และอัตราชนะ
