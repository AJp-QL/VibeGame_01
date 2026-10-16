# 11 — Tamer: Command และ basic skill

**Owner:** claude (historical, mixed)

**What to build:** Tamer ใช้ Command และ basic skill ได้ครบ Command ใช้ 1 ครั้งต่อ Turn กับ Monster ในระยะ 3 (advantage, ขยับ +1 หรือผ่าน loyalty check) ไม่ใช้ Action ของ Tamer และห้ามใช้ใน Turn แรกของฝั่ง ส่วน basic skill ได้แก่ Cover, Attune, First Aid, Distract (Off-balance)

**Blocked by:** 07 — ระบบ skill และ status ด้วย Fangrel

**Status:** done

- [x] Command มีผลกับ Monster ที่เล่นหลัง Tamer ใน Turn เดียวกัน และ advantage จาก Command หักล้าง disadvantage จากการป้องกัน Tamer ไม่ได้
- [x] Cover: damage ที่พวกข้างตัวได้รับโอนมาที่ Tamer จนถึง Turn ถัดไป
- [x] Attune: เปลี่ยนธาตุช่องติดตัว 3 Turn แล้วกลับเป็นเดิม เปลี่ยนซ้ำทับได้ (อันล่าสุดชนะ) Board แสดงช่องที่ถูกเปลี่ยนและเวลาที่เหลือ
- [x] First Aid: heal 1d8 + SPI mod
- [x] Distract: save SPI, Off-balance ทำให้การโจมตีครั้งถัดไปได้ disadvantage
- [x] test ผ่าน interface ของ engine ครอบคลุม Command และ skill ทั้ง 4
