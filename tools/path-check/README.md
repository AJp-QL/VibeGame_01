# tools/path-check

ตัวตรวจ path ตามเจ้าของ (ADR 0004, decision log 2026-10-16) ที่ CI รันใน job `path-check` ของ `.github/workflows/ci.yml`

## เก็บอะไร
- `src/index.ts`: `checkPaths(map, branch, files)` ตัดสินว่า branch นี้แก้ไฟล์เหล่านี้ได้ไหม และ `loadOwnership()` อ่าน map
- `src/bin.ts`: entry ของ CI `node tools/path-check/src/bin.ts --branch <ชื่อ branch> --base origin/main` diff `<base>...HEAD` (นับจาก merge base, rename แยกเป็นลบ + เพิ่มเพื่อตรวจทั้งสอง path)
- `test/`: test ของตัวตรวจ และ test ว่าทุกไฟล์ที่ git track อยู่ใน map พอดี 1 หมวด

## ที่มาของ ownership
map มีที่เดียวคือ `.github/ownership.json` (AGENTS.md อ้างไฟล์นี้) 4 หมวด:
- `shared`: ทั้งสองฝั่งแก้ได้ (`.scratch/**`, `pnpm-lock.yaml`)
- `claudeOnly`: config ที่ root, `AGENTS.md`, `CONTEXT.md`, `.github/`, `docs/decisions` และเอกสารกลางอื่นๆ
- `claude`: shared, engine, ai, session, server, tools/, data/, docs/rules, docs/balance
- `codex`: battle, web (รวม `wrangler.jsonc`), art/

`package.json` ของแต่ละ package อยู่ในหมวดของเจ้าของ package นั้น (`packages/<ชื่อ>/**`)

## กฎ
- `main` และ tag: ข้าม
- `claude/*`: แก้ได้ `claude` + `claudeOnly` + `shared`
- `codex/*`: แก้ได้ `codex` + `shared`
- branch ชื่ออื่น: ไม่ผ่าน
- ไฟล์ที่ไม่ตรง glob ใดเลย: ไม่ผ่าน (path ใหม่ที่ root ต้องเพิ่มใน map ก่อน ซึ่งเป็นงานของ Claude)

ลองในเครื่อง: `node tools/path-check/src/bin.ts --branch "$(git branch --show-current)"`
