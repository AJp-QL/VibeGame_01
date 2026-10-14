# Spec: Phase 1 — Battle vertical slice

Status: ready-for-agent

ที่มา: session grill-with-docs วันที่ 2026-10-14 (ดู decision log แถววันที่ 2026-10-14, ADR 0001–0003 และ CONTEXT.md)

## Problem Statement

กติกา Battle ผ่าน paper prototype และ simulation มาแล้ว 4 รอบ แต่ยังพิสูจน์ไม่ได้ว่า Battle "มีทางเลือกที่มีความหมาย" สำหรับคนจริง เพราะ playtest ที่มีเป็น AI เล่นด้วย rules v1 และ AI ใน simulation มองแค่ step เดียว ปัญหาที่ค้าง (Battle ยื้อถึง turn limit, บาลานซ์ Scenario 2, skill ที่ไม่ถูกใช้) ก็ปรับได้ช้าเพราะต้องเล่นบนกระดาษหรือแก้ Python sim แยกจากกติกาจริง

นอกจากนี้กติกากระจายอยู่หลายที่ (PRD, rules v1–v4 ที่ต้องอ่านซ้อนกัน, decision log) และเริ่มขัดกันแล้ว ผู้พัฒนาซึ่งทำงานคนเดียวกับ AI agent แบบ part-time จึงต้องมีกติกาฉบับเดียวที่ engine อ่าน และต้องมีเครื่องมือที่ทำให้ playtester คนจริงเล่นได้ ส่งผลกลับมาได้ และเล่นซ้ำเพื่อ debug ได้

## Solution

เว็บเกม static ที่เล่น Battle บน Board 7x7 ได้ทั้งกับ AI และแบบ Hotseat ใช้ Tamer (Basic Tamer) + Monster 2 ตัวจาก 4 species ตาม Scenario 1 และ 2 ของ Prototype kit กติกาทั้งหมดอยู่ใน engine ตัวเดียวที่ deterministic เมื่อให้ Dice Seed เดียวกันและลำดับ action เดียวกันจะได้ผลเดิมเสมอ UI แสดง % โอกาสโดนและช่วง damage ก่อนยืนยันทุก action playtester export ไฟล์ Replay พร้อมสถิติการเล่นในเครื่องได้ และผู้พัฒนาเปิด Replay นั้นเล่นซ้ำได้ตรงเป๊ะ

ควบคู่กันมี simulator แบบไม่มี UI ที่ใช้ engine และ AI ตัวเดียวกับเกม เพื่อยืนยันว่าผลตรงกับ sim v4 แล้วใช้เป็นเครื่องมือ tuning หลักแทน Python sim

Gate ของ phase นี้: playtester 5 คนกลับมาเล่นซ้ำเองโดยไม่ต้องบอก และ Battle มีทางเลือกที่มีความหมาย (ย้ายมาจาก gate phase 0)

## User Stories

### กติกาและข้อมูล

1. As a ผู้พัฒนา, I want กติกา Battle ทั้งหมดรวมอยู่ในเอกสาร rules ฉบับเดียวใน repo, so that ไม่ต้องอ่าน rules v1–v4 ซ้อนกันและ engine มีต้นฉบับเดียว
2. As a ผู้พัฒนา, I want เอกสาร rules ฉบับรวมแก้ข้อขัดแย้งเรื่อง Command กับการป้องกัน Tamer ให้ตรงกับ PRD (Command หักล้างไม่ได้), so that engine ไม่ implement กฎที่ล้าสมัย
3. As a ผู้พัฒนา, I want ตัวเลขทั้งหมด (species, skill, status, Board, Scenario, element wheel) อยู่ใน data เป็น JSON, so that ปรับบาลานซ์ได้โดยไม่แตะโค้ด
4. As a ผู้พัฒนา, I want data ทุกไฟล์ถูกตรวจ schema ตอน build และตอนโหลด, so that ข้อมูลผิดรูปแบบถูกจับได้ก่อนถึงมือ playtester
5. As a ผู้พัฒนา, I want Unit ใน Scenario เก็บเป็นข้อมูลแบบ Monster จริง (species, ธาตุ, Star, 6 stat, skill loadout), so that phase 2 นำ Monster จาก Seed มาใช้ได้โดยไม่ต้องรื้อ
6. As a ผู้พัฒนา, I want engine คำนวณ HP, Guard, Ward, ระยะเดิน, proficiency และ attack bonus จากสูตร, so that ค่าทั้งหมดสอดคล้องกับกติกาเสมอ
7. As a ผู้พัฒนา, I want ระยะเดินของทุก species มาจากสูตรล้วนไม่มีข้อยกเว้น (Tidewall เดิน 2 ช่อง), so that กติกาไม่มีกรณีพิเศษซ่อนอยู่

### เริ่ม Battle

8. As a playtester, I want เลือก Scenario (ต้นเกมหรือกลางเกม), Board (Crossroads หรือ Board ที่ 2) และโหมด (กับ AI หรือ Hotseat), so that ลองเล่นได้หลายแบบ
9. As a playtester, I want เลือกว่าจะเล่นทีม A หรือทีม B เมื่อเล่นกับ AI, so that ลองได้ทั้งสองทีม
10. As a playtester, I want เห็น terrain ทั้ง Board ก่อน deployment, so that วางแผนการวางได้
11. As a playtester, I want วาง Tamer และ Monster 2 ตัวในโซนเริ่ม 2 แถวหลังของฝั่งตัวเอง, so that เลือกตำแหน่งเริ่มต้นเองได้
12. As a playtester เล่นกับ AI, I want AI วางแบบซ่อนไว้ก่อน แล้วเปิดเผยพร้อมกันเมื่อผมวางเสร็จ, so that ฝั่งที่วางทีหลังไม่ได้เปรียบ
13. As a playtester แบบ Hotseat, I want แต่ละคนวางโดยอีกคนไม่เห็น แล้วเปิดเผยพร้อมกัน, so that deployment ยุติธรรมแม้เล่นเครื่องเดียว
14. As a playtester, I want เห็นผลทอย initiative (d20 + AGI mod สูงสุดในทีม) ว่าฝั่งไหนเริ่มก่อน, so that เข้าใจลำดับการเล่น
15. As a playtester ฝั่งที่เริ่มก่อน, I want ระบบบอกชัดว่า Turn แรกเล่นได้แค่ 2 จาก 3 Unit, so that ไม่สับสนว่าทำไมขยับ Unit ที่ 3 ไม่ได้

### เล่นใน Turn

16. As a playtester, I want เลือกลำดับ Unit ที่จะเล่นใน Turn ได้เอง, so that วางคอมโบได้
17. As a playtester, I want เห็นช่องที่ Unit เดินไปได้ (วัดแบบ 8 ทิศ ผ่าน Unit อื่นไม่ได้ยกเว้น Flying), so that ไม่ต้องนับช่องเอง
18. As a playtester, I want ทำ Move และ Action ของแต่ละ Unit ได้อย่างละครั้งในลำดับที่เลือก, so that ใช้ action economy ได้ตามกติกา
19. As a playtester, I want เห็นเป้าที่โจมตีได้ตามระยะ line of sight และสถานะ Hidden, so that ไม่เลือกเป้าที่ผิดกติกา
20. As a playtester, I want เห็น % โอกาสโดนและช่วง damage (รวม advantage/disadvantage, terrain, ธาตุ, critical) ก่อนยืนยันทุก action, so that ตัดสินใจจากความเสี่ยงที่เห็นชัด
21. As a playtester, I want เห็น % โอกาสที่เป้าจะไม่ผ่าน save สำหรับ skill แบบ save, so that รู้ความเสี่ยงของ skill สถานะ
22. As a playtester, I want เห็นว่า advantage และ disadvantage มาจากแหล่งไหน และหักล้างกันอย่างไร, so that เข้าใจกติกาการซ้อนผล
23. As a playtester, I want ยกเลิกการเลือกก่อนยืนยัน action ได้, so that ไม่เสีย action เพราะกดพลาด
24. As a playtester, I want ใช้ Action ป้องกัน (Guard และ Ward +2 จนถึง Turn ถัดไปของตัวเอง), so that มีทางเลือกเชิงรับ
25. As a playtester, I want ใช้ skill ใน loadout ของ Monster ตาม tier (Minor, Major cooldown 2, Signature) และเห็น cooldown เป็นตัวเลขบนไอคอน, so that วางแผนจังหวะใช้ skill ได้
26. As a playtester, I want Tamer ใช้ Command 1 ครั้งต่อ Turn กับ Monster ในระยะ 3 ช่อง (advantage, ขยับ +1 หรือผ่าน loyalty check) โดยไม่ใช้ Action ของ Tamer, so that Tamer มีบทบาทสั่งการ
27. As a playtester, I want ระบบห้ามใช้ Command ใน Turn แรกของฝั่ง, so that กติกากัน alpha strike ทำงานโดยไม่ต้องจำ
28. As a playtester, I want Tamer ใช้ basic skill ทั้ง 4 (Cover, Attune, First Aid, Distract), so that ลองบทบาท support ได้ครบ
29. As a playtester, I want Attune และ skill ที่เปลี่ยน terrain ทำให้ช่องเปลี่ยนธาตุตามเวลาที่กำหนดแล้วกลับเป็นเดิม, so that ใช้ terrain เป็นเครื่องมือได้
30. As a playtester, I want ใช้ Inspiration 1 ครั้งต่อ Battle เพื่อทอย d20 ของฝั่งตัวเองใหม่, so that มีทางแก้ดวงร้ายที่สำคัญ
31. As a playtester, I want จบ Turn ได้เองแม้ Unit ยังไม่ได้ใช้ Move หรือ Action ครบ, so that ไม่ถูกบังคับให้ทำ action ที่ไม่ต้องการ
32. As a playtester, I want ระบบเตือนก่อนจบ Turn ถ้ายังมี Unit ที่ไม่ได้ทำอะไร, so that ไม่พลาดโดยไม่ตั้งใจ

### กติกาการต่อสู้ที่ต้องทำงานถูก

33. As a playtester, I want element wheel (ป่า > น้ำ > ภูเขา > ทะเลทราย > ป่า, แสงกับมืดได้เปรียบกันและกัน, Tamer ไม่มีธาตุ) ให้ advantage และ disadvantage ถูกต้อง, so that ธาตุมีความหมาย
34. As a playtester, I want Monster ที่ยืนบน terrain ธาตุตรงกันได้ advantage และธาตุที่แพ้ทางได้ disadvantage ส่วน Flying ไม่ได้รับผลจาก terrain, so that ตำแหน่งมีผล
35. As a playtester, I want Aquatic นับช่องน้ำเป็นธาตุตัวเองและเดินบนน้ำได้ +1 ช่อง, so that Tidewall มีเอกลักษณ์
36. As a playtester, I want line of sight ถูก Unit ที่อยู่บนเส้นตรงบัง ยกเว้นเมื่อผู้โจมตีเป็น Flying, so that การวางตำแหน่งกันการยิงได้
37. As a playtester, I want ศัตรูที่โจมตี Tamer ได้ disadvantage เมื่อมี Monster ฝ่ายเดียวกันยืนติด Tamer และ Command หักล้างไม่ได้, so that การปกป้อง Tamer เป็นการตัดสินใจเชิงตำแหน่ง
38. As a playtester, I want ทอย 20 เป็น critical (ทอย dice damage 2 เท่า) และทอย 1 พลาดเสมอ, so that ผลลัพธ์ตรงกับกติกาที่รู้
39. As a playtester, I want damage กายภาพใช้ POW mod ที่ระยะ 1 และ SEN mod ที่ระยะ 2 ขึ้นไป, so that Ranger ทำ damage ได้สมบทบาท
40. As a playtester, I want status (Bleed, Pin, Taunted, Weakened, Marked, Off-balance, Hidden, Guarded, Countering, Rallied) ทำงานตามตาราง status รวมถึง save, ระยะเวลา, การไม่ซ้อนและการรีเซ็ต, so that skill สถานะมีผลจริง
41. As a playtester, I want เห็น status เป็นไอคอนบน Unit และแตะเพื่อดูรายละเอียดและระยะเวลาที่เหลือ, so that อ่านสถานการณ์บน Board ได้
42. As a playtester, I want การผลัก (Shield Bash) ทำงานตาม ruling ที่ตกลงไว้ (ผลักแนวทแยงได้, Counter resolve ก่อนผลัก, Unit ที่ติด Pin ยังถูกผลักได้), so that ไม่มีกรณีกำกวม
43. As a playtester, I want Burst โดนศัตรูได้สูงสุด 2 ตัวในพื้นที่ 3x3 ที่ผมเลือกเอง, so that skill พื้นที่ไม่แรงเกิน

### จบ Battle

44. As a playtester, I want Battle จบเมื่อ HP ของ Tamer ฝั่งใดฝั่งหนึ่งเป็น 0 หรือ Monster ฝั่งหนึ่งถูกกำจัดหมด, so that เงื่อนไขชนะชัดเจน
45. As a playtester, I want เมื่อครบ 10 Round แล้วฝั่งที่ทำ damage รวมมากกว่าชนะ (heal ไม่หักลบ เท่ากันเสมอ), so that Battle ไม่ยื้อไม่จบ
46. As a playtester, I want เห็นจำนวน Round ปัจจุบันและ damage รวมของแต่ละฝั่งตลอด Battle, so that วางแผนรอบท้ายได้
47. As a playtester, I want หน้าสรุปผลบอกผู้ชนะ สาเหตุ จำนวน Round และ damage รวม, so that รู้ว่าเกิดอะไรขึ้น
48. As a playtester, I want เริ่ม Battle ใหม่ได้ทันทีจากหน้าสรุป, so that เล่นซ้ำได้ง่าย

### AI

49. As a playtester, I want AI ศัตรูเล่นตามกติกาเดียวกับผม ผ่าน engine เดียวกัน, so that ไม่มีการโกง
50. As a playtester, I want AI ปกป้อง Tamer ของตัวเองและรุมเป้าเดียวเป็นพื้นฐาน, so that AI ไม่โง่จนเล่นแล้วไม่มีความหมาย
51. As a playtester, I want เห็น action ของ AI ทีละขั้นพร้อมผลทอย, so that ตามทันว่า AI ทำอะไร
52. As a ผู้พัฒนา, I want AI เลือก action เดิมทุกครั้งเมื่อ state และ Dice Seed เหมือนเดิม, so that Replay ของเกมที่เล่นกับ AI เล่นซ้ำได้
53. As a ผู้พัฒนา, I want AI มีโปรไฟล์ greedy, tamer_rush และ neutral แบบเดียวกับ sim, so that เทียบผลกับ sim v4 ได้

### บันทึกและ Replay

54. As a playtester, I want เห็น log ของทุก action และผลทอยระหว่าง Battle, so that ย้อนดูได้ว่าทำไมผลออกมาแบบนั้น
55. As a playtester, I want export ไฟล์ Replay ของ Battle ล่าสุดพร้อมสถิติการเล่นในเครื่อง, so that ส่งให้ผู้พัฒนาได้ง่าย
56. As a ผู้พัฒนา, I want import ไฟล์ Replay แล้วเล่นซ้ำทีละ action หรือข้ามไปท้ายเกมได้, so that เห็นเกมที่มีปัญหาตรงเป๊ะ
57. As a ผู้พัฒนา, I want Replay เก็บ Dice Seed, Scenario, Board, โหมด, ลำดับ action, hash ของ data และเวอร์ชัน engine, so that รู้ว่าเล่นซ้ำด้วยข้อมูลชุดไหน
58. As a ผู้พัฒนา, I want ระบบแจ้งว่าเวอร์ชันไม่ตรงเมื่อ hash ของ data หรือเวอร์ชัน engine ไม่ตรงกับ Replay และไม่พยายามแปลง, so that ไม่ได้ผลผิดแบบเงียบๆ
59. As a ผู้พัฒนา, I want แต่ละ build ที่ deploy มี git tag ตรงกับเวอร์ชัน engine, so that เปิด Replay เก่าได้ด้วยการ checkout tag

### การแจกและวัดผล playtest

60. As a playtester, I want เปิดเกมจากลิงก์เว็บได้เลยไม่ต้องติดตั้งหรือสมัครบัญชี, so that เริ่มเล่นได้ทันที
61. As a playtester, I want เล่นได้ทั้ง desktop (mouse) และมือถือ (touch) บนจอกว้าง 360 px ขึ้นไป, so that เล่นบนอุปกรณ์ที่มีได้
62. As a playtester, I want ภาพ pixel art คมไม่เบลอ (nearest-neighbor และ integer scale), so that อ่าน Board ได้ชัด
63. As a playtester, I want แยก species และฝั่งของแต่ละ Unit ได้ทันทีจาก silhouette และสี แม้ยังเป็นภาพชั่วคราว, so that อ่านบทบาทบน Board ได้
64. As a playtester, I want UI เป็นภาษาไทยแต่ชื่อ skill, status และ species เป็นอังกฤษ, so that เข้าใจง่ายและตรงกับเอกสาร
65. As a ผู้พัฒนา, I want เกมนับสถิติในเครื่องของ playtester (จำนวนครั้งที่เปิดเกม, จำนวน Battle ที่เริ่มและจบ, วันที่เล่น), so that วัด gate "กลับมาเล่นซ้ำเอง" ได้โดยไม่มี backend
66. As a playtester, I want ลิงก์ไปแบบฟอร์มสั้นจากหน้าสรุปหรือเมนู, so that ส่งความเห็นได้ทันทีหลังเล่น
67. As a ผู้พัฒนา, I want ข้อความ UI ทั้งหมดอยู่ใน string table, so that เพิ่มภาษาอังกฤษทีหลังได้โดยไม่รื้อ

### Simulator และ tuning

68. As a ผู้พัฒนา, I want simulator แบบไม่มี UI รัน Scenario หลายพันเกมด้วย engine และ AI ตัวเดียวกับเกม, so that tuning บนกติกาจริง
69. As a ผู้พัฒนา, I want simulator รายงานอัตราชนะ, จำนวน Turn, Tamer ล้มเป็นตัวแรก, สัดส่วนเกมที่จบด้วย turn limit, Unit ที่ล้มเป็นตัวแรก, damage ต่อเกมแยกตาม Unit และ skill ที่ถูกใช้, so that เห็นปัญหาบาลานซ์ชัด
70. As a ผู้พัฒนา, I want simulator ยืนยันว่าผลต่างจาก sim v4 (variant U4) ไม่เกิน ±5 percentage point, so that มั่นใจว่า engine implement กติกาถูกก่อนเลิกใช้ Python sim
71. As a ผู้พัฒนา, I want รัน simulator ซ้ำด้วย Dice Seed ชุดเดิมแล้วได้ตัวเลขเท่าเดิม, so that เทียบผลก่อนและหลังปรับตัวเลขได้

## Implementation Decisions

### โครงสร้าง module (ตาม dependency ที่กำหนดไว้: shared ← engine ← ai / battle / web, tools ใช้ engine + ai)

- **shared**: type และ schema ของ data (species, skill, status, Board, Scenario, element wheel) และรูปแบบไฟล์ Replay
- **engine**: กติกาทั้งหมดเป็น pure function ไม่แตะ UI, network หรือเวลาจริง import ได้แค่ shared
- **ai**: เลือก action โดยเรียก engine เท่านั้น ไม่มี logic กติกาซ้ำ
- **battle**: Phaser scene วาด Board, Unit, terrain และเล่น animation จากรายการเหตุการณ์ของ engine รับ input ทั้ง touch และ mouse
- **web**: React โครง UI: เมนูเลือก Scenario, Board และโหมด, HUD (preview % และ damage, cooldown, status, Inspiration, Round และ damage รวม), UI deployment, log, หน้าสรุปผล, import/export Replay, ตัวนับสถิติในเครื่อง, string table
- **simulator** (ในพื้นที่ tools): รัน Battle แบบไม่มี UI แล้วรายงานสถิติ
- **server**: ไม่แตะใน phase นี้

### Interface ของ engine (seam หลัก)

- **สร้าง Battle**: รับ Scenario + Board + โหมด + แหล่งลูกเต๋า แล้วคืน state เริ่มต้นที่อยู่ในช่วง deployment แหล่งลูกเต๋าปกติคือ Dice Seed ส่วนใน test ใส่ลำดับผลทอยที่กำหนดเองได้ผ่านช่องทางเดียวกัน
- **ถาม action ที่ทำได้**: คืนรายการ action ที่ถูกกติกาสำหรับฝั่งที่กำลังเล่น ได้แก่ การวางใน deployment, Move, Action (โจมตี, skill, ป้องกัน), Command, Inspiration และจบ Turn
- **ดูตัวอย่าง action**: คืน % โอกาสโดนหรือ % ที่เป้าไม่ผ่าน save, ช่วง damage ต่ำสุดถึงสูงสุด, โอกาส critical และรายการแหล่งที่มาของ advantage และ disadvantage พร้อมผลการหักล้าง โดยไม่เปลี่ยน state และไม่กินลูกเต๋า
- **ส่ง action**: คืน state ใหม่ + รายการเหตุการณ์ตามลำดับ (เดิน, ทอย, โดน/พลาด, damage, ติดหรือหลุด status, ผลัก, terrain เปลี่ยน, Unit ล้ม, Turn และ Round เปลี่ยน, Battle จบ) UI และ log สร้างจากรายการเหตุการณ์นี้เท่านั้น
- action ที่ผิดกติกาต้องถูกปฏิเสธพร้อมเหตุผล ไม่เปลี่ยน state
- **Replay**: คือ Dice Seed + ข้อมูลเริ่มต้น + ลำดับ action ส่งเข้า engine ตามลำดับแล้วต้องได้ state สุดท้ายเดียวกันทุกครั้ง engine มีฟังก์ชันตรวจว่า Replay เข้ากันได้กับ data และเวอร์ชันปัจจุบันหรือไม่

### Determinism (ADR 0002)

- ใช้จำนวนเต็มล้วนในกติกาทั้งหมด ตัวคูณ HP แบบหนัก ×1.2 และแบบเบา ×0.8 คำนวณเป็น ×12 ÷ 10 และ ×8 ÷ 10 ปัดลง ส่วน modifier ใช้การหารที่ปัดลงแบบ floor ชัดเจน (ระวังค่าติดลบ เช่น stat 9 ต้องได้ mod −1)
- ระยะเดิน: AGI mod ÷ 4 ปัดเข้าหาศูนย์ ตามการตีความใน Prototype kit
- ลูกเต๋ามาจาก PRNG แบบจำนวนเต็มที่ระบุอัลกอริทึมไว้ในเอกสาร rules ห้ามใช้ตัวสุ่มของภาษาหรือเบราว์เซอร์
- ลำดับการกินลูกเต๋าต้องกำหนดตายตัวใน rules ฉบับรวม เช่น skill ที่ทอยแยกทุกเป้าทอยตามลำดับที่ผู้เล่นเลือกเป้า
- line of sight ต้องใช้นิยามเส้นเดียวกับ Python sim และ helper ของ playtest เพื่อให้ผลเทียบกันได้ เอกสาร rules ระบุอัลกอริทึมไว้

### Data

- รูปแบบ JSON ตรวจด้วย schema จาก shared ทั้งตอน build และตอนโหลด
- ชุดข้อมูลของ phase นี้:
  - 4 species (Fangrel, Tidewall, Wispling, Quillfox) + Tamer
  - skill ตาม loadout ของ Prototype kit: Basic Attack, Defend, Heavy Blow, Rend, Hit and Run, Pack Howl, Taunt, Shield Bash, Counter, Pincer Guard, Element Bolt, Burst, Hex, Blink, Long Shot, Pin, Mark, Camouflage และ basic skill ของ Tamer (Cover, Attune, First Aid, Distract)
  - status 10 ตัว: Bleed, Pin, Taunted, Weakened, Marked, Off-balance, Hidden, Guarded, Countering, Rallied
  - Board 2 แบบ: Crossroads และ Board ที่ 2 ซึ่งต้องสมมาตรเมื่อหมุน 180 องศาเหมือน Crossroads
  - Scenario 2 แบบตาม Prototype kit: ต้นเกม (Tamer Lv 1, Monster 1 Star) และกลางเกม (Tamer Lv 6, Monster 4 Star) ทีม A และ B ตาม kit
- Unit ใน Scenario เก็บแบบ Monster จริง: species, ธาตุ, Star, 6 stat และ skill loadout ไม่เก็บค่าที่คำนวณแล้ว
- hash ของ data คำนวณจากเนื้อหาข้อมูลทั้งชุดที่ normalize แล้ว ใช้ใน Replay

### เอกสาร rules ฉบับรวม (ADR 0001)

- เป็นงานแรกก่อน implement engine: รวม v1+v2+v3+v4 กับ PRD และ decision log เป็นฉบับเดียว
- แก้ v4 ข้อ 5 ให้ตรงกับ PRD และ decision log (Command หักล้าง disadvantage จากการป้องกัน Tamer ไม่ได้)
- ใส่ ruling ที่ตกลงจาก round 3 (การผลักแนวทแยง, Counter ก่อนผลัก, Pin ยังถูกผลักได้)
- ระบุสิ่งที่ engine ต้องกำหนดตายตัว: อัลกอริทึม PRNG, ลำดับการกินลูกเต๋า, อัลกอริทึม line of sight, การปัดเศษทุกจุด และ d20 ไหนบ้างที่ Inspiration ใช้ทอยใหม่ได้ (ruling จาก playtest เกม 1: การทอยที่ไม่ใช่ d20 เช่น Bleed ใช้ไม่ได้)
- ตัดข้อยกเว้นระยะเดินของ Tidewall ใน kit ทิ้ง
- prototype/rules v1–v4 เก็บเป็นประวัติแบบอ่านอย่างเดียว แก้ README ของ repo ให้การไหลเป็น rules ฉบับรวม → data → engine

### UI และ rendering (ADR 0003)

- React ดูแลเมนู, HUD และ overlay ส่วน Phaser วาด Board และ animation ทั้งสองฝั่งไม่เก็บ state ของเกมเอง
- tile 32x32, Board 224x224 px ก่อน scale, scale เป็นจำนวนเต็มเท่านั้น และ render แบบ nearest-neighbor บนจอ 360 px ใช้ ×1
- art ชั่วคราว: silhouette ต่อ species + สีหลักตามธาตุ + ตัวบ่งชี้ฝั่ง ยังไม่มีระบบประกอบ sprite 6 layer
- input: tap หรือ click เลือก Unit → เลือกช่องหรือเป้า → เห็น preview → ยืนยัน ไม่พึ่ง hover เพราะมือถือไม่มี hover
- ขัดเกลาบน desktop ก่อน ส่วนมือถือแค่ต้องเล่นจบ Battle ได้

### AI

- port AI แบบ greedy มองหนึ่ง activation จาก Python sim ทั้ง 3 โปรไฟล์ (greedy, tamer_rush, neutral) แล้วเพิ่ม heuristic พื้นฐาน (ปกป้อง Tamer, รุมเป้าเดียว)
- AI ต้อง deterministic: ถ้าต้องสุ่มเพื่อตัดสินเสมอ ให้ใช้ลำดับลูกเต๋าที่แยกจาก Dice Seed ของ Battle หรือกติกา tie-break ที่ตายตัว เพื่อไม่ให้การคิดของ AI ไปเปลี่ยนลูกเต๋าของ Battle
- AI วาง deployment ก่อนแบบซ่อน

### เครื่องมือและการ deploy

- TypeScript ทั้งระบบ, pnpm workspaces, Vite, Vitest และ React + Phaser ต้องยืนยันชื่อและเวอร์ชันจาก docs จริงด้วย /research ก่อนตั้ง workspace
- deploy เป็นเว็บ static (GitHub Pages หรือ Cloudflare Pages) ไม่มี backend
- ทุก build ที่ deploy ติด git tag และแสดงเวอร์ชันใน UI
- สถิติการเล่นเก็บใน browser storage ของ playtester เท่านั้น ไม่ส่งออกไปไหน export มากับไฟล์ Replay

## Testing Decisions

### หลักของ test ที่ดี

- test พฤติกรรมผ่าน interface สาธารณะเท่านั้น: ใส่ state + action แล้วตรวจ state ใหม่ รายการเหตุการณ์ และผล preview ไม่ test ฟังก์ชันย่อยภายใน
- ควบคุมลูกเต๋าด้วยลำดับผลทอยที่กำหนดเองผ่านช่องทางเดียวกับ Dice Seed ไม่ต้องหา seed ที่บังเอิญได้ผลที่ต้องการ
- ตั้งชื่อ test ด้วยคำศัพท์ใน CONTEXT.md

### Seam A: interface ของ engine (test ส่วนใหญ่อยู่ที่นี่)

- ค่าที่คำนวณได้ (HP, Guard, Ward, ระยะเดิน, attack bonus, damage หลัก) ของทุก Unit ใน Scenario 1 และ 2 ต้องตรงกับตาราง stat block ใน Prototype kit ยกเว้นระยะเดินของ Tidewall ที่เปลี่ยนเป็นสูตรล้วนแล้ว
- กติกาที่ต้องมี test: ระยะ 8 ทิศ, การเดินผ่าน Unit, Flying, Aquatic, line of sight, Hidden, element wheel, terrain, การหักล้าง advantage/disadvantage, การป้องกัน Tamer ที่ Command หักล้างไม่ได้, critical และทอย 1 พลาด, damage กายภาพตามระยะ, status ทั้ง 10 ตัว (save, ระยะเวลา, ไม่ซ้อน, รีเซ็ต, นับเมื่อจบ Turn ของฝั่งที่ติด), cooldown ตาม tier, Command และข้อห้ามใน Turn แรก, 2 จาก 3 Unit ใน Turn แรก, Inspiration, การผลักและ ruling ที่เกี่ยวข้อง, Burst 2 เป้า, เงื่อนไขชนะทั้ง 3 แบบ
- preview ต้องไม่เปลี่ยน state และไม่กินลูกเต๋า และ % ที่แสดงต้องตรงกับความน่าจะเป็นจริงของกติกา
- action ที่ผิดกติกาถูกปฏิเสธและ state ไม่เปลี่ยน
- Replay: เล่น Battle หลายเกมด้วย Dice Seed ต่างกัน เล่นซ้ำจาก Replay แล้วได้ state สุดท้ายเดียวกัน และ Replay ที่ hash ของ data ไม่ตรงถูกแจ้งว่าเวอร์ชันไม่ตรง
- data ที่ผิด schema ถูกปฏิเสธตอนโหลด

### Seam B: simulator

- ผลของ Scenario 1 และ 2 กับโปรไฟล์ AI แบบเดียวกับ sim v4 (variant U4) ต่างไม่เกิน ±5 percentage point ในตัวชี้วัดอัตราชนะ, จำนวน Turn, Tamer ล้มเป็นตัวแรก และเกมที่จบด้วย turn limit
- รันซ้ำด้วย Dice Seed ชุดเดิมได้ตัวเลขเท่าเดิม
- AI เลือก action เดิมเมื่อ state และ Dice Seed เหมือนเดิม

### UI

- ไม่มี seam สำหรับ UI มีแค่ smoke test ว่าเปิดเกมได้ และเล่น Battle กับ AI จนจบได้ 1 เกมทั้งบนขนาดจอ desktop และ 360 px
- ความรู้สึกตอนเล่นและความเข้าใจ UI วัดด้วย playtest

### Prior art

- Python simulator และผลรอบ 1–4: ใช้เป็นค่าอ้างอิงของ Seam B และอ้างอิงพฤติกรรม AI
- helper ของ playtest (ทอยเต๋า, resolve การโจมตี, ระยะและ line of sight): ใช้อ้างอิงการตีความกติกา
- ตาราง stat block และกระดาน Crossroads ใน Prototype kit: ใช้เป็นค่าคาดหวังใน test
- บันทึก playtest เกม 1–2 ใช้ rules v1 จึงใช้เป็น golden test ไม่ได้ ใช้ได้แค่ ruling ที่บันทึกไว้

## Out of Scope

- Tactician mode, loyalty check (ถือว่า loyalty เต็ม), ไอเทม, Team cost cap (ใช้ทีมตายตัวตาม Scenario)
- skill ใน vertical slice ที่ไม่อยู่ใน loadout ของ kit: Rally Roar, Finisher, Shield Wall, Mana Shield, Scout, Tide Surge, Echo, Quill Volley และ status ที่ใช้กับ skill เหล่านี้หรือ species อื่น: Blessed, Empowered, Bound, Stun, Linked
- species อื่นนอกจาก 4 ตัวของ phase 1, skill อาชีพของ Tamer, gear
- ระบบประกอบ sprite 6 layer, palette swap และ art จริง
- ranch, Seed, Rarity Roll, Combine, campaign และ save ข้าม session (นอกจากสถิติในเครื่อง)
- server, account และ analytics service
- ตัวจับเวลา deployment
- UI ภาษาอังกฤษ (เตรียมแค่ string table)
- การปรับบาลานซ์ตัวเลขจริง: ปัญหาที่ค้าง (Battle ยื้อถึง turn limit, Scenario 2 ทีม A ชนะสูง, skill ที่ไม่ถูกใช้, Tidewall และ Tamer ทนเกินเป้า) ทำเป็น ticket tuning แยก หลังจาก simulator ผลตรงแล้ว

## Further Notes

- ลำดับงานที่แนะนำ: /research ยืนยัน stack → เอกสาร rules ฉบับรวม → shared + data → engine (Seam A) → AI + simulator (Seam B ผลตรงกับ sim v4) → battle + web → deploy และ playtest
- Board ที่ 2 ยังไม่ได้ออกแบบ ต้องสมมาตรเมื่อหมุน 180 องศา และให้ตำแหน่งต่างจาก Crossroads ชัดเจน
- หมายเหตุ tuning จาก PRD: ถ้า playtest พบว่าตำแหน่งไม่มีผล ให้ลดระยะทุกหมวดลง 1 ซึ่งเป็นการแก้ data ไม่ต้องแก้ engine
- Phase 2 จะใช้ seed registry จำลองแบบ local หลัง interface เดียวกัน (decision log 2026-10-14) ไม่เกี่ยวกับ phase นี้ แต่ engine ต้องไม่ผูกกับแหล่งที่มาของ Monster
- คำศัพท์ทั้งหมดใน spec นี้ใช้ตาม CONTEXT.md
