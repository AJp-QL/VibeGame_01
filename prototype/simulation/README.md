# prototype/simulation/

simulator (python3 standard library) ที่เล่นเกมต่อสู้ด้วย AI หลายพันเกมเพื่อวัดสมดุลกติกา

## เก็บอะไร
- sim.py : simulator ปัจจุบัน (rules v4) รายการจุดตีความอยู่ใน AMBIGUITIES ในไฟล์
- sim_v1.py, sim_v2.py, sim_v3.py : simulator ของรอบ 1-3 (เก็บไว้ทำซ้ำผลเดิม)
- results_v1..v4.md : รายงานผลแต่ละรอบ (ตาราง), results_v1..v4.json : ข้อมูลดิบ
- run2-4.log / run2-4.err : stdout และ stderr (เวลาที่ใช้ต่อ config) ของรอบ 2-4

## วิธีรัน
- `python3 sim.py --games 2000` รันทุก config (ค่า default: --games 2000, --procs 2)
- `python3 sim.py --games 50 --only S1` รันเร็วเฉพาะ config ที่ระบุ
- ควรใส่ `--out results_local` เสมอ เพราะค่า default ของ --out ชี้ไป path เดิมของ session (/home/claude/sim/results_v4); ได้ไฟล์ .md และ .json

## ผลหลัก รอบ 1 เทียบรอบ 4 (AI greedy, Team A = ฝ่ายแข็งกว่า)
- S1 (Tamer Lv1, 1 ดาว): A ชนะ 76% -> 54%, เกมยาว 5.0 -> 6.9 รอบ, Tamer ล้มก่อน 60% -> 29%
- S2 (Tamer Lv6, 4 ดาว): A ชนะ 96% -> 80%, เกมยาว ~3 -> 6.2 รอบ; ยังไม่สมดุล มีตัวเลือกแก้ในตาราง Extra S2 fix candidates
- รอบ 4 ไม่มีเสมอ, ชนแบบหมดเวลา (10 เทิร์น) 16% ใน S1 และ 10% ใน S2

## อ้างอิง PRD
- F3 Tactical grid battle, F5 Tamer, Technical requirements (deterministic engine, seeded RNG), Prototype kit

## สถานะ
- จำลองครบ 4 รอบ; ถัดไป playtest skill set F และ Enemy AI (จะย้าย logic AI ไป packages/ai)
