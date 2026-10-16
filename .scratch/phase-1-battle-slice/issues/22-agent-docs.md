# 22 — เอกสารและ tracker สำหรับหลาย agent

**Owner:** claude

**What to build:** ตาราง ownership และ workflow ใน AGENTS.md (อ่านได้ทั้ง Claude และ Codex), `docs/agents/codex.md` (setup script ของ Codex cloud, คำสั่งตรวจงาน, ขอบเขต, วิธีขอเปลี่ยนสัญญา), บรรทัด `Owner:` ใน ticket ทุกใบ, อัปเดต docs/agents/issue-tracker.md ให้มี Owner, ติดตั้ง `gh` และคู่มือขั้นตอนที่ผู้ใช้ต้องทำ (เชื่อม Codex, `gh auth login`)

**Blocked by:** 21 — CI

**Status:** ready-for-agent

- [ ] AGENTS.md มีตาราง ownership ตรงกับ ADR 0004 และ map ที่ CI ใช้
- [ ] docs/agents/codex.md ใช้ได้จริงบน Codex cloud (setup script, ชื่อ branch, คำสั่ง test)
- [ ] ticket ทุกใบใน .scratch มี `Owner:` และ issue-tracker.md อธิบาย
- [ ] มี ticket งานแรกของ Codex (แตก App.tsx) พร้อมให้หยิบ
