# 04 — Deployment, initiative และโครงสร้าง Turn

**What to build:** Battle เริ่มด้วย deployment แบบ Hotseat: แต่ละฝั่งวาง Tamer และ Monster 2 ตัวในโซน 2 แถวหลังโดยอีกฝั่งไม่เห็น แล้วเปิดเผยพร้อมกัน ทอย initiative แล้วสลับ Turn กันตามกติกา

**Blocked by:** 03 — Walking skeleton

**Status:** done

- [x] วางได้เฉพาะโซนเริ่มของฝั่งตัวเอง และ Board แสดง terrain ทั้งหมดก่อนวาง
- [x] Hotseat: หน้าจอซ่อนการวางของฝั่งแรกก่อนส่งเครื่องให้อีกฝั่ง แล้วเปิดเผยพร้อมกัน
- [x] initiative = d20 + AGI mod สูงสุดในทีม แสดงผลทอยและฝั่งที่เริ่มก่อน
- [x] Turn แรกของฝั่งที่เริ่มก่อนเล่นได้ 2 จาก 3 Unit และ UI บอกชัด
- [x] ผู้เล่นเลือกลำดับ Unit เองได้ แต่ละ Unit ได้ Move + Action อย่างละครั้ง จบ Turn ได้เอง และมีคำเตือนถ้ายังมี Unit ที่ไม่ได้ทำอะไร
- [x] test ผ่าน interface ของ engine ครอบคลุมโซนวาง, initiative, 2 จาก 3 Unit และการสลับ Turn/Round
