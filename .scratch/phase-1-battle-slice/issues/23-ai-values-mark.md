# 23 — AI ในเกมให้คุณค่า Mark ข้าม Turn และ skill ที่ไม่ถูกใช้

**Owner:** claude

**What to build:** AI โปรไฟล์ในเกม (GAME_PROFILES) ให้คุณค่ากับ advantage ของ Marked ใน Turn ถัดไปของฝั่งตัวเอง (ticket 18) และพิจารณา Hex, Pin, Camouflage, Blink ให้ถูกใช้เมื่อคุ้ม โดยโปรไฟล์ sim-parity (SIM_PROFILES) ไม่เปลี่ยน

**Blocked by:** 22 — เอกสารและ tracker สำหรับหลาย agent

**Status:** done

- [x] (ยอมรับบางส่วน 2026-10-16: Mark, Pin ผ่าน; Hex, Camouflage ผ่านชุดเดียว ย้ายไปวัดใน ticket 19) simulator แสดงว่า Mark, Hex, Pin, Camouflage ถูกใช้มากกว่า 0.1 ครั้งต่อ Battle ในอย่างน้อย 2 ชุด
- [x] SIM_PROFILES และ parity test เดิมผ่านเหมือนเดิม
- [x] AI ยัง deterministic และไม่ช้ากว่าเดิมเกิน 2 เท่าต่อ Battle

**หมายเหตุ (2026-10-16, branch claude/23-ai-values-mark):** ทำแล้วใน packages/ai (heuristic `lookahead`) ผลอยู่ที่ docs/balance/ticket-23-ai-skills.md Mark (S1 ทั้งสอง Board) และ Pin (ทุกชุด) เกิน 0.1 ต่อ Battle แต่ Hex เกินแค่ S1 Shallows (0.15) และ Camouflage เกินแค่ S1 Crossroads (0.38) เพราะ Element Bolt/Burst และ Long Shot คุ้มกว่าในค่าคาดหมายส่วนใหญ่ และ Camouflage ต้องยืนบนป่าซึ่ง Quillfox (Water) เสีย advantage จึงยังไม่ปิด ticket ทางเลือก: ยอมรับเกณฑ์ที่ต่ำลงสำหรับ Hex/Camouflage หรือแก้ตัวเลขใน ticket 19 แล้ววัดใหม่ Blink ยังไม่ถูกใช้ (Wispling บินได้และเดินได้ไกลกว่า Blink, มีประโยชน์เฉพาะตอนติด Pin) และยังไม่มี test สถานการณ์ที่สร้างเองสำหรับ Hex/Pin/Camouflage/Blink เดี่ยวๆ (ค้นตำแหน่งสุ่ม 4,000 แบบใน Turn แรกแล้วไม่พบ)
