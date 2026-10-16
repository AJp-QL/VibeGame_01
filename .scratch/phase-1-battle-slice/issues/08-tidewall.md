# 08 — Tidewall

**Owner:** claude (historical, mixed)

**What to build:** Tidewall ใช้ loadout ได้ครบ: Taunt (Taunted), Shield Bash (2d6 + ผลัก 1 ช่อง), Counter (Countering), Pincer Guard (Passive: Counter โจมตีกลับ 2d8)

**Blocked by:** 07 — ระบบ skill และ status ด้วย Fangrel

**Status:** done

- [x] Taunted บังคับให้เป้าโจมตีผู้ taunt ถ้าอยู่ในระยะ
- [x] Shield Bash ผลักตาม ruling: ผลักแนวทแยงได้, Counter ที่ถูก trigger resolve ก่อนผลัก, Unit ที่ติด Pin ยังถูกผลักได้, กรณีช่องปลายทางไม่ว่างหรืออยู่นอก Board ทำตาม rules ฉบับรวม
- [x] Countering โจมตีกลับ 1 ครั้งเมื่อโดนโจมตีจากระยะ 1 (1d8 หรือ 2d8 เมื่อมี Pincer Guard)
- [x] Passive ไม่ใช้ Action และไม่มี cooldown
- [x] log และ animation แสดงการผลักและการโจมตีกลับ
- [x] test ผ่าน interface ของ engine ครอบคลุม skill ทั้ง 4 และ ruling การผลัก
