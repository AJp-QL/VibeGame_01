# 27 — กติกา: Camouflage ไม่กิน Action (skill ฟรี 1 ครั้งต่อ activation)

**Owner:** claude

**What to build:** Quillfox ซ่อนตัวได้โดยไม่เสีย Action: ยืนบนช่องป่าแล้วใช้ Camouflage ได้ 1 ครั้งต่อ activation ณ จุดใดก็ได้ (ก่อนหรือหลัง Move, ก่อนหรือหลัง Action) จึงยิง Long Shot, Pin หรือ Mark แล้วซ่อนใน activation เดียวกันได้ กติกาอื่นของ Camouflage และ Hidden คงเดิม (ใช้ได้เฉพาะบนป่า, Hidden หลุดเมื่อทอย attack roll หรืออยู่นอกป่า, ตรวจตอนจบ Turn) ตัดสินโดยผู้ใช้ 2026-10-16 (ทางเลือก A ใน docs/balance/ticket-19-team-balance.md) เพื่อให้ Camouflage ถูกใช้จริง (ticket 19 ข้อ 3)

**Blocked by:** None

**Status:** ready-for-agent

- [ ] rules.md §15.1 (Camouflage), §17.4 และตาราง skill เขียนกติกาใหม่ มีแถว D-28 ใน §23 และแถวใน decision log
- [ ] engine: Camouflage ไม่ใช้ Action และ Move, 1 ครั้งต่อ activation, เริ่ม activation ได้, ผ่าน legalActions / applyAction / previewAction; contract เพิ่มอย่างเดียว; ENGINE_VERSION 0.8.0 → 0.9.0 ใน commit เดียวกัน
- [ ] session: หลัง Camouflage Unit ยังถูกเลือกอยู่ถ้ายังทำอย่างอื่นได้ และหลัง Action ยังกด Camouflage ได้ มี test
- [ ] AI โปรไฟล์ในเกม (GAME_PROFILES) พิจารณา "ทำ Action แล้วซ่อน" SIM_PROFILES ไม่เปลี่ยน และการเทียบผลกับ sim v4 ยังผ่าน
- [ ] simulator 2,000 Battle ต่อชุด ทั้ง 4 ชุด (game:greedy ทั้งสองฝั่ง): A ชนะ 40–60%, turn limit ≤ 15%, รายงาน Hex และ Camouflage ต่อ Battle ใน docs/balance/ticket-27-camouflage.md และอัปเดต docs/balance/phase-1-baseline.md
- [ ] ถ้า UI ต้องเปลี่ยน เปิด ticket 28 (Owner: codex, Blocked by: 27)
