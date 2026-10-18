# 09 — ใช้ชุดแก้ระยะ skill ที่ผู้ใช้เลือก

**Owner:** claude

**What to build:** เกมจริงใช้ชุดแก้ระยะที่ผู้ใช้เลือกจากรายงานของ ticket 08: ตัวเลขใน data และ/หรือกติกาใหม่ (disadvantage ระยะไกล, terrain บัง line of sight) ตำแหน่งจึงมีผลต่อการเล่น และ balance ยังอยู่ในเป้า (spec: Range experiments, user stories 38, 41–43)

**Blocked by:** 08 — ทดลองระยะ skill ใน simulator และการเลือกชุดของผู้ใช้ (บันทึกใน decision log) (2026-10-18: ไม่รอ ticket 20 แล้ว; 20 เป็นรอบปรับต่อบนชุดนี้)

**Status:** ready-for-agent

- [ ] data และ/หรือกติกาตามชุดที่ผู้ใช้เลือก; กติกาใหม่มี D-row ใน rules §23, ตาราง kit §20 และ test ตรงกัน, ทุกการเปลี่ยนมีแถว decision log พร้อมผล simulator
- [ ] ENGINE_VERSION ขยับถ้ากติกาเปลี่ยน; กติกาใหม่อยู่นอก sim-equivalent layer (แบบ ticket 27) ทำให้ sim-v4 parity ผ่าน
- [ ] ≥ 2,000 Battle ต่อชุด: ทีม A ชนะ 40–60%, turn limit ≤ 15%, Turn ก่อนการโจมตีครั้งแรกสูงกว่า baseline ทุกชุด; รายงานและ docs/balance/phase-1-baseline.md อัปเดต
- [ ] AI ในเกมใช้กติกาใหม่ได้ (เช่นเลี่ยงยิงจากระยะที่เสีย advantage) และยัง deterministic
- [ ] ticket 10 (Codex) ระบุว่าต้อง refresh visual fixtures
