# Monster Tactics — Agent guide

Read by both Claude Code (via `CLAUDE.md` → `@AGENTS.md`) and Codex cloud. Codex: also read `docs/agents/codex.md`.

## Agent skills

### Issue tracker

Local markdown — issues and specs live as files under `.scratch/<feature-slug>/`. Every ticket has an `Owner: claude | codex` line. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), recorded as a `Status:` line in each issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at repo root. See `docs/agents/domain.md`.

## Ownership (ADR 0004)

Two agents share this repo: **Claude** owns the rules and everything without UI; **Codex** owns graphics and UI. The single source of truth is `.github/ownership.json` — CI's path check reads it. The table below is a summary; if it disagrees with the JSON, the JSON wins.

| Owner | Paths (summary) |
| --- | --- |
| `claude` | `packages/shared`, `packages/engine`, `packages/ai`, `packages/session`, `packages/server`, `tools/`, `data/`, `docs/rules/`, `docs/balance/` |
| `claudeOnly` (Claude only) | root config (`package.json`, `pnpm-workspace.yaml`, `tsconfig*.json`, `vitest.config.ts`, `.gitignore`, `.gitattributes`), `.github/`, `AGENTS.md`, `CLAUDE.md`, `CONTEXT.md`, `README.md`, `packages/README.md`, the other `docs/` folders, `prototype/` |
| `codex` | `packages/battle`, `packages/web`, `art/` |
| `shared` (both) | `.scratch/**`, `pnpm-lock.yaml` |

- Dependency direction: `shared ← engine ← ai / session ← battle / web`. UI code imports engine names only through `@mt/session` re-exports, never `@mt/engine` / `@mt/ai` directly.
- A package's own `package.json` belongs to the package owner.
- A new top-level path fails CI until it is added to `.github/ownership.json` (a Claude change).

## Contract rule

The engine's public interface, the types in `packages/shared`, and the `@mt/session` snapshot/command API (incl. its re-exports) are **Claude-owned and change additively only** (add fields/functions; never rename, remove, or change meaning). Codex does not edit them: it writes a ticket with `Owner: claude` describing the needed addition, and the UI ticket is `Blocked by:` that ticket. Player-facing text lives only in `packages/web`; `session` must not contain it.

## Workflow

- Branches: Claude works on `claude/<ticket>-<slug>`, Codex on `codex/<…>`. Any other branch name fails the path check. Never push to `main` directly.
- Every change goes through a PR to `main`. **Do not merge unless CI is green** (all three jobs: build, path check, and Board visual regression). If the visual job shows the warning "Visual fixtures are stale", it is still green: the screenshots were not compared; the `Owner: codex` refresh ticket (see ENGINE_VERSION) covers it. The repo is GitHub Free + private, so there is no branch protection — this is an agreement, and whoever merges checks CI first.
- Who merges: Claude merges its own PRs after green CI. Codex PRs are reviewed by Claude (`/code-review`) and merged by the human for now.
- Cross-side work is two tickets: the engine/session ticket (`Owner: claude`) and the UI ticket (`Owner: codex`, `Blocked by:` the engine ticket).
- Concurrency: one Claude agent at a time; one Codex task plus one Claude agent in parallel is fine (their paths do not overlap except `.scratch/**` and `pnpm-lock.yaml` — avoid lockfile changes in parallel).

## Commands

Node 24, pnpm from `package.json` `packageManager` (via corepack):

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
node tools/path-check/src/bin.ts --branch <your-branch> --base origin/main   # same check as CI
```

Board screenshot tests (`packages/web/visual`, not part of `pnpm test`; Linux only, baselines come only from Playwright's pinned Chromium, see `packages/web/visual/README.md`):

```sh
corepack pnpm --filter @mt/web exec playwright install --with-deps chromium
corepack pnpm --filter @mt/web test:visual
corepack pnpm --filter @mt/simulator check-replays   # are the Replay fixtures still playable by this build?
```

Run all of these before opening a PR and list them in the PR description.

## ENGINE_VERSION

`ENGINE_VERSION` (`packages/engine/src/version.ts`) is bumped (0.x: minor, e.g. 0.8.0 → 0.9.0) in the same commit as any change that makes the same data + Dice Seed + actions produce a different result (state, events, dice order, accepted/rejected actions), including new actions and every rules ticket. Details: `packages/engine/README.md`. Only Claude touches it.

Visual-test fixtures (`packages/web/visual/fixtures/`) pin `engineVersion` and `dataHash`, so a bump or a `data/` change makes them stale. In the same PR as the bump, the Claude ticket lists a follow-up `Owner: codex` ticket "refresh visual fixtures and baselines" (`Blocked by:` the rules ticket; model: ticket 29, done inside ticket 28). Codex regenerates with `visual:fixtures`, updates baselines on Linux with the pinned Chromium, and inspects every image.

## Release

Pushing a tag `v*` runs `.github/workflows/deploy.yml` (build with `APP_VERSION` = tag, deploy `packages/web` to Cloudflare Workers). Only Claude creates tags, from `main` after CI is green. Setup of secrets: `docs/deploy/cloudflare.md`.
