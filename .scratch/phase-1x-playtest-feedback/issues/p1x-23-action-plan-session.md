# P1X-23 — Action plan ใน session: เลือกเป้าก่อน แล้วเกมเลือกช่องที่จะยืนโจมตี

**Owner:** claude

**What to build:** การเดินแล้วโจมตีลดจาก 6 แตะเหลือ 3 (เลือกเป้าก่อน) หรือ 4 (เลือกช่องก่อน) ตามผลวิจัย docs/research/tactics-input-ux.md และการตัดสิน 2026-10-18 (U1–U5): เมื่อเลือก Unit แล้ว snapshot บอกศัตรูที่ Unit โจมตีได้ใน activation นี้ (จากช่องเดิมหรือหลัง Move/Blink ที่ถูกกติกา) และช่องที่ยืนโจมตีแต่ละตัวได้ เมื่อผู้เล่นเลือกศัตรูตัวนั้น session สร้าง Action plan: ช่องที่จะยืนโจมตี (ช่องเดิมถ้าอยู่ในระยะ ไม่เช่นนั้นช่องที่ก้าวน้อยสุด แล้วตามลำดับช่อง; ticket 11 จะเพิ่ม Threat zone เป็นตัวตัดสินลำดับที่ 2), skill และ preview การโจมตี (โอกาสโดน, damage) ผู้เล่นเปลี่ยนช่องหรือ skill ได้ก่อนยืนยัน และจาก Move preview ผู้เล่นเลือกศัตรูในรายการเพื่อโจมตีจากช่องเงาได้ ยืนยันครั้งเดียวแล้ว session ส่ง action Move (หรือ Blink) เดิมตามด้วย action Action เดิม ไม่มี action ใหม่ใน engine ทุกอย่างเพิ่มเข้า API แบบเพิ่มเท่านั้น (spec: Action plan, user stories 55–61)

**Blocked by:** P1X-18 — Move preview ใน session: แตะ Unit ยกเลิกแค่ preview และ movePreview ใน BattleSnapshot (ไฟล์ session เดียวกัน)

**Status:** ready-for-agent

- [ ] snapshot บอกศัตรูที่ Unit ที่เลือกโจมตีได้ใน activation นี้ และช่องที่ยืนโจมตีแต่ละตัวได้ ตรงกับ legal actions ที่จะมีจริงหลังเดิน (test เทียบกับการเล่นจริงหลายตำแหน่ง รวม line of sight, Taunted, Pin, Blink, Burst)
- [ ] คำสั่งเลือกเป้า, เปลี่ยนช่องที่ยืนโจมตี, เปลี่ยน skill/Action และยืนยัน plan; ช่องที่ session เลือกตามกฎ: ช่องเดิมถ้าอยู่ในระยะ (โจมตีก่อนเดินและ Hit and Run ยังใช้ได้) → ก้าวน้อยสุด → ลำดับช่อง
- [ ] รายการรวม Action ที่ไม่ใช่การโจมตีที่ทำได้จากช่องนั้นด้วย (เช่น Defend, skill ช่วยพวกเดียวกัน)
- [ ] ยืนยันแล้วได้ state เท่ากับการเล่น Move แล้ว Action ทีละขั้นทุกฟิลด์; ผ่าน guard เปลี่ยน Unit ของ ticket 02 (ถ้าการยืนยันจะจบ activation ของ Unit อื่นที่ยังมี Action)
- [ ] view ได้ events ของทั้ง Move และ Action (ตอนนี้ snapshot มีแค่ events ของ action ล่าสุด Unit จะกระโดดแทนการเดิน) โดยเพิ่มแบบเพิ่มเท่านั้น
- [ ] Undo หลังยืนยัน plan ทำงานตามกฎจุดปลอดภัยเดิม (ย้อนได้ถึงหลังการทอยล่าสุด)
- [ ] ENGINE_VERSION ไม่เปลี่ยน (ไม่มี action ใหม่); package README ของ session อธิบาย API ใหม่
