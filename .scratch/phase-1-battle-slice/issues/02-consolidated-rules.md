# 02 — rules ฉบับรวม

**What to build:** เอกสารกติกา Battle ฉบับเดียวใน repo (ADR 0001) ที่ engine ใช้เป็นต้นฉบับ รวม rules v1+v2+v3+v4, PRD (F1, F3, F5, ส่วน vertical slice ของ F7, Prototype kit) และ decision log เข้าด้วยกัน ไม่ต้องอ่านซ้อนอีก ใช้คำศัพท์ตาม CONTEXT.md

**Blocked by:** None — can start immediately

**Status:** done

- [x] ครอบคลุมทุกกติกาที่ spec phase 1 ต้องใช้: stat และ mod, ค่าที่ได้จากสูตร, ระยะ 8 ทิศ, การเดิน, Flying และ Aquatic, line of sight, Hidden, terrain, element wheel, การซ้อนผล, การป้องกัน Tamer, attack/damage/critical, Action ป้องกัน, tier และ cooldown, status 10 ตัว, Command, Turn/Round/initiative, Turn แรก 2 จาก 3 Unit, deployment, Inspiration, เงื่อนไขชนะและ turn limit, skill ตาม loadout ของ kit
- [x] แก้ v4 ข้อ 5 ให้ตรงกับ PRD และ decision log: Command หักล้าง disadvantage จากการป้องกัน Tamer ไม่ได้
- [x] ใส่ ruling จาก round 3 (ผลักแนวทแยง, Counter ก่อนผลัก, Pin ยังถูกผลักได้) และ ruling จาก playtest ที่ยังใช้ได้
- [x] ตัดข้อยกเว้นระยะเดินของ Tidewall ใช้สูตรล้วน
- [x] ระบุสิ่งที่ต้องตายตัวเพื่อ determinism: การปัดเศษทุกจุด (รวม mod ของค่าติดลบ, ×12/10 และ ×8/10), อัลกอริทึม line of sight ที่ตรงกับ Python sim, ลำดับการกินลูกเต๋า, d20 ไหนที่ Inspiration ใช้ได้ ส่วนอัลกอริทึม PRNG เว้นช่องไว้ระบุตามผล ticket 01
- [x] จุดที่ rules เดิมกำกวมหรือขัดกันแยกเป็นรายการ "ต้องตัดสิน" ไม่เดาเอง
- [x] prototype/rules ระบุว่าเป็นประวัติแบบอ่านอย่างเดียว และ README ของ repo แก้การไหลเป็น rules ฉบับรวม → data → engine
