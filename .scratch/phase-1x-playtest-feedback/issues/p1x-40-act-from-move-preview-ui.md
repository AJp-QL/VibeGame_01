# P1X-40 — UI: action จาก Move preview, bottom sheet และ "actions from here" หลังเดิน

**Owner:** codex

**What to build:** หลัง P1X-39 (spec stories 66–70, decision log 2026-10-26, เล่นบนมือถือก่อน):

- ระหว่าง Move preview บน Board มีเครื่องหมายดาบเฉพาะศัตรูที่เงาไปถึง (`movePreview.reach` targets) ตัวอื่นจาง ตัวที่ line of sight บังมีกากบาท; แตะศัตรูที่มีดาบ = plan จากช่องเงา
- เป้าที่เงาไปไม่ถึง: แสดง hint จาก `snapshot.previewRefusal === 'out-of-reach-from-preview'` ของ P1X-39 (field ใหม่ ไม่ใช่ `snapshot.rejection`) ("จากช่องนี้ X อยู่นอกระยะ เลือกช่องอื่น")
- Camouflage และ free skill ที่ session บอกว่าปิดระหว่าง preview (`SkillButton.fromMovePreview === 'move-first'`; `'out-of-reach'` = เงาใช้ไม่ถึง): ปุ่มปิดพร้อม hint "ยืนยันการเดินก่อน แล้วค่อยใช้ Camouflage บนช่องป่า"
- มือถือ (360/375 px): แผง Move preview และการ์ด Action plan เป็น bottom sheet ทับส่วนล่างของ Board ไม่ต้องเลื่อนหน้า ไม่บังช่องเงาและเป้า; desktop คงตำแหน่งเดิมได้
- หลังกด "เดิน" (เดินอย่างเดียว) sheet เปลี่ยนเป็น "action ที่ทำได้จากตรงนี้": ปุ่มโจมตีต่อศัตรูในระยะ (พร้อมโอกาสโดน), Defend, skill ช่วย และปุ่ม "เสร็จ"; ศัตรูในระยะมีดาบบน Board แตะแล้วได้การ์ด plan; ถ้าไม่มี action อื่น ยังแสดง Defend และ "เสร็จ"
- "เสร็จ" = UI อย่างเดียว: เลิกเลือก Unit ปิด sheet (activation จบเมื่อเริ่ม Unit อื่นพร้อม dialog ของ ticket 02 หรือจบ Turn เหมือนเดิม)
- ทุก action ยืนยันครั้งเดียว แตะบน Board ไม่ commit อะไร (story 61)

ข้อความทั้งหมดใน `strings.ts`; ไม่คิดกติกาเอง ใช้ข้อมูลจาก session

**Blocked by:** P1X-39 — session: action ระหว่าง Move preview คิดจากช่องของเงา

**Status:** ready-for-agent

- [x] ดาบ/จาง/กากบาทระหว่าง preview ตาม `movePreview.reach`; แตะศัตรูที่มีดาบได้การ์ด plan จากช่องเงา
- [x] hint ของเป้านอกระยะและของ Camouflage ที่ปิด มี text test
- [x] bottom sheet บนมือถือ ไม่มี horizontal scroll ไม่ต้องเลื่อนหาปุ่ม; "actions from here" หลังเดิน + ปุ่ม "เสร็จ"
- [ ] screenshot ที่ 360/375 px และ desktop ของ preview, การ์ด plan และ sheet หลังเดิน; update baseline และตรวจทุกภาพ; CI เขียวทั้งสาม job

## Implementation / validation

- Uses P1X-39 shadow reach, preview refusal and skill availability; no session/engine changes.
- Phone sheets keep the full Board and confirmation footer visible. Preview details scroll inside the sheet; attack odds precede plan choices.
- Undo, Battle menu and Threat zone controls move into the sheet while it is open.
- A move-only confirm offers attacks with session-provided odds, Defend, skills and UI-only Done. A free Command preserves the continuation while the session reports an Action left.
- [Desktop, 360 px and 375 px captures](../evidence/p1x-40/README.md). Linux pinned Chromium 151.0.7922.34; every baseline inspected, including all 20 new/updated images.
- Final CI checkbox remains open until all three PR jobs pass.
