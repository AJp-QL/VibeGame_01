# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` — never a single combined tickets file
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## Owner (multi-agent, ADR 0004)

- Every ticket has an `**Owner:** claude` or `**Owner:** codex` line directly under the title, before `**What to build:**`. The owner is whoever owns the paths the work touches per `.github/ownership.json` (summary in `AGENTS.md`).
- An agent only picks up tickets with its own Owner. Frontier for an agent = its own tickets that are `ready-for-agent` and unblocked, lowest number first.
- Work that crosses both sides is split into two tickets: the engine/session ticket (`Owner: claude`) and the UI ticket (`Owner: codex`) with `**Blocked by:**` the engine ticket. A Codex agent that needs a contract change (engine interface, `packages/shared` types, `@mt/session` API) files a new `Owner: claude` ticket and blocks its own ticket on it (see `docs/agents/codex.md`).
- Historical tickets written before the split that touched both sides say `**Owner:** claude (historical, mixed)`.
- Tickets live in the repo (`.scratch/` is committed), because Codex cloud only sees the GitHub repo — never local files outside it. Commit and push a ticket to `main` before asking Codex to work on it. `.scratch/**` is editable from both `claude/*` and `codex/*` branches; each side only edits its own tickets' Status/checkboxes plus new tickets it files.

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` — the Notes / Decisions-so-far / Fog body.
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
