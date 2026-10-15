/**
 * Loading the whole data/ folder: every file is checked against the schema of
 * its folder, its id must match its file name, and references between files
 * (Scenario → Board, species and loadout skills; skill → status) must resolve, and
 * data/elements holds exactly the element wheel.
 *
 * Used at build time (web Vite plugin), at test time and at load time (web),
 * so malformed data is rejected in all three places by the same code.
 */
import type * as z from 'zod'
import {
  ElementWheelSchema,
  SkillSchema,
  StatusTypeSchema,
  type ElementWheel,
  type Skill,
  type StatusType,
} from './combatData.ts'
import { BoardSchema, ScenarioSchema, SIDES, SpeciesSchema, type Board, type Scenario, type Species } from './model.ts'

export interface GameData {
  readonly boards: Readonly<Record<string, Board>>
  readonly species: Readonly<Record<string, Species>>
  readonly scenarios: Readonly<Record<string, Scenario>>
  readonly skills: Readonly<Record<string, Skill>>
  /** Status types by id (data/statuses, rules §14.2). */
  readonly statuses: Readonly<Record<string, StatusType>>
  /** The element wheel (data/elements/element_wheel.json, rules §4.1). */
  readonly elementWheel: ElementWheel
}

/** The one element wheel file every data set must have. */
export const ELEMENT_WHEEL_ID = 'element_wheel'

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
  statuses: StatusTypeSchema,
  elements: ElementWheelSchema,
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
  const statuses: Record<string, StatusType> = {}
  const wheels: Record<string, ElementWheel> = {}

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

    const result = (FOLDERS[folder] as z.ZodType<Board | Species | Scenario | Skill | StatusType | ElementWheel>).safeParse(content)
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
    else if (folder === 'skills') skills[record.id] = record as Skill
    else if (folder === 'statuses') statuses[record.id] = record as StatusType
    else wheels[record.id] = record as ElementWheel
  }

  const elementWheel = wheels[ELEMENT_WHEEL_ID]
  if (elementWheel === undefined) {
    issues.push({ file: `elements/${ELEMENT_WHEEL_ID}.json`, path: '', message: 'the element wheel is missing' })
  }
  for (const id of Object.keys(wheels)) {
    if (id !== ELEMENT_WHEEL_ID) {
      issues.push({ file: `elements/${id}.json`, path: '', message: `the only element wheel is "${ELEMENT_WHEEL_ID}"` })
    }
  }

  // Every status a skill gives must exist; a bonus only goes with a status whose effect uses it.
  for (const skill of Object.values(skills)) {
    skill.applies?.forEach((application, index) => {
      const status = statuses[application.status]
      const path = `applies.${index}`
      if (status === undefined) {
        issues.push({ file: `skills/${skill.id}.json`, path: `${path}.status`, message: `unknown status "${application.status}"` })
      } else if ((application.bonus !== undefined) !== (status.effects.defenceFromSource === true)) {
        issues.push({
          file: `skills/${skill.id}.json`,
          path: `${path}.bonus`,
          message: `"${status.id}" ${status.effects.defenceFromSource ? 'needs' : 'takes no'} a bonus from its source`,
        })
      }
    })
  }

  for (const scenario of Object.values(scenarios)) {
    const file = `scenarios/${scenario.id}.json`
    if (boards[scenario.board] === undefined) {
      issues.push({ file, path: 'board', message: `unknown board "${scenario.board}"` })
    }
    for (const side of SIDES) {
      const team = scenario.teams[side]
      const unknownSkills = (skillIds: readonly string[], path: string) =>
        skillIds.forEach((id, index) => {
          if (skills[id] === undefined) issues.push({ file, path: `${path}.${index}`, message: `unknown skill "${id}"` })
        })
      unknownSkills(team.tamer.skills, `teams.${side}.tamer.skills`)
      team.monsters.forEach((monster, index) => {
        if (species[monster.species] === undefined) {
          issues.push({
            file,
            path: `teams.${side}.monsters.${index}.species`,
            message: `unknown species "${monster.species}"`,
          })
        }
        unknownSkills(monster.skills, `teams.${side}.monsters.${index}.skills`)
      })
    }
  }

  if (issues.length > 0 || elementWheel === undefined) throw new DataError(issues)
  return { boards, species, scenarios, skills, statuses, elementWheel }
}
