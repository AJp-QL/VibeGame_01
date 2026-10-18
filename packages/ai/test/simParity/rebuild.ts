/**
 * Rebuild a sim.py game state (dumped by dump_sim_decisions.py) as an engine
 * BattleState, for the decision-parity test. Test-only: it writes state
 * fields directly, which play never does.
 */
import { createBattle, NO_RANGE_RULES, type BattleState, type UnitState, type UnitStatus } from '@mt/engine'
import type { Element, Side, Stats, Terrain, Tile } from '@mt/shared'
import { gameData } from '../play.ts'

export interface SimStatus {
  readonly turns: number | null
  readonly own: boolean
  readonly source: string | null
  readonly bonus: number | null
}

export interface SimUnit {
  readonly id: string
  readonly stats: Stats
  readonly alive: boolean
  readonly tile: Tile | null
  readonly hp: number
  readonly statuses: Readonly<Record<string, SimStatus>>
  readonly used: Readonly<Record<string, number>>
  readonly acted: boolean
  readonly cmd: 'advantage' | 'move' | null
}

export interface SimAction {
  readonly skill: string
  readonly target?: string
  readonly targets?: readonly string[]
  readonly tile?: Tile
  readonly element?: Element
  readonly retreat?: Tile | null
}

export interface SimPlan {
  readonly unit: string
  readonly gain: number
  readonly order?: 'mf' | 'af'
  readonly dest?: Tile
  readonly blink?: boolean
  readonly action?: SimAction
  readonly command?: { readonly when: 'start' | 'end'; readonly target: string; readonly option: 'advantage' | 'move' }
}

export interface SimDecision {
  readonly scenario: 'S1' | 'S2'
  readonly modes: Readonly<Record<Side, 'greedy' | 'tamer_rush' | 'neutral'>>
  readonly side: Side
  readonly limit: number
  readonly turn: Readonly<Record<Side, number>>
  readonly first: Side
  readonly inspiration: Readonly<Record<Side, boolean>>
  readonly units: readonly SimUnit[]
  readonly attune: readonly { tile: Tile; element: Element; turns: number; own: boolean; side: Side }[]
  readonly plan: SimPlan
  readonly gains: Readonly<Record<string, number>>
}

const SCENARIO = { S1: 'scenario_1', S2: 'scenario_2' } as const

/**
 * sim.py's own numbers where the rules or data have moved on since (known
 * differences for ticket 16; here only the AI's decisions are compared):
 * - stats: sim.py's templates (data/scenario_2 has Tidewall POW 20 and
 *   Quillfox SPI 16; sim.py 16 and 12);
 * - sim.py moves Tidewall 3; the rules (§3.2, DL 2026-10-14) move it 2. Give
 *   Tidewall AGI 18 (mod +4: move 3) and take the difference off its species
 *   Guard bonus so its Guard is unchanged. AGI changes nothing else a
 *   decision looks at (initiative is already rolled).
 */
function withSimNumbers(d: SimDecision) {
  const scenario = gameData.scenarios[SCENARIO[d.scenario]]
  const tidewall = gameData.species.tidewall
  if (scenario === undefined || tidewall === undefined) throw new Error('missing data')
  const statMod = (v: number) => Math.floor((v - 10) / 2)
  const statsOf = (id: string) => {
    const stats = d.units.find((u) => u.id === id)?.stats
    if (stats === undefined) throw new Error(`no stats for ${id}`)
    return stats
  }
  let guardShift = 0
  const teams = Object.fromEntries(
    Object.entries(scenario.teams).map(([side, team]) => [
      side,
      {
        ...team,
        tamer: { ...team.tamer, stats: statsOf(`${side}.tamer`) },
        monsters: team.monsters.map((m, i) => {
          const stats = statsOf(`${side}.m${i + 1}`)
          if (m.species !== 'tidewall') return { ...m, stats }
          guardShift = statMod(18) - statMod(stats.agi)
          return { ...m, stats: { ...stats, agi: 18 } }
        }),
      },
    ]),
  ) as unknown as typeof scenario.teams
  return {
    scenario: { ...scenario, teams },
    species: { ...gameData.species, tidewall: { ...tidewall, guardBonus: tidewall.guardBonus - guardShift } },
  }
}

/**
 * sim.py's ranges and Crossroads (ticket 09, D-31): the game shortened Long Shot, Element Bolt,
 * Pin (4 to 3) and Mark (5 to 4), put four mountains on Crossroads and added the range rules.
 * sim.py has none of it, so the decisions are compared under its conditions.
 */
const SIM_RANGES: Readonly<Record<string, number>> = { long_shot: 4, element_bolt: 4, pin: 4, mark: 5 }
const EXTRA_MOUNTAINS: readonly (readonly [number, number])[] = [[2, 2], [4, 4], [4, 2], [2, 4]]

export function rebuild(d: SimDecision): BattleState {
  const { scenario, species } = withSimNumbers(d)
  const gameBoard = gameData.boards.crossroads
  if (gameBoard === undefined) throw new Error('missing data')
  const plain = gameBoard.terrain.map((row) => [...row])
  for (const [x, y] of EXTRA_MOUNTAINS) plain[y]![x] = 'normal'
  const board = { ...gameBoard, terrain: plain }
  const byId = new Map(d.units.map((u) => [u.id, u]))
  // Preset needs every Unit on the Board: fallen Units go on spare tiles first, then leave.
  const spare: Tile[] = []
  for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) if (!d.units.some((u) => u.alive && u.tile?.x === x && u.tile.y === y)) spare.push({ x, y })
  const tileOf = (id: string): Tile => {
    const u = byId.get(id)
    if (u?.alive === true && u.tile !== null) return u.tile
    const t = spare.shift()
    if (t === undefined) throw new Error('no spare tile')
    return t
  }
  const tiles = (side: Side) => [tileOf(`${side}.tamer`), tileOf(`${side}.m1`), tileOf(`${side}.m2`)] as const
  // sim.py uses Camouflage as the Action: the game's free skills (D-28, ticket 27) are not free here.
  const simSkills = Object.fromEntries(
    Object.entries(gameData.skills).map(([id, skill]) => {
      const ranged = SIM_RANGES[id] === undefined ? skill : { ...skill, range: SIM_RANGES[id] }
      if (ranged.effects?.free !== true) return [id, ranged]
      const { free: _free, ...effects } = ranged.effects
      return [id, { ...ranged, effects }]
    }),
  )
  const created = createBattle({
    scenario,
    board,
    species,
    skills: simSkills,
    statuses: gameData.statuses,
    elementWheel: gameData.elementWheel,
    dice: { seed: '0000000000000001' },
    rangeRules: NO_RANGE_RULES,
    preset: { tiles: { A: tiles('A'), B: tiles('B') }, firstSide: d.first },
  })
  const units: UnitState[] = []
  const fallen: UnitState[] = []
  for (const unit of created.units) {
    const s = byId.get(unit.id)
    if (s === undefined) throw new Error(`no ${unit.id}`)
    const statuses: UnitStatus[] = []
    let coveredBy: string | undefined
    for (const [id, st] of Object.entries(s.statuses)) {
      if (id === 'covered') {
        coveredBy = st.source ?? undefined
        continue
      }
      statuses.push({
        id,
        ...(st.bonus !== null && id === 'guarded' ? { bonus: st.bonus } : {}),
        ...(st.turns !== null ? { turnsLeft: st.turns } : {}),
        ...(st.own && st.turns !== null ? { skipCountdown: true as const } : {}),
        ...(st.source !== null ? { source: st.source } : {}),
        ...(id === 'hidden' ? { whileOn: 'forest' as const } : {}),
      })
    }
    const rebuilt: UnitState = {
      ...unit,
      hp: Math.max(0, s.hp),
      statuses,
      skillsUsed: s.used,
      ...(coveredBy !== undefined ? { coveredBy } : {}),
    }
    if (s.alive) units.push(rebuilt)
    else fallen.push(rebuilt)
  }
  const terrain = board.terrain.map((row) => [...row]) as Terrain[][]
  for (const a of d.attune) {
    const row = terrain[a.tile.y]
    if (row !== undefined) row[a.tile.x] = a.element
  }
  const commanded = d.units.find((u) => u.cmd !== null && u.id.startsWith(d.side))
  return {
    ...created,
    units,
    fallen,
    terrain,
    attuned: d.attune.map((a) => ({
      tile: a.tile,
      terrain: a.element,
      original: board.terrain[a.tile.y]?.[a.tile.x] ?? 'normal',
      side: a.side,
      by: `${a.side}.tamer`,
      turnsLeft: a.turns,
      ...(a.own ? { skipCountdown: true as const } : {}),
    })),
    command:
      commanded?.cmd != null ? { side: d.side, tamer: `${d.side}.tamer`, target: commanded.id, option: commanded.cmd } : null,
    sideToAct: d.side,
    turnNumber: d.turn,
    round: d.turn[d.first],
    activations: { current: null, started: d.units.filter((u) => u.acted && u.id.startsWith(d.side)).map((u) => u.id), limit: d.limit },
    inspiration: d.inspiration,
  }
}
