# data/skills/

นิยาม skill ของมอนสเตอร์และ Tamer หนึ่งไฟล์ต่อหนึ่ง skill

## เก็บอะไร
- ระยะ, พื้นที่, เต๋าความเสียหาย, stat ที่ใช้, status ที่ติด, cooldown

## อ้างอิง PRD
- F3 Tactical grid battle, F5 Tamer (4 class), F7 Monster design (skills)

## แนวทาง/กฎการตั้งชื่อ
- <skill_id>.json หรือ .yaml เช่น shield_bash
- tier: Minor / Major (cooldown 2) / Signature
- ตัวอย่างกติกาที่ล็อกแล้ว: Shield Bash 2d6, Burst สูงสุด 2 เป้า, ranged physical ใช้ SEN

## สถานะ
- มี `basic_attack.json` (Basic Attack: Monster 1d8, Tamer 1d6 ตาม rules §15.1) ตรวจด้วย `SkillSchema` ใน packages/shared
- schema ตอนนี้รองรับเฉพาะ skill ที่ทอยโจมตีเป้าเดียวและทำ damage skill แบบอื่นตามมากับ skill framework (ticket 07)
