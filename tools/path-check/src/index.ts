/**
 * Path ownership check (ADR 0004): which files a branch may change, decided by
 * the branch prefix and the single ownership map in `.github/ownership.json`.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export type Category = 'shared' | 'claudeOnly' | 'claude' | 'codex'

export const CATEGORIES: readonly Category[] = ['shared', 'claudeOnly', 'claude', 'codex']

export type OwnershipMap = Record<Category, readonly string[]>

/** Categories each branch prefix may change. */
const ALLOWED: Record<'claude' | 'codex', readonly Category[]> = {
  claude: ['claude', 'claudeOnly', 'shared'],
  codex: ['codex', 'shared'],
}

export type CheckResult =
  | { status: 'skipped'; reason: string }
  | { status: 'pass'; owner: 'claude' | 'codex'; checked: number }
  | { status: 'fail'; reason: string; offending: { file: string; category: Category | null }[] }

export const OWNERSHIP_FILE = '.github/ownership.json'

/** Read the ownership map from the repo root, rejecting a malformed file. */
export function loadOwnership(repoRoot: string): OwnershipMap {
  const raw: unknown = JSON.parse(readFileSync(join(repoRoot, OWNERSHIP_FILE), 'utf8'))
  if (typeof raw !== 'object' || raw === null) throw new Error(`${OWNERSHIP_FILE}: not an object`)
  const map = {} as Record<Category, string[]>
  for (const category of CATEGORIES) {
    const list = (raw as Record<string, unknown>)[category]
    if (!Array.isArray(list) || !list.every((g) => typeof g === 'string')) {
      throw new Error(`${OWNERSHIP_FILE}: "${category}" must be an array of globs`)
    }
    map[category] = list
  }
  return map
}

/** `**` matches any depth (including none), `*` stays within one path segment. */
export function globToRegExp(glob: string): RegExp {
  let re = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]!
    if (c === '*' && glob[i + 1] === '*') {
      if (glob[i + 2] === '/') {
        re += '(?:.*/)?'
        i += 2
      } else {
        re += '.*'
        i += 1
      }
    } else if (c === '*') {
      re += '[^/]*'
    } else {
      re += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp(`^${re}$`)
}

export function matches(glob: string, file: string): boolean {
  return globToRegExp(glob).test(file)
}

/** Every category whose globs match the file (more than one means the map overlaps). */
export function categoriesOf(map: OwnershipMap, file: string): Category[] {
  return CATEGORIES.filter((category) => map[category].some((glob) => matches(glob, file)))
}

/** The single category of a file, or null if no glob matches it. */
export function classify(map: OwnershipMap, file: string): Category | null {
  return categoriesOf(map, file)[0] ?? null
}

/** Normalise a git ref name: refs/heads/x → x; tags are reported separately. */
function parseRef(branch: string): { kind: 'tag' | 'branch'; name: string } {
  if (branch.startsWith('refs/tags/')) return { kind: 'tag', name: branch.slice('refs/tags/'.length) }
  if (branch.startsWith('refs/heads/')) return { kind: 'branch', name: branch.slice('refs/heads/'.length) }
  return { kind: 'branch', name: branch }
}

/**
 * Decide whether `branch` may change `files` (repo-relative, forward slashes).
 * `isTag` covers CI runs triggered by a tag, whose ref name has no prefix.
 */
export function checkPaths(
  map: OwnershipMap,
  branch: string,
  files: readonly string[],
  options: { isTag?: boolean } = {},
): CheckResult {
  const ref = parseRef(branch.trim())
  if (options.isTag || ref.kind === 'tag') return { status: 'skipped', reason: `tag ${ref.name}` }
  if (ref.name === 'main') return { status: 'skipped', reason: 'main branch' }

  const owner = ref.name.startsWith('claude/') ? 'claude' : ref.name.startsWith('codex/') ? 'codex' : null
  const changed = [...new Set(files.map((f) => f.trim().replace(/\\/g, '/')).filter((f) => f.length > 0))]
  if (owner === null) {
    return {
      status: 'fail',
      reason: `branch "${ref.name}" must start with claude/ or codex/`,
      offending: changed.map((file) => ({ file, category: classify(map, file) })),
    }
  }

  const allowed = ALLOWED[owner]
  const offending = changed
    .map((file) => ({ file, category: classify(map, file) }))
    .filter(({ category }) => category === null || !allowed.includes(category))
  if (offending.length > 0) {
    return { status: 'fail', reason: `${owner}/* branch changed paths it does not own`, offending }
  }
  return { status: 'pass', owner, checked: changed.length }
}

/** Kinds of Claude branch that are not tied to a ticket (decision log 2026-10-18). */
export const CLAUDE_BRANCH_KINDS = ['research', 'spec', 'docs', 'chore'] as const

/**
 * Phase 1 tickets were named before phase codes existed and keep their `NN-slug.md`
 * file names; P1-NN means `.scratch/phase-1-battle-slice/issues/NN-*.md`. Every
 * later phase names its files `<code>-NN-slug.md` (docs/agents/issue-tracker.md).
 */
const LEGACY_TICKET_DIRS: Readonly<Record<string, string>> = { p1: '.scratch/phase-1-battle-slice/issues/' }

const TICKET_BRANCH = /^(claude|codex)\/(p\d+[a-z]*)-(\d{2,})-[a-z0-9][a-z0-9-]*$/
const KIND_BRANCH = new RegExp(`^claude\\/(?:${CLAUDE_BRANCH_KINDS.join('|')})-[a-z0-9][a-z0-9-]*$`)

export type BranchNameResult =
  | { status: 'skipped'; reason: string }
  | { status: 'pass'; branch: string; ticket: string | null }
  | { status: 'fail'; reason: string }

/** The ticket file a phase code + number refers to, from the repo's tracked files. */
export function findTicketFile(code: string, number: string, ticketFiles: readonly string[]): string | null {
  const legacy = LEGACY_TICKET_DIRS[code]
  const wanted = (file: string) => {
    const f = file.replace(/\\/g, '/').toLowerCase()
    if (legacy !== undefined) return f.startsWith(legacy) && f.slice(legacy.length).startsWith(`${number}-`) && f.endsWith('.md')
    return /^\.scratch\/[^/]+\/issues\/[^/]+\.md$/.test(f) && f.split('/').at(-1)!.startsWith(`${code}-${number}-`)
  }
  return ticketFiles.find(wanted) ?? null
}

/**
 * Branch naming rule (decision log 2026-10-18): ticket branches are
 * `claude/<code>-<NN>-<slug>` or `codex/<code>-<NN>-<slug>` and the ticket file
 * must exist; other Claude branches are `claude/<research|spec|docs|chore>-<slug>`.
 * Compared in lower case.
 */
export function checkBranchName(branch: string, ticketFiles: readonly string[], options: { isTag?: boolean } = {}): BranchNameResult {
  const ref = parseRef(branch.trim())
  if (options.isTag || ref.kind === 'tag') return { status: 'skipped', reason: `tag ${ref.name}` }
  if (ref.name === 'main') return { status: 'skipped', reason: 'main branch' }
  const name = ref.name.toLowerCase()
  const forms =
    'expected claude/<code>-<NN>-<slug> or codex/<code>-<NN>-<slug> for a ticket (e.g. claude/p1x-24-action-plan), ' +
    `or claude/<${CLAUDE_BRANCH_KINDS.join('|')}>-<slug>`
  const ticket = TICKET_BRANCH.exec(name)
  if (ticket) {
    const [, , code, number] = ticket as unknown as [string, string, string, string]
    const file = findTicketFile(code, number, ticketFiles)
    if (file === null) {
      const where = LEGACY_TICKET_DIRS[code] !== undefined ? `${LEGACY_TICKET_DIRS[code]}${number}-*.md` : `.scratch/*/issues/${code}-${number}-*.md`
      return { status: 'fail', reason: `branch "${ref.name}" names ticket ${code.toUpperCase()}-${number}, but no ticket file ${where} exists` }
    }
    return { status: 'pass', branch: ref.name, ticket: file }
  }
  if (KIND_BRANCH.test(name)) return { status: 'pass', branch: ref.name, ticket: null }
  return { status: 'fail', reason: `branch "${ref.name}" does not follow the naming rule: ${forms}` }
}

export function formatBranchResult(result: BranchNameResult): string {
  switch (result.status) {
    case 'skipped':
      return `branch name check skipped: ${result.reason}`
    case 'pass':
      return `branch name check passed: ${result.branch}${result.ticket ? ` (ticket ${result.ticket})` : ''}`
    case 'fail':
      return `branch name check failed: ${result.reason}`
  }
}

/** Human-readable report for the CI log. */
export function formatResult(result: CheckResult): string {
  switch (result.status) {
    case 'skipped':
      return `path check skipped: ${result.reason}`
    case 'pass':
      return `path check passed: ${result.checked} changed file(s), all allowed for ${result.owner}/*`
    case 'fail':
      return [
        `path check failed: ${result.reason}`,
        ...result.offending.map(({ file, category }) => `  ${file}  (${category ?? `not classified in ${OWNERSHIP_FILE}`})`),
      ].join('\n')
  }
}
