# Monster Tactics RPG

เกม tactics บนเว็บ ที่ผู้เล่นเป็น Tamer ลงสนามร่วมกับมอนสเตอร์ 2 ตัว เลี้ยงมอนสเตอร์ที่เกิดจาก seed และผจญภัยใน campaign แบบ node map

## 4 เสาหลัก
- Tactical grid battle: กระดาน 7x7 สไตล์ Yu-Gi-Oh Capsule Monster
- D&D dice และ campaign: d20 check, campaign แบบ node map
- Raising สไตล์ Monster Rancher: มอนสเตอร์จาก seed, training รายสัปดาห์, lifespan, combine/breeding
- Tamer: ผู้เล่นสู้เองด้วย 4 class (Beastwarden, Rune Caller, Mender, Trickster)

## PRD
- ต้นฉบับ (Claude Docs): https://claude.ai/code/artifact/e9faa4d2-0774-4340-a591-ae0e4549504d
- export สำหรับอ่านออฟไลน์: docs/prd/

## แผนผังโฟลเดอร์
| โฟลเดอร์ | หน้าที่ | PRD section | เฟสที่ต้องใช้ |
|---|---|---|---|
| docs/prd | export ของ PRD | ทั้งหมด | เฟส 0 |
| docs/design | เอกสารออกแบบราย feature | F1-F7 | เฟส 0 ขึ้นไป |
| docs/decisions | decision log | ทั้งหมด, Risks | เฟส 0 ขึ้นไป |
| docs/playtest | บันทึก playtest | Prototype kit | เฟส 0 |
| prototype/rules | กติกา paper prototype v1-v4 | F3, F5, Prototype kit | เฟส 0 |
| prototype/simulation | simulator และผล 4 รอบ | F3, Technical requirements | เฟส 0 |
| data/ | species, skills, statuses, traits, boards, campaigns | F1, F3, F4, F7 | เฟส 1 |
| art/ | sprite 6 layer, tamer, tiles, ui, source | F5, F7, Technical requirements | เฟส 1 |
| packages/engine | rules engine deterministic, seeded RNG | Technical requirements, F1, F3 | เฟส 1 |
| packages/ai | Enemy AI (เกมและ simulation) | F3, F4 | ก่อนเฟส 1 |
| packages/shared | types และ schema | F1, F7 | เฟส 1 |
| packages/battle | renderer กระดาน (2D framework ยังไม่เลือก) | F3 | เฟส 1 |
| packages/web | React app: ranch, campaign, เมนู | F2, F4, F5 | หลังเฟส 1 (ดู roadmap) |
| packages/server | account, share code, seed registry | F6 | หลังเฟส 1 (ดู roadmap) |
| tools/ | script ช่วยพัฒนา | Technical requirements | ตามต้องการ |

หมายเหตุ: คอลัมน์เฟสเป็นการประมาณ ให้ยึด MVP roadmap (เฟส 0-5) ใน PRD เป็นหลัก

## การไหลของไฟล์
prototype/rules -> data/ -> packages/engine
- กติกาทดลองใน prototype/rules และวัดผลด้วย prototype/simulation
- เมื่อนิ่งแล้วแปลงเป็นข้อมูลใน data/ (validate ด้วย schema ใน packages/shared)
- packages/engine อ่าน data/ แล้ว ai, battle, web, server ใช้ engine ตัวเดียวกัน

## สถานะปัจจุบัน
- PRD เสร็จแล้ว
- simulation ครบ 4 รอบ (rules v4)
- ถัดไป: playtest skill set F และ Enemy AI

ทุกโฟลเดอร์มี README.md อธิบายสิ่งที่เก็บ, PRD ที่อ้างอิง, กฎการตั้งชื่อ และสถานะ
