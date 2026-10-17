# 14 — UI: ขนาด Board ต่อ Board ใน battle และ web

**Owner:** codex

**What to build:** ขั้น migrate ของ expand–contract: Phaser Board (ขนาดภาพ, เส้นตาราง, การแปลงตำแหน่งแตะเป็นช่อง, ป้ายช่อง), การจัดขนาด Board ให้พอดีจอ และ mini Board ในเมนู อ่านขนาดจาก Battle/Board แทนค่าคงที่ 7 ผู้เล่นไม่เห็นความต่างบน Board 7x7 ทุกอัน ถ้า ticket 13 ทำให้ dataHash เปลี่ยน ให้ refresh visual fixtures ด้วย

**Blocked by:** 13 — ขนาด Board ต่อ Board: expand และย้าย engine, AI, simulator

**Status:** ready-for-agent

- [ ] battle และ web ไม่ใช้ค่าคงที่ขนาด Board อีก
- [ ] screenshot ของ Board 7x7 ทุกภาพเหมือนเดิม (หรือ refresh เพราะ dataHash เท่านั้น ภาพไม่เปลี่ยน)
- [ ] test ด้วย Board ทดสอบขนาดอื่นแสดงได้และแตะได้ถูกช่อง (unit test ของการแปลงตำแหน่ง)
- [ ] CI เขียวทั้งสาม job
