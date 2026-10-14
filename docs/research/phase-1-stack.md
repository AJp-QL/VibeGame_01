# Phase 1 stack: research

ตรวจเมื่อ 2026-10-15 สำหรับ ticket `.scratch/phase-1-battle-slice/issues/01-confirm-stack.md`
เวอร์ชันทุกตัวดึงจาก npm registry (`https://registry.npmjs.org/<pkg>`: ดู `dist-tags` และ `time`) แล้วเทียบกับ release note หรือ docs ของผู้พัฒนาเอง
กฎที่ใช้เลือก: stable ล่าสุดที่ออกมาแล้วอย่างน้อยราว 2 สัปดาห์ ยกเว้นกรณีที่ระบุเหตุผลไว้

## Recommendation

| ส่วน | เวอร์ชันที่แนะนำ | วันออก | หมายเหตุ |
|---|---|---|---|
| Node.js | **24.21.0** (LTS "Krypton") | 2026-09-08 | ผ่านเงื่อนไข engines ของ Vite 8 และ Vitest 5 ([release](https://github.com/nodejs/node/releases/tag/v24.21.0)) |
| pnpm | **12.11.2** (`latest` dist-tag) | 2026-10-09 | **ข้อยกเว้นกฎ 2 สัปดาห์**: 12.9.0 และ 12.10.0 มี security fix ตัวสำรองคือ 12.8.2 (2026-09-30) |
| TypeScript | **7.0.2** | 2026-07-08 | compiler ตัวใหม่ที่เขียนด้วย Go และยังไม่มี JS API ถ้าจะใช้ typescript-eslint ให้ alias 6.0 ไว้คู่กัน (ดู §1) |
| Vite | **8.3.2** | 2026-10-01 | ใช้ Rolldown และ Oxc ([Vite 8](https://vite.dev/blog/announcing-vite8)) |
| @vitejs/plugin-react | **6.1.1** | 2026-08-28 | peer `vite ^8.0.0` |
| Vitest (+ @vitest/coverage-v8) | **5.0.3** | 2026-09-30 | coverage-v8 ต้องเป็นเวอร์ชันเดียวกับ vitest เป๊ะ |
| React + react-dom | **19.3.0** | 2026-09-09 | react-dom มี peer `react ^19.3.0` ([release](https://github.com/facebook/react/releases/tag/v19.3.0)) |
| @types/react, @types/react-dom | **19.3.0** | 2026-09-09 | @types/react-dom มี peer `@types/react ^19.3.0` |
| @types/node | **^24.19.0** | 2026-09-25 | ใช้กับ tools/simulator และ config เท่านั้น |
| Phaser | **4.2.1** | 2026-07-09 | มี types และ ESM build มาในแพ็กเกจ ([release](https://github.com/phaserjs/phaser/releases/tag/v4.2.1)) |
| PRNG | **xoshiro128\*\*** (seed ผ่าน SplitMix64) | — | ตัวสำรอง: PCG32 (ดู §6) |

**Setup โดยย่อ**
- pnpm workspace: `packages/*` + `tools/*`, ใช้ `workspace:*` ระหว่าง package, ล็อกเวอร์ชันร่วมใน `catalog:` และตั้ง `minimumReleaseAge: 20160` (14 วัน) เพื่อบังคับกฎ 2 สัปดาห์ตอน install
- TypeScript: มี `tsconfig.base.json` ตัวเดียว ทุก package `extends` ไปใช้ ตรวจ type ด้วย **project references** (`tsc -b` ที่ root) **ไม่ใช้ path aliases** และ `exports` ของแต่ละ package ชี้ไปที่ `src/index.ts` ตรงๆ (internal package ไม่มี build step)
- Vitest: มี `vitest.config.ts` ตัวเดียวที่ root ใช้ `test.projects: ['packages/*', 'tools/*']`
- React กับ Phaser: React mount `Phaser.Game` ภายใน component ทั้งสองฝั่งอ่าน state จาก session store ตัวเดียวกันที่ห่อ engine ไว้ และส่ง action กลับเข้า store ไม่มีฝั่งไหนเก็บ state ของเกมเอง
- Pixel art: `pixelArt: true` + `scale.mode: NONE` + `zoom: Phaser.Scale.Zoom.MAX_ZOOM` และเรียก `setMaxZoom()` ทุกครั้งที่ parent เปลี่ยนขนาด
- Deploy: GitHub Pages ผ่าน GitHub Actions (`base: '/VibeGame_01/'`) และใส่เวอร์ชันด้วย Vite `define` (`__APP_VERSION__`) ที่ได้จาก `git describe` หรือจาก tag ที่ trigger build

---

## 1. เวอร์ชันและ peer constraint

### Node.js
- Node 24 "Krypton" อยู่ในสถานะ LTS ตามหน้า [Previous Releases](https://nodejs.org/en/about/previous-releases) และ [schedule.json](https://raw.githubusercontent.com/nodejs/Release/main/schedule.json) ระบุว่าเข้า maintenance วันที่ 2026-10-20 และหมดอายุ 2028-04-30
- Node 26 จะเป็น LTS วันที่ **2026-10-28** (schedule.json) วันนี้ยังเป็น "Current" ซึ่งหน้า Previous Releases บอกว่า production ควรใช้แค่ Active LTS หรือ Maintenance LTS จึงเลือก 24 ไปก่อน แล้วค่อยย้ายไป 26 ภายหลัง (ดู Open questions)
- Engines ที่ต้องผ่าน: Vite 8 ต้องการ `^20.19.0 || >=22.12.0` ([Vite 8 blog → Node.js Support](https://vite.dev/blog/announcing-vite8)) ส่วน Vitest 5 ต้องการ `^22.12.0 || ^24.0.0 || >=26.0.0` (ฟิลด์ `engines` ของ npm `vitest@5.0.2`, ตรงกับ [Vitest 5 blog → Breaking Changes](https://vitest.dev/blog/vitest-5) ที่เขียนว่า "Node.js >= 22.12.0")

### pnpm
- pnpm 12 เป็น stable และเป็นการเขียนใหม่ด้วย Rust ที่ "keeps the commands, flags, settings, and lockfile format of pnpm 11" ([pnpm 12.0](https://pnpm.io/blog/releases/12.0), [What's different in pnpm 12](https://pnpm.io/blog/whats-different-in-pnpm-12)) blog ตอนออก 12.0 เขียนว่า `latest` ยังชี้ไปที่ 11 แต่ ณ วันนี้ registry ชี้ `latest` = 12.11.2 แล้ว
- เหตุที่ยกเว้นกฎ 2 สัปดาห์: [v12.9.0](https://github.com/pnpm/pnpm/releases/tag/v12.9.0) แก้ปัญหา `pnpm login` ส่ง credential ข้าม origin และ [v12.10.0](https://github.com/pnpm/pnpm/releases/tag/v12.10.0) แก้ path traversal ที่ทำให้ dependency เขียนไฟล์ออกนอก global virtual store ได้ ตัวที่ผ่านกฎ 2 สัปดาห์คือ [12.8.2](https://github.com/pnpm/pnpm/releases/tag/v12.8.2) ซึ่งยังไม่มี fix ทั้งสองข้อ
- ข้อที่ต้องระวังใน pnpm 12: ถ้า project pin เวอร์ชัน pnpm ไว้ การเขียน key ใน `pnpm-workspace.yaml` ผิดจะทำให้คำสั่ง fail ด้วย `ERR_PNPM_UNRECOGNIZED_WORKSPACE_SETTINGS` และ `--frozen-lockfile false` ใช้ไม่ได้แล้ว ([pnpm 12.0 → Breaking changes](https://pnpm.io/blog/releases/12.0))
- ตั้ง `"packageManager": "pnpm@12.11.2"` ใน root `package.json` ไว้ ซึ่งทั้ง `pnpm self-update` ([Installation](https://pnpm.io/installation)) และ action `pnpm/setup` อ่านค่านี้

### TypeScript
- 7.0 คือ native port ที่เขียนด้วย Go ประกาศเมื่อ 2026-07-08 ([Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)) ติดตั้งจากแพ็กเกจ `typescript` ตัวเดิมและได้ `tsc` มา
- **ยังไม่มี programmatic API** (ทีม TS คาดว่า API ใหม่จะมาใน 7.1) เครื่องมือที่ต้อง import `typescript` อย่าง typescript-eslint ต้องใช้แพ็กเกจ `@typescript/typescript6` ผ่าน npm alias โดยตั้ง `"typescript": "npm:@typescript/typescript6@^6.0.2"` คู่กับ `"@typescript/native": "npm:typescript@^7.0.2"` (อยู่ในบทความเดียวกัน หัวข้อ Running Side-by-Side) phase 1 ยังไม่มี ESLint จึงใช้ 7.0.2 ตรงๆ ได้
- default ใหม่ที่ส่งผลกับ repo นี้ (มีมาตั้งแต่ 6.0 และ 7.0 ใช้ต่อ): `strict: true`, `module: esnext`, **`types: []`** (ฝั่ง web ต้องใส่ `"types": ["vite/client"]` เอง ส่วน tools ใส่ `["node"]`), **`rootDir: ./`** (ต้องระบุ `rootDir` เองถ้า source อยู่ในโฟลเดอร์ย่อย) ส่วน **`baseUrl`, `moduleResolution: node/node10/classic`, `target: es5` กลายเป็น hard error** (อ้างอิงเดียวกัน หัวข้อ "Updates Since 5.x")
- `tsc --build` ของ 7.0 build หลาย project พร้อมกันได้ (flag `--builders`) ซึ่งช่วย monorepo (อ้างอิงเดียวกัน หัวข้อ "Project Reference Builder Parallelization")
- Vite ไม่ใช้ `tsc` ตอน build เพราะ "Vite only performs transpilation on .ts files and does NOT perform type checking" ([Vite Features → TypeScript](https://vite.dev/guide/features)) เวอร์ชันของ TS จึงไม่ผูกกับ Vite หรือ Vitest เลย

### Vite, plugin-react, Vitest
- Vite 8 (2026-03-12) ใช้ Rolldown เป็น bundler ตัวเดียวและใช้ Oxc เป็น compiler ([Announcing Vite 8](https://vite.dev/blog/announcing-vite8)) ไลน์ 8.3 ล่าสุดคือ 8.3.4 (2026-10-08) แต่ release note ของ 8.3.2–8.3.4 ไม่มีรายการ security ([releases](https://github.com/vitejs/vite/releases)) จึงเลือก 8.3.2
- `@vitejs/plugin-react` v6 ใช้ Oxc ทำ React Refresh และไม่พึ่ง Babel แล้ว ส่วน v5 ก็ยังใช้กับ Vite 8 ได้ (Vite 8 blog) peer ของ 6.1.1 คือ `vite ^8.0.0`
- Vitest 5.0 ออก 2026-09-03 ([Vitest 5 blog](https://vitest.dev/blog/vitest-5)) ต้องใช้ Vite >= 6.4.0 (peer `vite ^6.4.0 || ^7.0.0 || ^8.0.0`) และเปิด `clearMocks` เป็น default แล้ว peer ของ `@vitest/coverage-v8@5.0.x` คือ `vitest` เวอร์ชันเดียวกันเป๊ะ

### React และ Phaser
- React 19.3.0 ออก 2026-09-09 ([GitHub release](https://github.com/facebook/react/releases/tag/v19.3.0)) react-dom มี peer `react ^19.3.0` จึงต้องอัปเดตคู่กันเสมอ
- Phaser 4.2.1 ออก 2026-07-09 ([release](https://github.com/phaserjs/phaser/releases/tag/v4.2.1)) และแก้ "ScaleManager not resizing to parent container" ซึ่งเกี่ยวกับ §4 โดยตรง แพ็กเกจมี `exports` → `types: ./types/phaser.d.ts`, `import: ./dist/phaser.esm.js` (npm `phaser@4.2.1`) จึงไม่ต้องลง `@types` เพิ่ม และไม่มี peer dependency
- template ทางการ [phaserjs/template-react-ts](https://github.com/phaserjs/template-react-ts) ยังใช้ `phaser 4.0.0`, Vite 6, TS 5.7 และ plugin-react 4 ใช้ดูเป็น pattern ได้ แต่อย่าลอกเวอร์ชันมา

## 2. Monorepo ด้วย pnpm workspaces

### โครงสร้าง
```
pnpm-workspace.yaml
package.json            # root: scripts, packageManager, devDependencies ที่ใช้ร่วมกัน
tsconfig.base.json      # compilerOptions ที่ใช้ร่วมกัน
tsconfig.json           # solution file: files: [] + references ไปทุก package
vitest.config.ts        # test.projects
packages/{shared,engine,ai,battle,web}/   # server/ ยังไม่แตะใน phase 1
tools/simulator/
```

`pnpm-workspace.yaml` (workspace ต้องมีไฟล์นี้ที่ root ตาม [Workspace](https://pnpm.io/workspaces) ส่วน catalog ดู [Catalogs](https://pnpm.io/catalogs))
```yaml
packages:
  - packages/*
  - tools/*
minimumReleaseAge: 20160   # นาที = 14 วัน (https://pnpm.io/settings/dependency-resolution#minimumreleaseage)
catalog:
  typescript: 7.0.2
  vite: ^8.3.2
  vitest: ^5.0.3
  "@vitest/coverage-v8": ^5.0.3
  react: ^19.3.0
  react-dom: ^19.3.0
  phaser: 4.2.1
```
- `minimumReleaseAge` "applies to all dependencies, including transitive ones" โดย pnpm 11 ขึ้นไปมี default อยู่ที่ 1440 นาที ([settings → minimumReleaseAge](https://pnpm.io/settings/dependency-resolution#minimumreleaseage)) ถ้าตั้งเป็น 20160 กฎ 2 สัปดาห์ก็ถูกบังคับอัตโนมัติ
- อ้างอิงกันระหว่าง package ด้วย `"@mt/engine": "workspace:*"` ถ้าใช้ `workspace:` แล้ว pnpm "will refuse to resolve to anything other than a local workspace package" ([Workspace protocol](https://pnpm.io/workspaces))
- ทิศทาง dependency คุมด้วย `dependencies` ของแต่ละ package: `shared` ไม่มี workspace dep, `engine` → shared, `ai` → engine + shared, `battle` → engine + shared + phaser, `web` → battle + ai + engine + shared + react, `tools/simulator` → engine + ai + shared node_modules แบบ isolated ของ pnpm ทำให้ import package ที่ไม่ได้ประกาศไว้ไม่ resolve (ตรงนี้ควรเขียน test ยืนยันใน ticket 03 ดู Open questions)

### แต่ละ package (internal package, ไม่มี build step)
```json
{
  "name": "@mt/engine",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "dependencies": { "@mt/shared": "workspace:*" },
  "devDependencies": { "typescript": "catalog:", "vitest": "catalog:" }
}
```
- Vite ถือว่า linked dep ใน monorepo เป็น source code ("treats the linked dep as source code. It will not attempt to bundle the linked dep") ตราบใดที่เป็น ESM ([Dependency Pre-Bundling → Monorepos and Linked Dependencies](https://vite.dev/guide/dep-pre-bundling)) การชี้ `exports` ไปที่ `.ts` จึงใช้ได้ทั้งใน Vite dev, build และ Vitest

### TypeScript config ที่ใช้ร่วมกัน: แนะนำ project references
`tsconfig.base.json` (ร่าง)
```jsonc
{
  "compilerOptions": {
    "target": "es2023",
    "module": "esnext",
    "moduleResolution": "bundler",
    "isolatedModules": true,            // Vite ต้องการ (Oxc transpile ทีละไฟล์)
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,         // ห้าม enum/namespace → Node รัน .ts ได้ตรงๆ
    "allowImportingTsExtensions": true, // ใช้ร่วมกับ emitDeclarationOnly ได้
    "noUncheckedIndexedAccess": true,
    "composite": true,
    "emitDeclarationOnly": true,
    "outDir": ".tsbuild",              // gitignore
    "rootDir": "src",
    "types": []
  }
}
```
root `tsconfig.json`: `{ "files": [], "references": [{ "path": "packages/shared" }, { "path": "packages/engine" }, ...] }` ส่วนแต่ละ package ใส่ `extends` + `references` ไปหา package ที่ตัวเองพึ่ง

ทำไมเลือก project references:
- `tsc -b` "Find all referenced projects / Detect if they are up-to-date / Build out-of-date projects in the correct order" และการ import จาก referenced project จะโหลด `.d.ts` ของ project นั้น ([Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)) type-check จึงเป็นราย package และ incremental
- `composite` บังคับว่า "All implementation files must be matched by an include pattern" (อ้างอิงเดียวกัน) ถ้า import ไฟล์ของ package อื่นที่ไม่ได้ reference ไว้ `tsc` จะแจ้งออกมา เป็นด่านที่สองที่กันการผิดทิศทาง dependency
- ทำไมไม่ใช้ path aliases: TS 7 เลิกรองรับ `baseUrl` แล้ว, `paths` "does not change the import path in the code emitted" ([Modules reference → paths](https://www.typescriptlang.org/docs/handbook/modules/reference.html)) ทำให้ต้องตั้ง alias ซ้ำใน Vite (`resolve.tsconfigPaths` ของ Vite 8 ไม่ได้เปิดเป็น default ตาม Vite 8 blog) และ Node type stripping ไม่แปลง `paths` ([Node TypeScript → Paths aliases](https://nodejs.org/docs/latest-v24.x/api/typescript.html)) นอกจากนี้ alias ยังข้ามการคุม dependency ของ pnpm ไปด้วย
- `erasableSyntaxOnly` + `allowImportingTsExtensions` (เขียน `import './dice.ts'`): Node 24 รัน `.ts` ที่มีแต่ erasable syntax ได้เลยโดยไม่ต้อง flag แต่ "file extensions are mandatory in import statements" ([Node TypeScript](https://nodejs.org/docs/latest-v24.x/api/typescript.html)) และ `allowImportingTsExtensions` "is only allowed when --noEmit or --emitDeclarationOnly is enabled" ([TSConfig reference](https://www.typescriptlang.org/tsconfig/#allowImportingTsExtensions)) ข้อดีคือ simulator และการตรวจ Rarity Roll หรือ replay ฝั่ง server (ADR 0002) รัน engine ด้วย `node` ได้โดยไม่ต้องลง tsx ข้อควรระวังคือ Node "refuses to handle TypeScript files inside folders under a node_modules path" จึงต้องตรวจว่า pnpm symlink resolve ไปเป็น realpath นอก node_modules จริง (ดู Open questions)
- ฝั่ง web ใช้ `"types": ["vite/client"]` ตาม [Vite Features → Client Types](https://vite.dev/guide/features)

### Root scripts
```json
{
  "scripts": {
    "dev": "pnpm --filter @mt/web dev",
    "build": "tsc -b && pnpm --filter @mt/web build",
    "typecheck": "tsc -b",
    "test": "vitest run",
    "test:watch": "vitest",
    "sim": "pnpm --filter @mt/simulator start"
  }
}
```
- `pnpm -r run` และ `pnpm test -r` รันตาม topological order ("dependencies run before their dependents") ([pnpm -r](https://pnpm.io/cli/recursive)) ส่วน `--filter <pkg>...` จะรวม dependency ของ package นั้นเข้ามาด้วย ([Filtering](https://pnpm.io/filtering))

### Vitest ข้าม package
```ts
// vitest.config.ts (root)
import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { projects: ['packages/*', 'tools/*'] } })
```
- `test.workspace` ถูก deprecate ตั้งแต่ 3.2 และให้ใช้ `projects` แทน Vitest "will treat every folder in packages as a separate project even if it doesn't have a config file inside" ([Projects](https://vitest.dev/guide/projects))
- ใน Vitest 5 inline project จะ inherit root config เป็น default (`extends: true`), config ที่ถูก reference มี `projects` ซ้อนได้ และกรองด้วย `vitest -p engine` ได้ project ที่ไม่ได้เปลี่ยน Vite config จะใช้ Vite server ร่วมกัน ([Vitest 5 blog](https://vitest.dev/blog/vitest-5))
- ถ้า web ต้องมี test ที่ใช้ DOM ให้ใส่ `vitest.config.ts` ใน `packages/web` เพื่อตั้ง environment แยก ส่วน engine ใช้ environment `node` ตาม default

## 3. ฝัง Phaser ใน React (ADR 0003)

### Pattern จาก template ทางการ
- [template-react-ts](https://github.com/phaserjs/template-react-ts) ใช้ `PhaserGame.tsx` "is the bridge between React and Phaser" สร้าง `Phaser.Game` ใน `useLayoutEffect` และเรียก `game.destroy(true)` ใน cleanup โดยส่ง game และ scene ออกมาผ่าน `forwardRef` แล้วคุยกันผ่าน `EventBus` (`new Phaser.Events.EventEmitter()`) ([src/PhaserGame.tsx](https://github.com/phaserjs/template-react-ts/blob/main/src/PhaserGame.tsx), [src/game/EventBus.ts](https://github.com/phaserjs/template-react-ts/blob/main/src/game/EventBus.ts))
- EventBus ของ template รับ string event ที่ไม่มี type และไม่มีที่เก็บ state กลาง ถ้าใช้ EventBus เป็นช่องทางหลัก state จะไปตกค้างที่ React หรือ Phaser ซึ่งขัดกับ ADR 0003 จึงเอามาแค่ส่วน mount/unmount

### Pattern ที่แนะนำ: session store ตัวเดียวห่อ engine
```
            ┌──────────── BattleSession (web) ────────────┐
React HUD ──┤ getSnapshot() → { state, lastEvents, ui }    ├── Phaser BattleScene (battle)
  dispatch ─┤ dispatch(action) → engine.applyAction(...)   ├─ dispatch (จาก tap บนช่อง)
            │ subscribe(listener)                          │
            └──────────────────────────────────────────────┘
```
- engine เป็น pure function: `applyAction(state, action) → { state, events } | rejection` (ตาม spec "Interface ของ engine") ส่วน `BattleSession` เป็น object บางๆ ใน web ที่ถือ state ปัจจุบันของ engine กับรายการเหตุการณ์ล่าสุด และไม่มี logic กติกาของตัวเอง
- **React** อ่านผ่าน `useSyncExternalStore(subscribe, getSnapshot)` ซึ่งเป็น hook "that lets you subscribe to an external store" ([useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)) `getSnapshot` ต้องคืน object เดิมถ้า state ไม่เปลี่ยน ซึ่งทำได้ง่ายเพราะ engine คืน state ใหม่ทุกครั้งที่มี action
- **Phaser** (package battle) รับ session ผ่าน `scene.init(data)` หรือ constructor แล้ว `subscribe` ไว้ เมื่อมี `events` ใหม่ก็เล่น animation ตามลำดับ (Move, ทอย, damage, ...) จากรายการเหตุการณ์ของ engine เท่านั้น ตาม spec ที่บอกว่า UI และ log สร้างจากรายการเหตุการณ์นี้
- **ทิศทาง dependency**: battle ห้าม import web ดังนั้น battle ต้องประกาศ interface ที่ตัวเองต้องการ (`{ getSnapshot, subscribe, dispatch }`) ไว้เอง แล้ว web ส่ง implementation เข้ามา
- UI state ที่ไม่ใช่ state ของเกม (Unit ที่เลือกอยู่, ช่องเป้าหมาย, ผล preview ที่แสดงอยู่) เก็บใน session ส่วน `ui` เพื่อให้ทั้ง React และ Phaser เห็นตรงกัน preview มาจาก engine (preview action) เสมอ
- ลำดับ input ตาม spec: tap Unit (Phaser) → `dispatch({type:'select'})` เข้า session.ui → React แสดง preview → กดยืนยัน (React หรือ Phaser) → `dispatch(action)` เข้า engine

### StrictMode และ double-mount
- ใน dev, StrictMode "will also run one extra setup+cleanup cycle in development for every Effect" ([StrictMode](https://react.dev/reference/react/StrictMode)) component ที่สร้าง Phaser จึงถูก mount → unmount → mount ทันที
- `Phaser.Game#destroy` "Flags this Game instance as needing to be destroyed on the _next frame_, making this an asynchronous operation" ([src/core/Game.js@v4.2.1](https://github.com/phaserjs/phaser/blob/v4.2.1/src/core/Game.js)) ระหว่างรอบนั้นจะมี Game สองตัวและ canvas สองอันอยู่ชั่วครู่ วิธีจัดการ:
  - ทำแบบ template: เก็บ instance ใน `useRef` แล้ว `destroy(true)` ใน cleanup จากนั้นตั้ง ref เป็น `null` (`removeCanvas = true` จะลบ canvas เก่าออกเมื่อ destroy เสร็จ)
  - **ห้ามใช้ `noReturn = true`** เพราะ "You cannot create another instance of Phaser on the same web page if you do this" (doc ของ `destroy` ไฟล์เดียวกัน)
  - unsubscribe จาก session ใน `scene.events.once('shutdown'/'destroy')` เพื่อไม่ให้ scene เก่ายังรับ event ค้างอยู่
  - template เองเปิด `<React.StrictMode>` ไว้ใน `main.tsx` ([src/main.tsx](https://github.com/phaserjs/template-react-ts/blob/main/src/main.tsx)) จึงไม่จำเป็นต้องปิด StrictMode

## 4. Pixel art ให้คมใน Phaser 4

```ts
new Phaser.Game({
  type: Phaser.AUTO,
  parent: containerEl,
  width: 224, height: 224,            // Board 7x7 × tile 32
  pixelArt: true,                     // = antialias false + roundPixels true
  scale: { mode: Phaser.Scale.NONE, zoom: Phaser.Scale.Zoom.MAX_ZOOM },
  scene: [BattleScene],
});
// เมื่อ parent เปลี่ยนขนาด (ResizeObserver ฝั่ง React): game.scale.setMaxZoom()
```
- `pixelArt`: "Sets `antialias` to false and `roundPixels` to true. This is the best setting for pixel-art games." ส่วน `antialias: false` ทำให้ "WebGL uses nearest-neighbor interpolation" และ "disables antialiasing of the game canvas itself ... when the game canvas is scaled" (doc ใน [types/phaser.d.ts@4.2.1](https://unpkg.com/phaser@4.2.1/types/phaser.d.ts)) ใน source เมื่อ `!antialias` จะเรียก `CanvasInterpolation.setCrisp(canvas)` ซึ่งตั้ง CSS `image-rendering` ให้ scale แบบ nearest-neighbor ([src/core/CreateRenderer.js](https://github.com/phaserjs/phaser/blob/v4.2.1/src/core/CreateRenderer.js), [CanvasInterpolation.js](https://github.com/phaserjs/phaser/blob/v4.2.1/src/display/canvas/CanvasInterpolation.js))
- **เปลี่ยนจาก v3**: `roundPixels` มี default เป็น `false` แล้ว (v3 เป็น `true`) และทำงานเฉพาะ object ที่ "axis-aligned and unscaled" ([MIGRATION-GUIDE v4](https://github.com/phaserjs/phaser/blob/v4.2.1/changelog/v4/4.0/MIGRATION-GUIDE.md)) จึงต้องตั้ง `pixelArt: true` เองให้ชัด และ sprite ควรวางที่พิกัดจำนวนเต็มโดยไม่ scale ราย sprite ถ้าอยากให้ pixel art หมุนหรือ scale ได้นุ่มก็มี `smoothPixelArt` (WebGL เท่านั้น) แต่ phase 1 ไม่ต้องใช้
- **Integer scale**: Phaser ไม่มี scale mode แบบ "integer" แยก แต่ `Phaser.Scale.Zoom.MAX_ZOOM` "Calculate[s] the zoom value based on the maximum multiplied game size that will fit into the parent" โดย source คือ `Math.max(Math.min(floor(parentW/gameW), floor(parentH/gameH)), 1)` ([ScaleManager.js `getMaxZoom`](https://github.com/phaserjs/phaser/blob/v4.2.1/src/scale/ScaleManager.js)) ค่าที่ได้จึงเป็นจำนวนเต็ม ≥ 1 เสมอ ส่วน mode `NONE` คือ "No scaling happens at all" นอกจาก zoom (ใช้ `FIT`/`EXPAND` ไม่ได้เพราะ scale ไม่เป็นจำนวนเต็ม)
- MAX_ZOOM คำนวณครั้งเดียวตอน boot เท่านั้น ถ้าขนาดเปลี่ยนต้องเรียก `setMaxZoom()` ซึ่ง "Sets the zoom to be the maximum possible based on the _current_ parent size" (ไฟล์เดียวกัน)
- **224 px บนจอ 360 px**: `floor(360/224) = 1` → ×1 ตาม spec ส่วน HUD ของ React ใช้ที่เหลือ 136 px หรือวางไว้ใต้ Board ก็ได้ บน desktop ถ้า parent กว้าง 700×500 จะได้ ×2 (448 px) แต่ต้องให้ parent มีความสูงชัดเจน เพราะ zoom ใช้ค่าที่น้อยกว่าระหว่างแนวกว้างกับแนวสูง
- **Touch + mouse ไม่พึ่ง hover**: "A Pointer object encapsulates both mouse and touch input within Phaser" ([src/input/Pointer.js](https://github.com/phaserjs/phaser/blob/v4.2.1/src/input/Pointer.js)) ใช้เฉพาะ `pointerdown`/`pointerup` บนช่องหรือ Unit (`setInteractive()`) และไม่ผูก logic ไว้กับ `pointerover`/`pointerout` ฝั่ง React ใช้ `onClick` ของปุ่มตามปกติ โดยการ "ยืนยัน" ต้องเป็นการกดครั้งที่สองเสมอ

## 5. Deploy เว็บ static และใส่เวอร์ชัน

### GitHub Pages (แนะนำ)
- repo อยู่ที่ `github.com/AJp-QL/VibeGame_01` จึงเป็น project site ต้องตั้ง `base: '/VibeGame_01/'` ("If you are deploying to `https://<USERNAME>.github.io/<REPO>/` ... set base to `'/<REPO>/'`") และตั้ง Settings → Pages → Source = **GitHub Actions** ([Vite: Deploying a Static Site → GitHub Pages](https://vite.dev/guide/static-deploy)) ค่า `base` อ่านได้ในโค้ดผ่าน `import.meta.env.BASE_URL` ([Env Variables and Modes](https://vite.dev/guide/env-and-mode))
- workflow ตัวอย่างของ Vite ใช้ `actions/checkout` v7, `actions/configure-pages` v6, `actions/upload-pages-artifact` v5 (path `./dist`) และ `actions/deploy-pages` v5 พร้อม permission `pages: write`, `id-token: write` (หน้าเดียวกัน ซึ่ง pin SHA ไว้ให้) ส่วนที่ต้องเปลี่ยนสำหรับ pnpm:
  - ใช้ [`pnpm/setup@v3`](https://github.com/pnpm/setup) แทน setup-node + npm ci ตัวนี้อ่าน `packageManager` แล้วติดตั้ง Node จาก `devEngines.runtime` หรือ `.node-version` และรัน `pnpm install` ให้อัตโนมัติ ตั้ง `cache: true` เพื่อ cache store ได้ (ส่วน [`pnpm/action-setup`](https://github.com/pnpm/action-setup) README ก็แนะนำให้ย้ายมาตัวนี้)
  - upload path เป็น `./packages/web/dist`
- trigger: `on: push: tags: ['v*']` (deploy เฉพาะ build ที่มี tag ตาม spec "ทุก build ที่ deploy ติด git tag") บวก `workflow_dispatch`

### Cloudflare (ทางเลือก)
- Cloudflare Pages เชื่อมกับ Git ได้ ตั้ง build command และ output dir เอง และ "all subsequent pushes to branches will generate Preview Deployments" ([Vite static deploy → Cloudflare Pages](https://vite.dev/guide/static-deploy)) ตาราง preset ของ React (Vite) คือ `npm run build` → `dist` ([Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)) และมี env `CF_PAGES_COMMIT_SHA` / `CF_PAGES_BRANCH` ให้ใช้ตอน build
- แต่ docs ของ Cloudflare เองเขียนว่า "Workers supports most Pages use cases ... Start new projects with Workers" ([Pages framework guides](https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/)) ถ้าไป Cloudflare ควรใช้ Workers static assets กับ `not_found_handling = "single-page-application"` ([Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)) และ `@cloudflare/vite-plugin` + `wrangler deploy` (Vite static deploy) ข้อดีคือได้ `base: '/'` และ preview ต่อ branch แต่ต้องมี account และ token ของ Cloudflare เพิ่มมา
- **ข้อสรุป**: phase 1 ไม่มี backend และ repo อยู่บน GitHub อยู่แล้ว GitHub Pages จึงมีส่วนที่ต้องดูแลน้อยที่สุด

### ใส่เวอร์ชัน / git tag ลง build
```ts
// packages/web/vite.config.ts
import { execSync } from 'node:child_process'
const version = process.env.APP_VERSION
  ?? execSync('git describe --tags --always --dirty').toString().trim()
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  define: { __APP_VERSION__: JSON.stringify(version) },
})
// src/vite-env.d.ts
declare const __APP_VERSION__: string
```
- `define` "Entries will be defined as globals during dev and statically replaced during build" ค่าต้อง serialize เป็น JSON ได้ และฝั่ง TS ให้ประกาศ `declare const __APP_VERSION__: string` ใน `vite-env.d.ts` ([Shared options → define](https://vite.dev/config/shared-options)) อีกทางคือใช้ env `VITE_APP_VERSION` ที่จะโผล่เป็น `import.meta.env.VITE_APP_VERSION` ([Env Variables](https://vite.dev/guide/env-and-mode)) แต่ `define` ไม่ต้องพึ่งไฟล์ `.env`
- ใน CI ตั้ง `APP_VERSION: ${{ github.ref_name }}` ไว้ เพราะ `GITHUB_REF_NAME` คือ "The short ref name of the branch or tag that triggered the workflow run" ([Variables reference](https://docs.github.com/en/actions/reference/workflows-and-actions/variables))
- ถ้าจะใช้ `git describe` ("finds the most recent tag that is reachable from a commit", `--always` คือ fallback เป็น hash ([git-describe](https://git-scm.com/docs/git-describe))) ใน CI ต้อง checkout ด้วย `fetch-depth: 0` เพื่อให้ได้ tag มาด้วย ([actions/checkout](https://github.com/actions/checkout))
- เวอร์ชันเดียวกันนี้ควรบันทึกลงไฟล์ Replay ด้วย (spec: engine ตรวจว่า Replay เข้ากันได้กับเวอร์ชันปัจจุบันหรือไม่)

## 6. PRNG แบบจำนวนเต็ม (ตัวเลือกให้ ticket 02)

### แนะนำ: xoshiro128\*\* 1.1 (Blackman & Vigna)
- **สเปก**: reference C ที่ [prng.di.unimi.it/xoshiro128starstar.c](https://prng.di.unimi.it/xoshiro128starstar.c) (ระวัง: "version 1.0 had mistakenly s[0] instead of s[1]" ต้องใช้ 1.1) และ paper [Scrambled Linear Pseudorandom Number Generators](https://arxiv.org/abs/1805.01407) (ACM TOMS)
  ```c
  result = rotl(s[1] * 5, 7) * 9;
  t = s[1] << 9;
  s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3];
  s[2] ^= t; s[3] = rotl(s[3], 11);
  ```
- **state**: 128 บิต (uint32 4 ตัว) ต้องไม่เป็นศูนย์ทั้งหมด **period**: 2^128 − 1 (ไฟล์ reference: "c * 2^e should be smaller than the period (2^128 - 1)") มี `jump()` ที่เท่ากับเรียก 2^64 ครั้ง ใช้แยก stream ของ AI ออกจาก Dice Seed ของ Battle ได้ตาม spec ส่วน AI
- **คุณภาพ**: ผู้เขียนเรียกว่า "32-bit all-purpose, rock-solid generators ... passes all tests we are aware of" ข้อจำกัดคือ state เล็กเกินไปสำหรับ parallelism ขนาดใหญ่ ([PRNG shootout](https://prng.di.unimi.it/)) ซึ่งไม่ใช่ปัญหาของเกมนี้
- **เป็นจำนวนเต็ม 32 บิตล้วนใน JS**: ใช้แค่ `*5`, `*9`, `<<`, `>>>`, `^`, `|` ส่วนการคูณใช้ `Math.imul` ซึ่งเป็นการคูณจำนวนเต็ม 32 บิตตามสเปก ([ECMAScript § Math.imul](https://tc39.es/ecma262/#sec-math.imul)) จากนั้น normalize ด้วย `>>> 0` ทุกค่าจึงอยู่ใน 0..2^32−1 ที่ double แทนได้ตรงทุกตัว ผลจึงเหมือนกันทุก browser และใน Node
  ```ts
  const rotl = (x: number, k: number) => ((x << k) | (x >>> (32 - k))) >>> 0;
  next(): number {
    const s = this.s;
    const result = Math.imul(rotl(Math.imul(s[1], 5) >>> 0, 7), 9) >>> 0;
    const t = (s[1] << 9) >>> 0;
    s[2] = (s[2] ^ s[0]) >>> 0; s[3] = (s[3] ^ s[1]) >>> 0;
    s[1] = (s[1] ^ s[2]) >>> 0; s[0] = (s[0] ^ s[3]) >>> 0;
    s[2] = (s[2] ^ t) >>> 0;    s[3] = rotl(s[3], 11);
    return result;
  }
  ```
  ตรวจเองแล้ว: state `[1,2,3,4]` ให้ 6 ค่าแรกเป็น `11520, 0, 5927040, 70819200, 2031721883, 1637235492` ตรงกันทั้งจากโค้ด `Math.imul` ข้างบนและจาก implementation แยกที่ใช้ BigInt mask 32 บิต (ค่าชุดนี้ไม่ได้มาจากผู้เขียน ticket 02 ควรเทียบกับ C reference อีกรอบ)
- **seed**: ผู้เขียนแนะนำ "use SplitMix64 to initialize the state ... starting from a 64-bit seed" ([prng.di.unimi.it](https://prng.di.unimi.it/), [splitmix64.c](https://prng.di.unimi.it/splitmix64.c): `z = (x += 0x9e3779b97f4a7c15); z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9; z = (z ^ (z >> 27)) * 0x94d049bb133111eb; return z ^ (z >> 31);`) ข้อเสนอคือ Dice Seed = ค่า 64 บิต (hex 16 ตัว) เรียก SplitMix64 2 ครั้ง แล้วแตกเป็น uint32 4 ตัว (hi/lo) SplitMix64 ต้องคูณ 64 บิต จึงใช้ `BigInt` + `BigInt.asUintN(64, …)` **เฉพาะตอน init** ซึ่งยังเป็นจำนวนเต็มล้วนและ deterministic ส่วน `next()` ไม่ต้องใช้ BigInt เลย
- **ทอยลูกเต๋า dN ไม่ให้ bias**: ใช้ rejection โดยตั้ง `limit = 4294967296 % N` แล้วสุ่มใหม่ตราบที่ `x < limit` จากนั้นคืน `x % N + 1` (ทุกค่าเป็นจำนวนเต็มที่แทนได้ตรง) ปัญหา modulo bias และวิธีแก้แบบไม่ bias อธิบายไว้ใน [Lemire, Fast Random Integer Generation in an Interval](https://arxiv.org/abs/1805.10941) จำนวนครั้งที่ next() ถูกเรียกต่อการทอยไม่คงที่ แต่ deterministic เมื่อลำดับการทอยตายตัว แหล่งลูกเต๋าที่ engine รับควรมี interface ระดับ "ผลทอย" (`roll(sides) → 1..sides`) เพื่อให้ test ใส่ลำดับผลทอยเองได้ผ่านช่องทางเดียวกับ Dice Seed ตาม spec

### ตัวสำรอง: PCG32 (XSH RR, O'Neill)
- **สเปก**: minimal C ที่ [pcg-random.org/download.html](https://www.pcg-random.org/download.html): `state = old * 6364136223846793005 + (inc|1)`, output `xorshifted = ((old >> 18) ^ old) >> 27; rot = old >> 59; return (xorshifted >> rot) | (xorshifted << ((-rot) & 31))`
- **state**: 64 บิต + increment 64 บิต (เลือก stream ได้) **period**: 2^64 ต่อ stream (LCG mod 2^64 ที่ increment เป็นเลขคี่)
- **ข้อเสีย**: ต้องคูณ 64 บิต**ทุกครั้งที่เรียก** ใน JS ต้องใช้ BigInt (ช้ากว่า แต่ deterministic) หรือแตกเป็น limb 16/32 บิตเอง (เสี่ยงพลาด) จึงเป็นตัวสำรอง

### ที่ไม่เลือก
- mulberry32: state 32 บิต period จึงไม่เกิน 2^32 และหาสเปกจากแหล่งต้นทางที่อ้างอิงได้ไม่เจอ
- sfc32 (PractRand): หาไฟล์ต้นฉบับในแหล่งที่เปิดอ่านได้ไม่เจอ และ period ไม่รับประกัน (ต่ำสุด 2^32 เฉลี่ยราว 2^127 ตามเอกสารของ [Apache Commons RNG](https://commons.apache.org/proper/commons-rng/commons-rng-core/jacoco/org.apache.commons.rng.core.source32/DotyHumphreySmallFastCounting32.java.html) ซึ่งเป็นแหล่งรอง)

## Open questions

1. **Node 24 → 26**: Node 26 จะเป็น LTS วันที่ 2026-10-28 และ Node 24 เข้า maintenance วันที่ 2026-10-20 ถ้าเริ่มตั้ง workspace หลังวันที่ 28 จะเลือก 26 แทนหรือไม่ (Vitest 5 รองรับ `>=26`) ต้องตัดสินใจ
2. **ข้อยกเว้นของ pnpm**: 12.11.2 อายุน้อยกว่า 2 สัปดาห์ แต่มี security fix ต้องยืนยันว่ายอมรับข้อยกเว้นนี้ หรือจะใช้ 12.8.2 ไปก่อน
3. **Node type stripping กับ pnpm symlink**: ยังไม่ได้ทดสอบจริงว่า `node tools/simulator/src/main.ts` import `@mt/engine` (symlink ใน `node_modules`) แล้วรันได้หรือไม่ Node docs บอกแค่ว่าไม่ยอมรับ `.ts` ที่ path อยู่ใต้ `node_modules` ถ้าไม่ผ่าน ทางเลือกคือรัน simulator ผ่าน Vitest/`vite-node` หรือ build engine เป็น JS ก่อน ให้ ticket 03 ทดสอบ
4. **การบังคับทิศทาง dependency**: ทั้ง pnpm isolated `node_modules` และ TS `composite` น่าจะจับการ import ข้าม package ที่ไม่ได้ประกาศไว้ได้ แต่ยังไม่ได้ลองจริง ticket 03 ควรเพิ่ม check (เช่น ลอง import ผิดทิศแล้วต้อง fail)
5. **devicePixelRatio**: MAX_ZOOM คิดเป็น CSS px บนมือถือที่ DPR ไม่ใช่จำนวนเต็ม (เช่น 2.625) ×1 CSS จะไม่ตรงกับ device pixel แบบจำนวนเต็ม pixel อาจกว้างไม่เท่ากัน ยังไม่พบ docs ของ Phaser 4 ที่พูดถึงเรื่องนี้ ต้องทดสอบบนเครื่องจริง
6. **CSS `touch-action`** บน canvas เพื่อกัน scroll หรือ zoom ระหว่าง tap ยังไม่ได้ตรวจว่า Phaser 4 ตั้งให้เองหรือไม่
7. **GitHub Pages กับ repo private**: ยังไม่ได้ตรวจว่า `VibeGame_01` เป็น public หรือไม่ และแผน GitHub ของบัญชีรองรับ Pages กับ private repo หรือไม่
8. **TS 7 กับ editor**: บทความ TS 7 บอกว่า VS Code มี extension แยกสำหรับ TS 7 ยังไม่ได้ทดสอบประสบการณ์ใช้ใน editor กับ project references ของ repo นี้
9. **sfc32**: ถ้าอยากใช้เป็นตัวเลือก ต้องหาไฟล์ `sfc.cpp` ของ PractRand ต้นฉบับมายืนยันสเปกก่อน
