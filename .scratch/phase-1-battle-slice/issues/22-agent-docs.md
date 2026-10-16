# 22 — เอกสารและ tracker สำหรับหลาย agent

**Owner:** claude

**What to build:** ตาราง ownership และ workflow ใน AGENTS.md (อ่านได้ทั้ง Claude และ Codex), `docs/agents/codex.md` (setup script ของ Codex cloud, คำสั่งตรวจงาน, ขอบเขต, วิธีขอเปลี่ยนสัญญา), บรรทัด `Owner:` ใน ticket ทุกใบ, อัปเดต docs/agents/issue-tracker.md ให้มี Owner, ติดตั้ง `gh` และคู่มือขั้นตอนที่ผู้ใช้ต้องทำ (เชื่อม Codex, `gh auth login`)

**Blocked by:** 21 — CI

**Status:** done

- [x] AGENTS.md มีตาราง ownership ตรงกับ ADR 0004 และ map ที่ CI ใช้
- [x] docs/agents/codex.md ใช้ได้จริงบน Codex cloud (setup script, ชื่อ branch, คำสั่ง test)
- [x] ticket ทุกใบใน .scratch มี `Owner:` และ issue-tracker.md อธิบาย
- [x] มี ticket งานแรกของ Codex (แตก App.tsx) พร้อมให้หยิบ

## Comments

- 2026-10-16: ตาราง ownership ใน AGENTS.md เป็นสรุป `.github/ownership.json` คือแหล่งจริง `gh` ติดตั้งแล้ว (`C:\Program Files\GitHub CLI\gh.exe`, login `AJp-QL`) Codex cloud ไม่มี setting prefix ของ branch ในเอกสารทางการ ค่าที่รายงานคือ `codex/…` อยู่แล้ว และ prompt ทุกงานระบุชื่อ branch (docs/agents/codex.md ข้อ 3) ticket งาน Codex: 24 (แตก App.tsx), 25 (test เทียบภาพ), 26 (job CI ของ 25, Owner: claude)
