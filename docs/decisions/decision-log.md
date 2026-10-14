# Decision Log

รูปแบบและกติกาการบันทึกดูที่ README.md ในโฟลเดอร์นี้

| วันที่ | การตัดสินใจ | ที่เลือก | ทางเลือกอื่น | แหล่งที่มา |
|---|---|---|---|---|
| 2026-10-13 | การเดินของเวลา | เวลาเดินทีละสัปดาห์เมื่อผู้เล่นกดจบสัปดาห์ | เวลาเดินแบบ real-time หรือตามจำนวน action | PRD |
| 2026-10-13 | ขนาดทีม | 1 Tamer + มอนสเตอร์ 2 ตัว | ทีมมอนสเตอร์ล้วน หรือจำนวนมอนสเตอร์มากกว่านี้ | PRD |
| 2026-10-13 | สไตล์ภาพ | pixel art 32x32 | ความละเอียดอื่น หรือภาพแบบไม่ใช่ pixel art | PRD |
| 2026-10-13 | monetization | Free + expansion | แบบอื่น (ดูรายละเอียดใน PRD) | PRD |
| 2026-10-13 | ระดับ multiplayer | ระดับ 1: social + share code | PvP หรือ co-op แบบ real-time | PRD |
| 2026-10-13 | กฎ seed | seed ใช้ได้ครั้งเดียวต่อ account | ใช้ seed ซ้ำได้ไม่จำกัด | PRD (F6) |
| 2026-10-13 | ความหมายของ rarity | rarity = ความหลากหลาย ไม่ใช่พลัง | rarity สูงกว่า = stat แข็งกว่า | PRD (F7) |
| 2026-10-13 | การขึ้นดาว | stat ถึงเกณฑ์ + ผ่าน promotion trial | ขึ้นดาวจาก stat อย่างเดียว | PRD (F7) |
| 2026-10-13 | combine | parent ถูกใช้หมด, ผลสุ่ม Inherit หรือ Hybrid (Hybrid 10-15% เมื่อ parent ทั้งคู่ 6 ดาวขึ้นไป) | เก็บ parent ไว้ หรือผลแบบกำหนดตายตัว | PRD (F7) |
| 2026-10-14 | การป้องกัน Tamer | ผู้โจมตีติด disadvantage เมื่อมีมอนสเตอร์ฝ่ายเดียวกันอยู่ติด Tamer; Command ยกเลิกไม่ได้ | ห้ามเล็งจากระยะ 2 ขึ้นไป (rules v2), หรือให้ Command หักล้างได้ (rules v4 ข้อ 5) | rules v3, sim รอบ 4 variant U4 (เปลี่ยนจาก rules v4 ข้อ 5) |
| 2026-10-14 | skill ใน Guardian role pool | Shield Bash (Minor, range 1, push 1) 2d6 แทน Fortify | คง Fortify, หรือ Shield Bash 1d8 (rules v3) | rules v3, v4 |
| 2026-10-14 | ความเสียหาย ranged physical | ระยะ 2 ขึ้นไปบวก SEN mod แทน POW mod | บวก POW mod เหมือน melee | rules v4 |
| 2026-10-14 | จำนวนเป้าของ Burst | สูงสุด 2 ศัตรูในพื้นที่ 3x3 ผู้ใช้เลือกเอง | โดนทุกศัตรูในพื้นที่ | rules v4 |
| 2026-10-14 | โบนัส Defend | Guard และ Ward +2 | +4 (เดิม) | rules v3 |
| 2026-10-14 | การตัดสินเมื่อครบ turn limit | ครบ 10 เทิร์นต่อฝ่าย ฝ่ายที่ทำ damage รวมมากกว่าชนะ (heal ไม่หักลบ), เท่ากัน = เสมอ | เสมอทันที | rules v4 |
| 2026-10-14 | ระดับ skill | Minor / Major (cooldown 2) / Signature | ไม่มีระดับ | rules v1 (Signature ใช้ได้ครั้งเดียวต่อการต่อสู้) |
| 2026-10-14 | HP ของ Tamer | 25 + 4 x (Lv - 1) | 12 + VIT + level (เดิม ล้มเร็วเกินไป) | rules v2, sim รอบ 1 |
| 2026-10-14 | HP ของมอนสเตอร์ | (10 + VIT) x ตัวคูณ ปัดลง + 3 x ดาว | ไม่บวกตามดาว (ทนได้แค่ 2 ถึง 3 ครั้ง) | rules v2, sim รอบ 1 |
| 2026-10-14 | Command | ขยับเพิ่ม +1 ช่อง, ใช้ไม่ได้ในเทิร์นแรกของฝ่าย | +2 ช่อง ใช้ได้ทุกเทิร์น (ทำให้เกิด alpha strike) | rules v2 |
| 2026-10-14 | Flying กับ line of sight | ข้ามได้เฉพาะตอนเป็นผู้โจมตี | ข้ามได้ทั้งตอนโจมตีและตอนถูกโจมตี | rules v2 |
| 2026-10-14 | Counter | เปลี่ยนเป็น Minor | Major cooldown 2 | rules v2 |
| 2026-10-14 | ระยะ Long Shot | 4 ช่อง | 5 ช่อง (คลุมเกือบทั้งกระดาน) | rules v2 |
| 2026-10-14 | เทิร์นแรก | ฝ่ายที่เริ่มก่อนเล่นได้ 2 จาก 3 unit | เล่นได้ครบทุก unit | PRD (F3) |
| 2026-10-14 | Phase 0 gate | ผ่านแบบมีเงื่อนไข: รวมกติกาเป็นฉบับเดียว, engine ต้องได้ผลใกล้ sim v4 (U4), เงื่อนไข "ทางเลือกที่มีความหมาย" ย้ายไปรวมกับ gate phase 1 | ปิด phase 0 ด้วย playtest v4 ก่อน, ผ่านเลยไม่มีเงื่อนไข | grill-with-docs, sim รอบ 4, playtest เกม 1-2 |
| 2026-10-14 | ต้นฉบับของกติกา | repo (rules ฉบับรวม + data/), PRD เหลือ vision/scope | PRD ใน Claude Docs เป็นต้นฉบับ, ซิงก์สองที่ด้วยมือ | ADR 0001 |
| 2026-10-14 | ภาษา engine และ determinism | TypeScript ทั้งระบบ, จำนวนเต็มล้วน, Python sim เป็นตัวอ้างอิง | Python เป็น WASM, ใช้ float | ADR 0002 |
| 2026-10-14 | scope phase 1 slice | ใส่ deployment, Inspiration, status ที่ใช้จริง, Crossroads + 1 board, Scenario 1-2; เลื่อน Tactician mode, loyalty, ไอเทม, Team cost | ทำครบทุกระบบใน F3 | grill-with-docs |
| 2026-10-14 | อุปกรณ์เป้าหมาย phase 1 | input touch + mouse ตั้งแต่แรก, ขัดเกลาบน desktop ก่อน, มือถือแค่เล่นได้ | desktop ก่อนอย่างเดียว, mobile-first | grill-with-docs |
| 2026-10-14 | art ของ phase 1 | placeholder (silhouette ต่อ species + สีตามธาตุ), ระบบ sprite 6 layer เลื่อนไป phase 2 | AI-generated, asset pack, จ้างวาด | grill-with-docs |
| 2026-10-14 | seed registry ใน phase 2 | registry จำลองแบบ local หลัง interface เดียวกัน, ต่อ server จริงก่อนเปิดให้คนนอกเล่น | ย้าย server มา phase 2, ไม่เปลี่ยน roadmap | grill-with-docs (roadmap ขัดกันเรื่อง server) |
| 2026-10-14 | rendering | React เป็นโครง + Phaser วาด Battle ตั้งแต่ phase 1, state อยู่ใน engine | React + Canvas เอง, Phaser อย่างเดียว | ADR 0003 |
| 2026-10-14 | เครื่องมือ monorepo | pnpm workspaces + Vite + Vitest (เวอร์ชันยืนยันด้วย /research ก่อน implement) | npm workspaces, test runner อื่น | grill-with-docs |
| 2026-10-14 | รูปแบบ data/ | JSON ตรวจด้วย schema ใน packages/shared | YAML, ไฟล์ TS | grill-with-docs |
| 2026-10-14 | ที่อยู่ของกติกาฉบับรวม | docs/rules/rules.md ไฟล์เดียว ใช้ git แทนเลขเวอร์ชัน, prototype/rules เป็นประวัติอ่านอย่างเดียว | prototype/rules/v5.md | grill-with-docs, ADR 0001 |
| 2026-10-14 | คู่ต่อสู้ของ playtester | AI (port greedy + heuristic ปกป้อง Tamer, รุมเป้า, deterministic) + Hotseat | AI อย่างเดียว, Hotseat อย่างเดียว | grill-with-docs |
| 2026-10-14 | Replay ใน phase 1 | ทำเลย: action log + Dice Seed, playtester export ไฟล์ได้ | เลื่อนไปทีหลัง | grill-with-docs, PRD acceptance criteria |
| 2026-10-14 | แจกและวัดผล playtest phase 1 | เว็บ static ไม่มี backend, นับสถิติในเครื่องแล้ว export มากับ Replay + แบบฟอร์มสั้น | analytics service | grill-with-docs |
| 2026-10-14 | ภาษา UI | ไทย, คำศัพท์เกมเป็นอังกฤษตาม CONTEXT.md, ข้อความทั้งหมดอยู่ใน string table | อังกฤษล้วน, 2 ภาษาตั้งแต่แรก | grill-with-docs |
| 2026-10-14 | ข้อมูล Unit ใน Scenario | เก็บแบบ Monster จริง (species, ธาตุ, Star, stat, skill) ให้ engine คำนวณค่าที่ได้จากสูตร, ตาราง kit เป็นค่าคาดหวังใน test | เก็บค่าที่คำนวณแล้ว | grill-with-docs |
| 2026-10-14 | ระยะเดินของ Tidewall | ตัดข้อยกเว้นใน kit ใช้สูตรล้วน (เดิน 2 ช่อง) | คงข้อยกเว้นเดิน 3 ช่อง | grill-with-docs (แทนที่ข้อยกเว้นใน Prototype kit) |
| 2026-10-14 | Replay กับการปรับตัวเลข | ฝัง hash ของ data/ + เวอร์ชัน engine, ไม่ตรงแจ้งเตือนไม่แปลง, เปิดของเก่าด้วย git tag | ฝังข้อมูลทั้งชุดใน Replay | grill-with-docs |
| 2026-10-14 | simulator | TS headless ใน tools/ ใช้ engine + AI ตัวเดียวกับเกม, ผลต่างจาก sim v4 ไม่เกิน ±5 pp แล้วเลิกใช้ Python sim | ใช้ Python sim ควบคู่ | grill-with-docs, ADR 0001 |
