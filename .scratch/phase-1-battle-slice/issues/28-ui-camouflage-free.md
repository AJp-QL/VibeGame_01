# 28 — UI: บอกผู้เล่นว่า Camouflage ไม่กิน Action

**Owner:** codex

**What to build:** ตั้งแต่ ticket 27 (rules §15.1, §17.4, D-28) Camouflage เป็น skill ฟรี ไม่ใช้ Action และไม่ใช้ Move ใช้ได้ 1 ครั้งต่อ activation ณ จุดใดก็ได้ ขณะ Quillfox ยืนบนป่า ลำดับที่คุ้มคือยิง (Long Shot, Pin, Mark) ก่อนแล้วค่อยซ่อน เพราะ attack roll ทำให้ Hidden หลุด

ตอนนี้ UI ใช้งานได้แล้วโดยไม่ต้องแก้ (ปุ่ม skill ใช้ `SkillButton.usable` จาก legal actions และ session เลือก Quillfox ค้างไว้หลัง Action ถ้ายัง Camouflage ได้) แต่ข้อความยังบอกผู้เล่นผิดหรือไม่ครบ:

1. Hint ใน TurnPanel: Quillfox ที่เดินและใช้ Action แล้วแต่ยัง Camouflage ได้ ตอนนี้ขึ้น "Unit นี้เดินและใช้ Action ไปแล้วใน Turn นี้" (`hintNothingLeft`) ทั้งที่ยังกด Camouflage ได้ ควรบอกว่ายังซ่อนตัวได้ (เช่น "ยังใช้ Camouflage ได้ (ไม่ใช้ Action)") เมื่อมีปุ่ม skill ที่ `free === true` และ `usable === true`
2. คำอธิบาย skill (skillText / SkillButtons): Camouflage บอกว่า "ไม่ใช้ Action และไม่ใช้การเดิน, 1 ครั้งต่อ activation" อ่านจาก `button.free === true` (หรือ `data.skills[id].effects.free === true`) แบบเดียวกับที่ Blink อ่าน `effects.replacesMove`
3. ปุ่ม Camouflage ที่ใช้ไปแล้วใน activation นี้ถูก disable โดยไม่มีเหตุผล (cooldown 0) ให้แสดงเหตุผล "ใช้แล้วใน activation นี้" เมื่อ `button.usedThisActivation === true`
4. Preview ของ Camouflage (type `effect`) และบรรทัดใน log: ต่อท้าย "(ไม่ใช้ Action)" แบบ Command
5. Visual regression (ticket 25): fixture Replay ใน packages/web/visual/fixtures/*.json บันทึกด้วย `engineVersion` 0.8.0 และ data hash เดิม ticket 27 เปลี่ยน engine เป็น 0.9.0 และ data (camouflage.json, scenario_2.json) จึง `openReplay` จะปฏิเสธ fixture ทุกไฟล์ก่อน capture ต้องบันทึก fixture ใหม่ด้วย engine 0.9.0 (action เดิมน่าจะยังใช้ได้; fixture `hidden` ที่ใช้ Camouflage ตอนนี้ไม่กิน Action) แล้วตรวจว่า baseline PNG ไม่เปลี่ยน

**Session API (มีแล้ว ไม่ต้องขอเพิ่ม):** `SessionSnapshot.skills: SkillButton[]` มีฟิลด์ใหม่แบบ optional `free?: true` และ `usedThisActivation?: boolean` (เฉพาะ skill ฟรี); `GameData.skills[id].effects.free`; `selectedUnit` ค้างที่ Quillfox หลัง Action ถ้ายัง Camouflage ได้; `canAct` นับ Quillfox ที่ยัง Camouflage ได้ด้วย

**Blocked by:** 27 — กติกา: Camouflage ไม่กิน Action

**Status:** done

- [x] Hint ไม่บอกว่า "ไม่มีอะไรเหลือ" เมื่อยัง Camouflage ได้
- [x] คำอธิบาย skill ของ Camouflage บอกว่าไม่ใช้ Action / Move และใช้ได้ 1 ครั้งต่อ activation
- [x] ปุ่ม Camouflage ที่ใช้แล้วใน activation นี้แสดงเหตุผล
- [x] Preview และ log ของ Camouflage บอกว่าไม่ใช้ Action
- [x] ข้อความทั้งหมดอยู่ใน packages/web (strings.ts) มี test ข้อความ
- [x] fixture visual regression บันทึกใหม่ด้วย engine 0.9.0 และ data ปัจจุบัน และ visual test ผ่าน

## Comments

- Completed the free-skill hint, description, used-this-activation reason, effect preview and event log text using the existing session/data contract. All new player-facing text is in `packages/web/src/strings.ts`; rules and session code are unchanged.
- Regenerated all 16 fixtures for engine 0.9.0/current data; actions, placements and Dice Seeds stayed identical. Inspected all 19 captures. Sixteen baselines are unchanged; push-slide, push-landed and pin were refreshed for the already-merged balance changes (HP bars; push damage 12 → 16), with before/after evidence.
- Checks passed: frozen install, typecheck, 756 tests (1 skipped), build, path ownership check, fixture generation, 19 baseline captures, and 57/57 visual comparisons (`--repeat-each=3`) on pinned Linux Chromium 151.0.7922.34. Desktop/360 px captures have no browser errors or horizontal overflow.
- [Screenshots and baseline review](../evidence/28-ui-camouflage-free/README.md).
