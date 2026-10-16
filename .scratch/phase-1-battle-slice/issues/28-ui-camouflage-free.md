# 28 — UI: บอกผู้เล่นว่า Camouflage ไม่กิน Action

**Owner:** codex

**What to build:** ตั้งแต่ ticket 27 (rules §15.1, §17.4, D-28) Camouflage เป็น skill ฟรี ไม่ใช้ Action และไม่ใช้ Move ใช้ได้ 1 ครั้งต่อ activation ณ จุดใดก็ได้ ขณะ Quillfox ยืนบนป่า ลำดับที่คุ้มคือยิง (Long Shot, Pin, Mark) ก่อนแล้วค่อยซ่อน เพราะ attack roll ทำให้ Hidden หลุด

ตอนนี้ UI ใช้งานได้แล้วโดยไม่ต้องแก้ (ปุ่ม skill ใช้ `SkillButton.usable` จาก legal actions และ session เลือก Quillfox ค้างไว้หลัง Action ถ้ายัง Camouflage ได้) แต่ข้อความยังบอกผู้เล่นผิดหรือไม่ครบ:

1. Hint ใน TurnPanel: Quillfox ที่เดินและใช้ Action แล้วแต่ยัง Camouflage ได้ ตอนนี้ขึ้น "Unit นี้เดินและใช้ Action ไปแล้วใน Turn นี้" (`hintNothingLeft`) ทั้งที่ยังกด Camouflage ได้ ควรบอกว่ายังซ่อนตัวได้ (เช่น "ยังใช้ Camouflage ได้ (ไม่ใช้ Action)") เมื่อมีปุ่ม skill ที่ `free === true` และ `usable === true`
2. คำอธิบาย skill (skillText / SkillButtons): Camouflage บอกว่า "ไม่ใช้ Action และไม่ใช้การเดิน, 1 ครั้งต่อ activation" อ่านจาก `button.free === true` (หรือ `data.skills[id].effects.free === true`) แบบเดียวกับที่ Blink อ่าน `effects.replacesMove`
3. ปุ่ม Camouflage ที่ใช้ไปแล้วใน activation นี้ถูก disable โดยไม่มีเหตุผล (cooldown 0) ให้แสดงเหตุผล "ใช้แล้วใน activation นี้" เมื่อ `button.usedThisActivation === true`
4. Preview ของ Camouflage (type `effect`) และบรรทัดใน log: ต่อท้าย "(ไม่ใช้ Action)" แบบ Command

**Session API (มีแล้ว ไม่ต้องขอเพิ่ม):** `SessionSnapshot.skills: SkillButton[]` มีฟิลด์ใหม่แบบ optional `free?: true` และ `usedThisActivation?: boolean` (เฉพาะ skill ฟรี); `GameData.skills[id].effects.free`; `selectedUnit` ค้างที่ Quillfox หลัง Action ถ้ายัง Camouflage ได้; `canAct` นับ Quillfox ที่ยัง Camouflage ได้ด้วย

**Blocked by:** 27 — กติกา: Camouflage ไม่กิน Action

**Status:** ready-for-agent

- [ ] Hint ไม่บอกว่า "ไม่มีอะไรเหลือ" เมื่อยัง Camouflage ได้
- [ ] คำอธิบาย skill ของ Camouflage บอกว่าไม่ใช้ Action / Move และใช้ได้ 1 ครั้งต่อ activation
- [ ] ปุ่ม Camouflage ที่ใช้แล้วใน activation นี้แสดงเหตุผล
- [ ] Preview และ log ของ Camouflage บอกว่าไม่ใช้ Action
- [ ] ข้อความทั้งหมดอยู่ใน packages/web (strings.ts) มี test ข้อความ
