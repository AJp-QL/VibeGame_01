/**
 * Loading the whole data/ folder: every file is checked against the schema of
 * its folder, its id must match its file name, and references between files
 * (Scenario → Board, Monster → species) must resolve.
 *
 * Used at build time (web Vite plugin), at test time and at load time (web),
 * so malformed data is rejected in all three places by the same code.
 */
import type * as z from 'zod'
import {
  BoardSchema,
  ScenarioSchema,
  SIDES,
  SkillSchema,
  SpeciesSchema,
  type Board,
  type Scenario,
  type Skill,
  type Species,
} from './model.ts'

export interface GameData {
  readonly boards: Readonly<Record<string, Board>>
  readonly species: Readonly<Record<string, Species>>
  readonly scenarios: Readonly<Record<string, Scenario>>
  readonly skills: Readonly<Record<string, Skill>>
}

export interface DataIssue {
  /** File path relative to data/, e.g. "boards/crossroads.json". */
  readonly file: string
  /** Where in the file, e.g. "teams.A.monsters.0.star" ("" = whole file). */
  readonly path: string
  readonly message: string
}

export class DataError extends Error {
  readonly issues: readonly DataIssue[]

  constructor(issues: readonly DataIssue[]) {
    super(
      `Invalid game data:\n${issues
        .map((issue) => `  ${issue.file}${issue.path ? ` @ ${issue.path}` : ''}: ${issue.message}`)
        .join('\n')}`,
    )
    this.name = 'DataError'
    this.issues = issues
  }
}

/** The data/ folders that have a schema, and the schema for each. */
const FOLDERS = {
  boards: BoardSchema,
  species: SpeciesSchema,
  scenarios: ScenarioSchema,
  skills: SkillSchema,
} as const

type Folder = keyof typeof FOLDERS

function isFolder(name: string): name is Folder {
  return Object.hasOwn(FOLDERS, name)
}

/**
 * Validate and assemble game data.
 *
 * @param files parsed JSON content keyed by path relative to data/,
 *   e.g. `{ "boards/crossroads.json": {...}, "species/fangrel.json": {...} }`.
 * @throws DataError listing every problem found.
 */
export function loadGameData(files: Readonly<Record<string, unknown>>): GameData {
  const issues: DataIssue[] = []
  const boards: Record<string, Board> = {}
  const species: Record<string, Species> = {}
  const scenarios: Record<string, Scenario> = {}
  const skills: Record<string, Skill> = {}

  for (const [file, content] of Object.entries(files)) {
    const match = /^([a-z_]+)\/([a-z0-9_]+)\.json$/.exec(file)
    const folder = match?.[1]
    const fileId = match?.[2]
    if (folder === undefined || fileId === undefined) {
      issues.push({ file, path: '', message: 'expected "<folder>/<snake_case_id>.json"' })
      continue
    }
    if (!isFolder(folder)) {
      issues.push({ file, path: '', message: `no schema for data folder "${folder}"` })
      continue
    }

    const result = (FOLDERS[folder] as z.ZodType<Board | Species | Scenario | Skill>).safeParse(content)
    if (!result.success) {
      for (const issue of result.error.issues) {
        issues.push({ file, path: issue.path.join('.'), message: issue.message })
      }
      continue
    }
    const record = result.data
    if (record.id !== fileId) {
      issues.push({ file, path: 'id', message: `id "${record.id}" must match file name "${fileId}"` })
      continue
    }

    if (folder === 'boards') boards[record.id] = record as Board
    else if (folder === 'species') species[record.id] = record as Species
    else if (folder === 'scenarios') scenarios[record.id] = record as Scenario
    else skills[record.id] = record as Skill
  }

  for (const scenario of Object.values(scenarios)) {
    const file = `scenarios/${scenario.id}.json`
    if (boards[scenario.board] === undefined) {
      issues.push({ file, path: 'board', message: `unknown board "${scenario.board}"` })
    }
    for (const side of SIDES) {
      const team = scenario.teams[side]
      team.monsters.forEach((monster, index) => {
        if (species[monster.species] === undefined) {
          issues.push({
            file,
            path: `teams.${side}.monsters.${index}.species`,
            message: `unknown species "${monster.species}"`,
          })
        }
      })
    }
  }

  if (issues.length > 0) throw new DataError(issues)
  return { boards, species, scenarios, skills }
}
