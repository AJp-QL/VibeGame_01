# 12 — Inspiration และ turn limit

**Owner:** claude (historical, mixed)

**What to build:** แต่ละฝั่งใช้ Inspiration ทอย d20 ของฝั่งตัวเองใหม่ได้ 1 ครั้งต่อ Battle และเมื่อครบ 10 Round ฝั่งที่ทำ damage รวมมากกว่าชนะ (heal ไม่หักลบ เท่ากันเสมอ) HUD แสดง Round ปัจจุบันและ damage รวมของแต่ละฝั่งตลอด Battle

**Blocked by:** 05 — Basic Attack ครบวง

**Status:** done

- [x] Inspiration ใช้ได้เฉพาะ d20 ตามที่ rules ฉบับรวมกำหนด UI เสนอให้ใช้หลังเห็นผลทอยที่ใช้ได้
- [x] ครบ 10 Round ตัดสินด้วย damage รวม และหน้าสรุปบอกสาเหตุ
- [x] test ผ่าน interface ของ engine ครอบคลุม Inspiration และทั้งสามผลของ turn limit (ชนะ, แพ้, เสมอ)
