# 07 — ระบบ skill และ status ด้วย Fangrel

**What to build:** Monster ใช้ skill ใน loadout ได้ตาม tier (Minor, Major cooldown 2 Turn, Signature 1 ครั้งต่อ Battle, Passive) และ status ทำงานตามตาราง status เริ่มจาก Fangrel ครบ loadout: Heavy Blow, Rend (Bleed), Hit and Run, Pack Howl (Rallied) UI แสดง cooldown เป็นตัวเลขบนไอคอน skill และแสดง status เป็นไอคอนบน Unit แตะเพื่อดูรายละเอียดและระยะเวลาที่เหลือ

**Blocked by:** 06 — Terrain, ธาตุ, line of sight และการป้องกัน Tamer

**Status:** ready-for-agent

- [ ] skill และ status นิยามใน data ผ่าน schema
- [ ] cooldown นับตาม rules ฉบับรวม และ skill ที่ติด cooldown ไม่อยู่ในรายการ action ที่ทำได้
- [ ] status: save DC = 8 + proficiency + mod, สถานะเดียวกันไม่ซ้อน ติดซ้ำรีเซ็ตระยะเวลา, ระยะเวลานับเมื่อจบ Turn ของฝั่งที่ติด
- [ ] Bleed เสีย HP 1d4 ต้น Turn, Rallied +1 attack roll, Hit and Run ถอยฟรี 1 ช่อง, Heavy Blow 2d8
- [ ] preview ของ skill แสดง % โดนหรือ % ไม่ผ่าน save และช่วง damage
- [ ] test ผ่าน interface ของ engine ครอบคลุม tier, cooldown, กลไก status และ skill ทั้ง 4
