/**
 * Game data for the simulator: the repo's data/ as the game loads it, and the
 * sim-equivalent override layer used only to check parity with sim v4
 * (decision log 2026-10-16). Nothing here writes to data/.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadGameData, type GameData, type Stat } from '@mt/shared'

export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const DATA_DIR = join(REPO_ROOT, 'data')

/** data/ validated by `loadGameData`, exactly what the game plays with. */
export function loadRepoData(dir: string = DATA_DIR): GameData {
  const files: Record<string, unknown> = {}
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue
    const fullPath = join(entry.parentPath, entry.name)
    files[relative(dir, fullPath).split(sep).join('/')] = JSON.parse(readFileSync(fullPath, 'utf8'))
  }
  return loadGameData(files)
}

type Stats = Readonly<Record<Stat, number>>
const stats = (pow: number, agi: number, vit: number, int: number, sen: number, spi: number): Stats => ({ pow, agi, vit, int, sen, spi })

/**
 * sim.py v4 `TEMPL` stats (POW AGI VIT INT SEN SPI) by species id or
 * "tamer", and Star (Monster) or Level (Tamer). Quillfox 4 Star SEN is 22,
 * sim v4's default (`quill4_sen`), also in U4.
 */
export const SIM_V4_STATS: Readonly<Record<string, Stats>> = {
  'tamer:1': stats(10, 12, 12, 10, 12, 12),
  'tamer:6': stats(10, 14, 14, 10, 14, 16),
  'fangrel:1': stats(14, 12, 10, 8, 12, 8),
  'fangrel:4': stats(22, 18, 14, 10, 16, 12),
  'tidewall:1': stats(12, 8, 14, 8, 10, 12),
  'tidewall:4': stats(16, 10, 22, 10, 14, 18),
  'wispling:1': stats(8, 12, 8, 14, 12, 12),
  'wispling:4': stats(10, 16, 12, 22, 18, 18),
  'quillfox:1': stats(12, 12, 10, 8, 14, 8),
  'quillfox:4': stats(16, 18, 12, 10, 22, 12),
}

/** One value the sim-equivalent layer changed, for the report. */
export interface DataOverride {
  readonly what: string
  readonly from: string
  readonly to: string
}

const statText = (s: Stats) => `POW ${s.pow} AGI ${s.agi} VIT ${s.vit} INT ${s.int} SEN ${s.sen} SPI ${s.spi}`

/**
 * Sim-equivalent conditions (test/tool only, decision log 2026-10-16, D-25):
 * every Unit of every Scenario gets sim.py v4's stats for its species and
 * Star (Tamer: Level), and Tidewall moves 3 like sim.py's kit exception
 * (species `moveBonus` 1; the rules move it 2, §3.2), and free skills
 * (Camouflage, D-28) are used as the Action again, as in sim.py. Returns a patched copy
 * and the list of values that actually changed; `data` is not touched.
 */
export function simEquivalentData(data: GameData): { data: GameData; overrides: DataOverride[] } {
  const overrides: DataOverride[] = []
  const simStats = (key: string, current: Stats, what: string): Stats => {
    const s = SIM_V4_STATS[key]
    if (s === undefined) throw new Error(`sim v4 has no stats for ${key}`)
    if (statText(s) !== statText(current)) overrides.push({ what, from: statText(current), to: statText(s) })
    return s
  }
  const scenarios = Object.fromEntries(
    Object.entries(data.scenarios).map(([id, scenario]) => {
      const teams = Object.fromEntries(
        Object.entries(scenario.teams).map(([side, team]) => [
          side,
          {
            ...team,
            tamer: { ...team.tamer, stats: simStats(`tamer:${team.tamer.level}`, team.tamer.stats, `${id} ${side} Tamer`) },
            monsters: team.monsters.map((m) => ({
              ...m,
              stats: simStats(`${m.species}:${m.star}`, m.stats, `${id} ${side} ${m.species}`),
            })),
          },
        ]),
      )
      return [id, { ...scenario, teams: teams as unknown as typeof scenario.teams }]
    }),
  )
  const tidewall = data.species.tidewall
  if (tidewall === undefined) throw new Error('no tidewall species')
  overrides.push({ what: 'tidewall moveBonus (base move 2 → 3)', from: String(tidewall.moveBonus ?? 0), to: '1' })
  // sim.py uses Camouflage as the Action; the game made it free (ticket 27, D-28).
  const skills = Object.fromEntries(
    Object.entries(data.skills).map(([id, skill]) => {
      if (skill.effects?.free !== true) return [id, skill]
      overrides.push({ what: `${id} free (uses no Action, D-28)`, from: 'true', to: 'false (used as the Action, as sim.py)' })
      const { free: _free, ...effects } = skill.effects
      return [id, { ...skill, effects }]
    }),
  )
  return {
    data: { ...data, scenarios, skills, species: { ...data.species, tidewall: { ...tidewall, moveBonus: 1 } } },
    overrides,
  }
}
