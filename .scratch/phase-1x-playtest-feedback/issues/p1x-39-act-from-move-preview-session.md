# P1X-39 — session: action ระหว่าง Move preview คิดจากช่องของเงา

**Owner:** claude

**What to build:** playtest v0.2.0 บนมือถือ (ผู้ใช้ 2026-10-26): ระหว่างมี Move preview ถ้าเลือก skill, Attack, Defend หรือแตะศัตรูที่เงาไปไม่ถึง เกมคิด action จากช่องจริงของ Unit ทำให้ดูเหมือน Unit "เดินกลับ" ตอนนี้ใน `packages/session/src/session.ts`: `chooseSkill` เก็บ `movePreviewTile` ไว้แต่เป้าคิดจากช่องจริงและ `confirmAttack` ยิงจากช่องจริง, `defend` dispatch ทันทีที่ช่องจริง, `aimTarget` ของศัตรูที่เงาไปไม่ถึงให้ plan เลือกช่องตามกฎเอง (มักเป็นช่องเดิม) ให้เปลี่ยนเป็น (spec stories 62–65, decision log 2026-10-26):

- ระหว่าง `movePreview !== null`: `chooseSkill`, Basic Attack, `defend`, `chooseCommand` และการเล็งเป้า (รวม Burst ที่จุดศูนย์กลางอยู่ในระยะของเงา) สร้าง Action plan ที่ origin = ช่องของเงา (`via` move หรือ blink) แทนการทำจากช่องจริง ยืนยันครั้งเดียว (`confirmPlan`) = Move/Blink + action; `defend` ไม่ dispatch ทันทีระหว่าง preview
- เป้าหรือ skill ที่เงาไปไม่ถึง: ไม่สร้าง plan ไม่ย้ายเงา Move preview อยู่ต่อ และ `snapshot.rejection` ให้ code ใหม่ (เช่น `out-of-reach-from-preview`) ให้ UI แสดง hint
- free skill ที่ไม่อยู่ใน plan (Camouflage): ระหว่าง preview `chooseSkill` ไม่ทำอะไร และ snapshot บอกได้ว่าปุ่มนี้ปิดเพราะ Move preview (เช่น field ของ `SkillButton`) เพื่อให้ UI แสดง hint "ยืนยันการเดินก่อน"
- ยกเลิก Move preview (แตะ Unit หรือ `cancel`) แล้วทุกอย่างกลับไปคิดจากช่องจริงเหมือนเดิม (attack ก่อนเดิน, Hit and Run)
- หลังยืนยันการเดินอย่างเดียว (`confirmMove`) Unit ยังถูกเลือกเหมือนเดิม; `attackable` / action ที่ทำได้คิดจากช่องใหม่ (มีอยู่แล้ว ยืนยันด้วย test)

เพิ่มอย่างเดียวตาม contract rule (field และ rejection code ใหม่; คำสั่งเดิมความหมายเดิมเมื่อไม่มี Move preview) ไม่มี action ใหม่ใน engine จึงไม่ขยับ ENGINE_VERSION; Replay ได้ 2 action (Move แล้ว action) เหมือน Action plan เดิม

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] ระหว่าง Move preview ทุก action ข้างบน (Move และ Blink, Hotseat ทั้งสองฝั่ง, vs AI) สร้าง plan จากช่องของเงา; ยืนยันแล้ว state เท่ากับการเดินไปช่องเงาแล้วทำ action จริง (test เทียบ)
- [ ] เป้าที่เงาไปไม่ถึง: rejection code ใหม่ เงาไม่ย้าย plan ไม่เกิด; test
- [ ] Camouflage ปิดระหว่าง preview พร้อมข้อมูลเหตุผลใน snapshot; test
- [ ] ไม่มี Move preview: พฤติกรรมเดิมทุกคำสั่ง (test เดิมผ่าน); ยกเลิก preview แล้วกลับเป็นแบบเดิม
- [ ] README ของ session อัปเดต; typecheck, test, build, path check, `check-replays` ผ่าน; ENGINE_VERSION ไม่เปลี่ยน; ใช้ subagent `contract-guard` และ `determinism-reviewer` ก่อน PR
