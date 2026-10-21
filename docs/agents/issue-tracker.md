# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<code>-<NN>-<slug>.md` (lower case, e.g. `p1x-24-action-plan-ui.md`), numbered from `01` within each phase — never a single combined tickets file

## Ticket IDs and phase codes (decision log 2026-10-18)

- A ticket ID is `<CODE>-<NN>` (e.g. `P1X-24`). Write it in upper case in the ticket title (`# P1X-24 — …`), in every `**Blocked by:**` entry (always with the code, even within the same phase), at the start of PR titles (`[P1X-24] …`) and in commit messages; paths (files, branches) use lower case.
- Each phase folder has a code. Pick the code when the folder is created and add it here before writing tickets.

| Code | Folder | Files |
| --- | --- | --- |
| `P1` | `.scratch/phase-1-battle-slice/` | `issues/NN-<slug>.md` (named before IDs existed; P1-NN = `issues/NN-*.md`) |
| `P1X` | `.scratch/phase-1x-playtest-feedback/` | `issues/p1x-NN-<slug>.md` |
| `CA` | `.scratch/claude-automation/` | `issues/ca-NN-<slug>.md` (Claude Code automation, not a game phase) |

- Branches: `claude/<code>-<NN>-<slug>` / `codex/<code>-<NN>-<slug>` for ticket work (the ticket file must exist); other Claude work is `claude/<research|spec|docs|chore>-<slug>` — PRs that only change ticket Status or close tickets use `chore`. The path check in CI enforces this (`tools/path-check`).
- "ticket NN" in prose written before 2026-10-18 is not rewritten; read it in the context of its phase.
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## Owner (multi-agent, ADR 0004)

- Every ticket has an `**Owner:** claude` or `**Owner:** codex` line directly under the title, before `**What to build:**`. The owner is whoever owns the paths the work touches per `.github/ownership.json` (summary in `AGENTS.md`).
- An agent only picks up tickets with its own Owner. Frontier for an agent = its own tickets that are `ready-for-agent` and unblocked, lowest number first.
- Work that crosses both sides is split into two tickets: the engine/session ticket (`Owner: claude`) and the UI ticket (`Owner: codex`) with `**Blocked by:**` the engine ticket. A Codex agent that needs a contract change (engine interface, `packages/shared` types, `@mt/session` API) files a new `Owner: claude` ticket and blocks its own ticket on it (see `docs/agents/codex.md`).
- Historical tickets written before the split that touched both sides say `**Owner:** claude (historical, mixed)`.
- Tickets live in the repo (`.scratch/` is committed), because Codex cloud only sees the GitHub repo — never local files outside it. Commit and push a ticket to `main` before asking Codex to work on it. `.scratch/**` is editable from both `claude/*` and `codex/*` branches; each side only edits its own tickets' Status/checkboxes plus new tickets it files.

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed). Tickets go in `issues/<code>-<NN>-<slug>.md`; if the folder has no code yet, add one to the table above first.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` — the Notes / Decisions-so-far / Fog body.
- **Child ticket**: `.scratch/<effort>/issues/<code>-NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
