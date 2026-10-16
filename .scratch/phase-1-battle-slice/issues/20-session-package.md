# 20 — แยก package session (interaction model แบบไม่มี UI)

**Owner:** claude

**What to build:** ย้าย interaction model ของ Battle ออกจาก web เป็น package ใหม่ `packages/session` (`@mt/session`) ตาม ADR 0004: การเลือก Unit, การเล็ง, action ที่ทำได้, การสั่ง AI ทีละขั้น, model การเล่น Replay ซ้ำ, import/export ไฟล์ Replay, battleChoice และ playStats พร้อมย้าย port type (`BattleSessionPort`, `BattleSnapshot`, `BoardInput`) ออกจาก battle มาไว้ที่ session ทิศ dependency เป็น `shared ← engine ← ai / session ← battle / web` ข้อความที่ผู้เล่นเห็นทั้งหมด (strings, skillText, describeAction) อยู่ใน web พฤติกรรมเกมไม่เปลี่ยน

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `packages/session` ไม่มีข้อความที่ผู้เล่นเห็น ไม่ import battle หรือ web และไม่แตะ DOM/เวลาจริง (มี boundary test แบบเดียวกับ engine)
- [ ] battle และ web import port type และ session จาก `@mt/session`; battle ไม่ import web; web ไม่ import engine/ai ตรงยกเว้น type ที่ session re-export (ถ้ามีข้อยกเว้นให้ระบุเหตุผล)
- [ ] test ของ session ย้ายไปอยู่ใน `packages/session/test` และผ่านครบ จำนวน test รวมไม่ลดลง (719 + 1 skipped)
- [ ] ENGINE_VERSION ไม่เปลี่ยน, data hash ไม่เปลี่ยน, Replay เดิมเปิดได้
- [ ] build และเกมที่ deploy ทำงานเหมือนเดิม
