# 20 — แยก package session (interaction model แบบไม่มี UI)

**Owner:** claude

**What to build:** ย้าย interaction model ของ Battle ออกจาก web เป็น package ใหม่ `packages/session` (`@mt/session`) ตาม ADR 0004: การเลือก Unit, การเล็ง, action ที่ทำได้, การสั่ง AI ทีละขั้น, model การเล่น Replay ซ้ำ, import/export ไฟล์ Replay, battleChoice และ playStats พร้อมย้าย port type (`BattleSessionPort`, `BattleSnapshot`, `BoardInput`) ออกจาก battle มาไว้ที่ session ทิศ dependency เป็น `shared ← engine ← ai / session ← battle / web` ข้อความที่ผู้เล่นเห็นทั้งหมด (strings, skillText, describeAction) อยู่ใน web พฤติกรรมเกมไม่เปลี่ยน

**Blocked by:** None — can start immediately

**Status:** done

- [x] `packages/session` ไม่มีข้อความที่ผู้เล่นเห็น ไม่ import battle หรือ web และไม่แตะ DOM/เวลาจริง (มี boundary test แบบเดียวกับ engine)
- [x] battle และ web import port type และ session จาก `@mt/session`; battle ไม่ import web; web ไม่ import engine/ai ตรงยกเว้น type ที่ session re-export (ถ้ามีข้อยกเว้นให้ระบุเหตุผล)
- [x] test ของ session ย้ายไปอยู่ใน `packages/session/test` และผ่านครบ จำนวน test รวมไม่ลดลง (719 + 1 skipped)
- [x] ENGINE_VERSION ไม่เปลี่ยน, data hash ไม่เปลี่ยน, Replay เดิมเปิดได้
- [x] build และเกมที่ deploy ทำงานเหมือนเดิม (build ผ่าน และ smoke test ของ web ผ่าน; ยังไม่ได้ deploy และยังไม่ได้เปิดเล่นในเบราว์เซอร์)

## ผลลัพธ์ (2026-10-16)

- `packages/session` (`@mt/session`): session.ts, battleChoice.ts, playStats.ts, model ของ Replay (`battleReplay`, `replayFileName`, `openReplay`, `createReplayPlayer`) และ port type (ย้ายจาก battle) `src/index.ts` re-export ชื่อจาก engine/ai ที่ battle และ web ใช้ ทั้งสองจึงไม่ import `@mt/engine` / `@mt/ai` ตรง
- อยู่ใน web ต่อ: `describeAction` และการดาวน์โหลดไฟล์ (`src/replay.ts`), การเข้าถึง `localStorage` (`src/storage.ts`), delay ของ AI (`App.tsx`), strings/skillText; `BoardLabels` อยู่ใน battle (`src/labels.ts`)
- กลับทิศ: `createPlayStats(storage, now)` ต้องส่งนาฬิกาเข้ามา (web ส่ง `() => new Date()`); โค้ดที่ย้ายไม่มีส่วนอื่นที่สร้างข้อความ
- ข้อยกเว้น: ไม่มีใน dependency ของ package; ใน session `Date` ใช้เป็น type เท่านั้น (นาฬิกาที่ส่งเข้ามา) boundary test ห้าม `new Date` / `Date.now`
- test: 719 + 1 skipped → 727 + 1 skipped (boundary test 4 ข้อ; ส่วนที่ตรวจข้อความแยกออกจาก test ของ session ไปที่ `packages/web/test/sessionText.test.ts` 4 ข้อ)
