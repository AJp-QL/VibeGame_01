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
