# 06 — Terrain, ธาตุ, line of sight และการป้องกัน Tamer

**What to build:** ตำแหน่งบน Board มีผลจริง: terrain และ element wheel ให้ advantage/disadvantage, Flying และ Aquatic ทำงานตามกติกา, line of sight บังการโจมตีระยะไกล, Tamer ได้รับการป้องกันเมื่อมี Monster ฝ่ายเดียวกันยืนติด และ Unit ใช้ Action ป้องกันได้ preview แสดงแหล่งที่มาของ advantage/disadvantage ทุกแหล่งและผลการหักล้าง

**Blocked by:** 05 — Basic Attack ครบวง

**Status:** done

- [x] element wheel: ป่า > น้ำ > ภูเขา > ทะเลทราย > ป่า, แสงกับมืดได้เปรียบกันและกัน, Tamer ไม่มีธาตุ
- [x] terrain ตรงธาตุให้ advantage, ธาตุแพ้ทางให้ disadvantage, Flying ไม่ได้รับผลจาก terrain, Aquatic นับช่องน้ำเป็นธาตุตัวเองและเดินบนน้ำ +1
- [x] advantage หลายแหล่งไม่ซ้อน และ advantage กับ disadvantage หักล้างกัน
- [x] line of sight ใช้อัลกอริทึมตาม rules ฉบับรวม Unit บนเส้นบังการโจมตีระยะ 2 ขึ้นไป ยกเว้นผู้โจมตีเป็น Flying
- [x] ศัตรูที่โจมตี Tamer ได้ disadvantage เมื่อมี Monster ฝ่ายเดียวกันยืนติด Tamer
- [x] Action ป้องกัน: Guard และ Ward +2 (Guarded) จนถึง Turn ถัดไปของตัวเอง
- [x] test ผ่าน interface ของ engine ครอบคลุมทุกข้อข้างบน
