# tools/claude-hooks

Hook ของ Claude Code สำหรับ repo นี้ (spec `.scratch/claude-automation/spec.md`) ลงทะเบียนใน `.claude/settings.json` รันด้วย `node` ตรงๆ (Node 24 ตัด type เอง) จึงใช้ได้ทั้ง Windows และ Linux

## เก็บอะไร
- `src/bin.ts`: entry `node tools/claude-hooks/src/bin.ts <subcommand>` อ่าน hook JSON จาก stdin
- `src/guard.ts`: subcommand `guard` (PreToolUse บน `Edit|Write|NotebookEdit`)
- `src/engineVersion.ts`: subcommand `engine-version` (Stop)
- `test/`: test แบบ CLI ใน git repo ชั่วคราว ตรวจแค่ exit code และ stderr

## guard
- อ่าน `tool_input.file_path` (หรือ `notebook_path`) และ `cwd`; หา repo root ด้วย `git rev-parse` จาก folder ที่ใกล้ไฟล์ที่สุดที่มีอยู่จริง จึงใช้ได้ใน worktree และกับ path แบบ Windows
- ไฟล์นอก git repo: ผ่าน
- branch ไม่ใช่ `claude/*` (รวม `main`, `codex/*`, detached HEAD): block, ให้ทำงานใน worktree บน ticket branch
- `claude/*`: ตัดสินด้วย `checkPaths` ของ `@mt/path-check` (กติกาเดียวกับ CI) ไฟล์ `codex` block ให้เขียน ticket `Owner: codex`; ไฟล์ที่ยังไม่อยู่ใน `.github/ownership.json` block ให้เพิ่ม glob ก่อน
- exit 0 = ผ่าน, exit 2 = block (เหตุผลอยู่ใน stderr ที่ Claude เห็น)
- อ่าน git หรือ `ownership.json` ไม่ได้ หรือ input ผิดรูป: ผ่านพร้อมคำเตือนใน stderr และ `systemMessage` (fail open) เพราะ guard เป็นตัวช่วย ส่วน CI path check ยังเป็นตัวตัดสินจริง
- hook รัน copy ที่ `${CLAUDE_PROJECT_DIR}` (checkout ที่เปิด session) แต่ตัดสินตาม repo และ branch ของไฟล์ที่แก้ checkout นั้นต้อง `pnpm install` แล้ว ไม่งั้น guard แค่เตือนแล้วปล่อยผ่าน

## engine-version
- Stop hook: ตอน Claude จะจบ turn
- `stop_hook_active: true`: ผ่านเงียบ (เตือนได้ครั้งเดียวต่อการ stop จึงไม่วน) แต่จะเตือนอีกทุก turn ตราบที่เงื่อนไขยังจริง เช่น refactor ที่ไม่ต้อง bump
- ไฟล์ที่เปลี่ยน = `git diff` จาก merge-base ของ `HEAD` กับ `origin/main` (ref ในเครื่อง ไม่ fetch) ถึง working tree รวม staged/unstaged และไฟล์ untracked
- engine source = `packages/engine/src/**` ยกเว้น `*.test.*` และ `*.md`; data = `data/**` ยกเว้น `*.md` (README ไม่ได้เข้า `dataHash`)
- มี engine source หรือ data เปลี่ยน แต่ `packages/engine/src/version.ts` ไม่เปลี่ยน: exit 2 พร้อมข้อความเตือนใน stderr ให้ bump ใน commit เดียวกับ rules change และใส่ ticket `Owner: codex` "refresh visual fixtures and baselines" ถ้าเปลี่ยนแค่ data ข้อความบอกว่า data เปลี่ยน data hash ไม่ต้อง bump เพราะ data อย่างเดียว
- นอก git repo: ผ่านเงียบ; ไม่มี `origin/main` หรืออ่าน git ไม่ได้ หรือ input ผิดรูป: ผ่านพร้อมคำเตือนใน stderr และ `systemMessage` (fail open)
