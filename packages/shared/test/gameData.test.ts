import { describe, expect, it } from 'vitest'
import { DataError, loadGameData, tileFromName, type DataIssue } from '../src/index.ts'
import { readDataDir } from './readDataDir.ts'

const realFiles = readDataDir()

/** A deep copy of the real data with one file replaced. */
function withFile(file: string, content: unknown): Record<string, unknown> {
  return { ...structuredClone(realFiles), [file]: content }
}

function issuesOf(files: Record<string, unknown>): readonly DataIssue[] {
  try {
    loadGameData(files)
  } catch (error) {
    if (error instanceof DataError) return error.issues
    throw error
  }
  throw new Error('expected loadGameData to reject the data')
}

function scenario1(): any {
  return structuredClone(realFiles['scenarios/scenario_1.json'])
}

describe('data/ passes its schemas', () => {
  const data = loadGameData(realFiles)

  it('has the Crossroads Board as written in rules §2.2', () => {
    const terrainAt = (name: string) => {
      const { x, y } = tileFromName(name)
      return data.boards.crossroads?.terrain[y]?.[x]
    }
    expect(terrainAt('a1')).toBe('normal')
    expect(terrainAt('c1')).toBe('forest')
    expect(terrainAt('e1')).toBe('water')
    expect(terrainAt('b2')).toBe('mountain')
    expect(terrainAt('f2')).toBe('desert')
    expect(terrainAt('d3')).toBe('light')
    expect(terrainAt('d4')).toBe('dark')
    expect(terrainAt('g5')).toBe('water')
    expect(terrainAt('e7')).toBe('forest')
  })

  it('has the four phase 1 species with their movement type and build', () => {
    expect(data.species.fangrel).toMatchObject({ build: 'light', movement: 'ground' })
    expect(data.species.tidewall).toMatchObject({ build: 'heavy', movement: 'aquatic', guardBonus: 2 })
    expect(data.species.wispling).toMatchObject({ build: 'light', movement: 'flying' })
    expect(data.species.quillfox).toMatchObject({ build: 'light', movement: 'ground' })
  })

  it('stores Scenario 1 Units as Monster records (rules §20.1)', () => {
    const scenario = data.scenarios.scenario_1
    expect(scenario?.board).toBe('crossroads')
    expect(scenario?.teams.A.tamer.level).toBe(1)
    expect(scenario?.teams.A.monsters.map((m) => [m.species, m.element, m.star])).toEqual([
      ['fangrel', 'forest', 1],
      ['wispling', 'mountain', 1],
    ])
    expect(scenario?.teams.B.monsters.map((m) => [m.species, m.element, m.star])).toEqual([
      ['tidewall', 'desert', 1],
      ['quillfox', 'water', 1],
    ])
  })
})

describe('malformed data is rejected', () => {
  it('rejects a stat outside 1–30', () => {
    const scenario = scenario1()
    scenario.teams.A.monsters[0].stats.pow = 31
    expect(issuesOf(withFile('scenarios/scenario_1.json', scenario))).toContainEqual(
      expect.objectContaining({ file: 'scenarios/scenario_1.json', path: 'teams.A.monsters.0.stats.pow' }),
    )
  })

  it('rejects a Star that is not a whole number', () => {
    const scenario = scenario1()
    scenario.teams.B.monsters[1].star = 1.5
    expect(issuesOf(withFile('scenarios/scenario_1.json', scenario))).toContainEqual(
      expect.objectContaining({ path: 'teams.B.monsters.1.star' }),
    )
  })

  it('rejects derived values stored in data (unknown keys)', () => {
    const scenario = scenario1()
    scenario.teams.A.monsters[0].hp = 19
    expect(issuesOf(withFile('scenarios/scenario_1.json', scenario))).toContainEqual(
      expect.objectContaining({ path: 'teams.A.monsters.0' }),
    )
  })

  it('rejects an unknown element and a missing field', () => {
    const scenario = scenario1()
    scenario.teams.A.monsters[1].element = 'fire'
    delete scenario.teams.B.tamer.level
    const paths = issuesOf(withFile('scenarios/scenario_1.json', scenario)).map((i) => i.path)
    expect(paths).toContain('teams.A.monsters.1.element')
    expect(paths).toContain('teams.B.tamer.level')
  })

  it('rejects a Board row with the wrong width or symbol', () => {
    const board = structuredClone(realFiles['boards/crossroads.json']) as { rows: string[] }
    board.rows[0] = '..F.W.'
    board.rows[3] = '.F.X.F.'
    const paths = issuesOf(withFile('boards/crossroads.json', board)).map((i) => i.path)
    expect(paths).toEqual(expect.arrayContaining(['rows.0', 'rows.3']))
  })

  it('rejects an id that does not match its file name', () => {
    const species = { ...(realFiles['species/fangrel.json'] as object), id: 'fang_rel' }
    expect(issuesOf(withFile('species/fangrel.json', species))).toContainEqual(
      expect.objectContaining({ file: 'species/fangrel.json', path: 'id' }),
    )
  })

  it('rejects a Scenario that names an unknown species or Board', () => {
    const scenario = scenario1()
    scenario.teams.B.monsters[0].species = 'tidewal'
    scenario.board = 'nowhere'
    const paths = issuesOf(withFile('scenarios/scenario_1.json', scenario)).map((i) => i.path)
    expect(paths).toEqual(expect.arrayContaining(['board', 'teams.B.monsters.0.species']))
  })

  it('rejects fixed starting tiles: Units are placed in deployment (rules §17.1)', () => {
    const scenario = scenario1()
    scenario.teams.A.startingTiles = ['d1', 'c2', 'e2']
    expect(issuesOf(withFile('scenarios/scenario_1.json', scenario))).toContainEqual(
      expect.objectContaining({ file: 'scenarios/scenario_1.json', path: 'teams.A' }),
    )
  })

  it('rejects files in a data folder that has no schema yet', () => {
    expect(issuesOf(withFile('statuses/bleed.json', { id: 'bleed' }))).toContainEqual(
      expect.objectContaining({ file: 'statuses/bleed.json', message: expect.stringContaining('no schema') }),
    )
  })

  it('rejects a skill with impossible dice, an unknown attack kind or extra keys', () => {
    const skill = structuredClone(realFiles['skills/basic_attack.json']) as Record<string, any>
    skill.damage.sides = 1
    skill.attack = 'psychic'
    skill.cooldown = 2
    const paths = issuesOf(withFile('skills/basic_attack.json', skill)).map((i) => i.path)
    expect(paths).toEqual(expect.arrayContaining(['damage.sides', 'attack', '']))
  })
})

describe('skills in data/ (rules §15.1)', () => {
  it('Basic Attack: Minor, range 1, physical, Monster 1d8 and Tamer 1d6', () => {
    expect(loadGameData(realFiles).skills.basic_attack).toEqual({
      id: 'basic_attack',
      name: 'Basic Attack',
      tier: 'minor',
      range: 1,
      attack: 'physical',
      damage: { count: 1, sides: 8 },
      tamerDamage: { count: 1, sides: 6 },
    })
  })
})
