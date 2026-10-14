# docs/playtest/

บันทึก playtest ของ paper prototype (เฟส 0) ที่ทอยเต๋าจริงทุกครั้ง

## เก็บอะไร
- game1.md : เกม 1, Scenario 1 (Tamer Lv1, มอนสเตอร์ 1 ดาว)
- game2.md : เกม 2, Scenario 2 (Tamer Lv6, มอนสเตอร์ 4 ดาว) ใช้ HP variant "+3 x stars"
- rolls.log : log การทอยเต๋าทุกครั้งของทั้งสองเกม เพื่อ audit
- roll.py : ตัวช่วยทอยเต๋า (d20, adv, dis, NdM+K) เขียนผลลง rolls.log
- atk.py : ตัวช่วย resolve การโจมตีและ save เขียนผลลง rolls.log
- board.py : ตัวช่วยแสดงกระดาน 7x7, ระยะ และ line of sight

## อ้างอิง PRD
- Prototype kit, F3 Tactical grid battle, F5 Tamer, MVP roadmap (เฟส 0)

## แนวทาง/กฎการตั้งชื่อ
- บันทึกเกมใหม่ชื่อ game<N>.md, ระบุ scenario และ rules version ที่ใช้ไว้บรรทัดแรก
- script เป็น python3 standard library; path ของ rolls.log ใน script อาจชี้ไปตำแหน่งเดิมของ session ให้ตรวจก่อนใช้

## สถานะ
- เล่นแล้ว 2 เกม (ใช้ rules v1); ถัดไป playtest skill set F และ Enemy AI
