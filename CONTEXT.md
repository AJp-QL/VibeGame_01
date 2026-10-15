# Monster Tactics

เกม tactics บนเว็บ ผู้เล่นเป็น Tamer เลี้ยงมอนสเตอร์ที่เกิดจาก Seed ที่ ranch แล้วพาลงสู้บนกระดาน grid และผจญภัยใน campaign

## Language

### ตัวละครบนกระดาน

**Tamer**:
ตัวละครของผู้เล่น ลงสนามพร้อมมอน 2 ตัว ไม่แก่ และความก้าวหน้าอยู่ข้ามรุ่นมอน
_Avoid_: player character, ผู้เล่น (เมื่อหมายถึงตัวละคร)

**Monster**:
สิ่งมีชีวิตที่ผู้เล่นเลี้ยงใน ranch มีอายุขัย และออกจาก roster ได้ด้วย Retire, Consumed หรือ Release
_Avoid_: มอน (ใช้ได้ในบทสนทนา แต่ไม่ใช้ในเอกสารสเปก), pet

**Star**:
ระดับของ Monster ตั้งแต่ 1 ถึง 8 ใช้เป็น cost ในทีมและเลื่อนขึ้นผ่าน promotion trial
_Avoid_: level ดาว, monster level, level

**Level**:
ระดับของ Tamer เท่านั้น (1 ถึง 10 ใน MVP) ใช้กำหนด proficiency และ Team cost cap
_Avoid_: ใช้คำว่า level กับ Monster

### การสู้

**Battle**:
การสู้ 1 ครั้งระหว่างสองฝั่ง ตั้งแต่ deployment จนมีผู้ชนะหรือเสมอ
_Avoid_: กระดาน (เมื่อหมายถึงการสู้), match, fight

**Board**:
layout terrain 7x7 ที่ Battle ใช้ เช่น Crossroads
_Avoid_: map (ใช้กับ campaign), กระดาน (เมื่อหมายถึงการสู้)

**Unit**:
Tamer หรือ Monster ที่อยู่บน Board ระหว่าง Battle

**Turn**:
ช่วงที่ฝั่งหนึ่งเล่น ทุก Unit ของฝั่งนั้นได้ Move + Action
_Avoid_: เทิร์นต่อฝั่ง

**Round**:
ทั้งสองฝั่งเล่นครบฝั่งละ 1 Turn turn limit ของ Battle คือ 10 Round
_Avoid_: เทิร์น (เมื่อหมายถึงทั้งสองฝั่ง)

**Command**:
คำสั่งพิเศษของ Tamer ใช้ได้ 1 ครั้งต่อ Turn ให้ Monster ในระยะได้ advantage ขยับ +1 หรือผ่าน loyalty check ไม่ใช้ Action ของ Tamer
_Avoid_: Command action

**Scenario**:
ชุดทีมที่กำหนดไว้ล่วงหน้า (Tamer และ Monster พร้อม stat และ skill) ใช้ใน playtest และ simulation เช่น Scenario 1 (ต้นเกม) และ Scenario 2 (กลางเกม) Board เลือกแยกจาก Scenario ได้ Scenario มีแค่ Board ตั้งต้น

**Hotseat**:
โหมดที่คน 2 คนเล่นคนละฝั่งบนเครื่องเดียว

**Replay**:
Dice Seed ของ Battle รวมกับลำดับ action ทั้งหมด ซึ่งเล่นซ้ำแล้วต้องได้ผลเดิมทุกครั้ง

### Seed และความสุ่ม

**Seed**:
input ที่ผู้เล่นป้อน (ข้อความ เพลง วันเกิด หรือภาพ) เพื่อสร้าง Monster ตัวใหม่ ใช้ได้ครั้งเดียวต่อ account
_Avoid_: ใช้คำว่า seed กับความสุ่มของลูกเต๋า

**Dice Seed**:
ค่าเริ่มต้นของความสุ่มลูกเต๋าใน battle หรือ campaign run ใช้ทำ replay ให้ได้ผลเดิม
_Avoid_: seed, rng seed (ในเอกสาร)

**Rarity Roll**:
ผลสุ่ม rarity ของ Monster ที่คงที่ต่อคู่ account กับ Seed ทำให้ Seed เดียวกันให้ species ธาตุ และหน้าตาเหมือนกันทุกคน แต่ rarity ต่างกันได้
_Avoid_: hybrid seed, Hybrid (สำหรับกฎนี้)

### การผสมและมรดก

**Combine**:
การใช้ Monster ที่ยังมีชีวิต 2 ตัวสร้างลูก 1 ตัว ผลเป็น Inherit หรือ Hybrid
_Avoid_: breeding, ผสมพันธุ์

**Hybrid**:
species พิเศษที่ได้จาก Combine ของคู่ species ในตารางผสมเท่านั้น หาจาก Seed ไม่ได้
_Avoid_: ใช้คำว่า Hybrid กับกฎ rarity หรือเรื่อง rendering

**Retire**:
Monster ออกจาก roster เพราะหมดอายุขัยเอง เข้า Hall of Fame และเป็นทางเดียวที่ให้ Essence
_Avoid_: เกษียณ (เมื่อหมายถึง Consumed หรือ Release)

**Consumed**:
Monster ที่ถูกใช้เป็นพ่อแม่ใน Combine ออกจาก roster ทันที เข้า Hall of Fame ไม่ได้ Essence
_Avoid_: เกษียณ, retired parent

**Release**:
ผู้เล่นปล่อย Monster ออกจาก roster เอง (เช่นตอน roster เต็ม) เข้า Hall of Fame ไม่ได้ Essence
_Avoid_: เกษียณ, ลบมอน

**Hall of Fame**:
บันทึกถาวรของ Monster ทุกตัวที่ออกจาก roster ไม่ว่าจะ Retire, Consumed หรือ Release ทุกตัวเพิ่ม Species mastery ให้ species ของมัน
