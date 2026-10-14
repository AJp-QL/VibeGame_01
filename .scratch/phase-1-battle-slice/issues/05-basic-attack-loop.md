# 05 — Basic Attack ครบวง

**What to build:** Unit โจมตีปกติได้ครบวง: เลือกเป้าในระยะ → เห็น preview % โอกาสโดน + ช่วง damage + โอกาส critical → ยืนยัน → ทอย → log + animation → HP ลด → Unit ล้ม → Battle จบเมื่อ Tamer ฝั่งใดล้มหรือ Monster ฝั่งหนึ่งหมด → หน้าสรุปผลและเริ่มใหม่ ค่าที่ได้จากสูตรของทุก Unit คำนวณจาก data แบบ Monster จริง

**Blocked by:** 03 — Walking skeleton

**Status:** ready-for-agent

- [ ] HP, Guard, Ward, proficiency, attack bonus และ damage หลักของทุก Unit ใน Scenario 1 ตรงกับตาราง stat block ใน Prototype kit (ระยะเดิน Tidewall ใช้สูตรล้วน) ใช้จำนวนเต็มล้วน
- [ ] attack roll d20 + SEN mod + proficiency เทียบ Guard, damage กายภาพ + POW mod ที่ระยะ 1 และ SEN mod ที่ระยะ 2 ขึ้นไป, Monster 1d8 และ Tamer 1d6
- [ ] ทอย 20 เป็น critical (ทอย dice damage 2 เท่า), ทอย 1 พลาดเสมอ
- [ ] preview ไม่เปลี่ยน state ไม่กินลูกเต๋า และ % ตรงกับความน่าจะเป็นจริง
- [ ] log แสดงทุก action และผลทอย สร้างจากรายการเหตุการณ์
- [ ] เงื่อนไขชนะทั้งสองแบบทำงาน หน้าสรุปแสดงผู้ชนะ สาเหตุ จำนวน Round และเริ่ม Battle ใหม่ได้
- [ ] test ผ่าน interface ของ engine ใช้ลำดับผลทอยที่กำหนดเอง
