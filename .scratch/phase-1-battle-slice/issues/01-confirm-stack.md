# 01 — ยืนยัน stack ด้วย research

**Owner:** claude

**What to build:** เอกสาร research ที่อ้างอิง docs จริงของ pnpm (workspaces), Vite, Vitest, React และ Phaser ระบุเวอร์ชันที่จะใช้ วิธีตั้ง monorepo ตาม dependency ที่กำหนด (shared ← engine ← ai / battle / web, tools ใช้ engine + ai) วิธีฝัง Phaser ใน React โดย state อยู่ใน engine (ADR 0003) และการตั้งค่า pixel art (nearest-neighbor, integer scale) เพื่อให้ ticket 03 ตั้ง workspace ได้โดยไม่เดาเวอร์ชัน ตามกฎ "ยืนยันชื่อ library และเวอร์ชันจาก docs จริงก่อน implement"

**Blocked by:** None — can start immediately

**Status:** done

- [x] ทุก library มีเวอร์ชันที่แนะนำ พร้อมลิงก์ไป docs หรือ release note ต้นฉบับ
- [x] ระบุวิธีตั้ง workspace, คำสั่ง build/test/dev และ TypeScript config ที่ใช้ร่วมกัน
- [x] ระบุวิธี render pixel art ให้คมใน Phaser และวิธีให้ React กับ Phaser คุยกันผ่าน engine เท่านั้น
- [x] ระบุทางเลือก deploy เว็บ static (GitHub Pages หรือ Cloudflare Pages) และวิธีใส่เวอร์ชันหรือ git tag ใน build
- [x] เสนอ PRNG แบบจำนวนเต็มที่มีสเปกชัด 1–2 ตัวเป็นตัวเลือกให้ ticket 02
