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

  it('has every Board in data/ look the same after a 180° turn (rules §2.1)', () => {
    const boards = Object.values(data.boards)
    expect(boards.map((b) => b.id).sort()).toEqual(['crossroads', 'shallows'])
    for (const board of boards) {
      const mismatched: string[] = []
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          if (board.terrain[y]?.[x] !== board.terrain[6 - y]?.[6 - x]) mismatched.push(`${board.id} ${x},${y}`)
        }
      }
      expect(mismatched).toEqual([])
    }
  })

  it('has the Shallows Board: all six elements, a water diagonal, and a layout unlike Crossroads', () => {
    const shallows = data.boards.shallows!
    const crossroads = data.boards.crossroads!
    const used = new Set(shallows.terrain.flat())
    expect([...used].sort()).toEqual(['dark', 'desert', 'forest', 'light', 'mountain', 'normal', 'water'])
    // The river runs g1 → a7 through the centre.
    for (const name of ['g1', 'f2', 'e3', 'd4', 'c5', 'b6', 'a7']) {
      const { x, y } = tileFromName(name)
      expect(shallows.terrain[y]?.[x], name).toBe('water')
    }
    // Clearly different from Crossroads: most element tiles sit somewhere else.
    let sameElementTiles = 0
    shallows.terrain.forEach((row, y) =>
      row.forEach((terrain, x) => {
        if (terrain !== 'normal' && crossroads.terrain[y]?.[x] === terrain) sameElementTiles++
      }),
    )
    expect(sameElementTiles).toBeLessThanOrEqual(2)
    // Both start zones (rows 1–2 and 6–7) hold the same terrain, turned.
    const zone = (rows: number[]) => rows.flatMap((y) => shallows.terrain[y] ?? []).sort()
    expect(zone([0, 1])).toEqual(zone([5, 6]))
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

  it('stores Scenario 2 (mid game) as Monster records: Tamer Level 6, Monsters 4 Star (rules §20.1)', () => {
    const scenario = data.scenarios.scenario_2
    expect(scenario?.board).toBe('crossroads')
    for (const side of ['A', 'B'] as const) {
      expect(scenario?.teams[side].tamer.level).toBe(6)
      expect(scenario?.teams[side].tamer.skills).toEqual(scenario1Team(side).tamer.skills)
    }
    expect(scenario?.teams.A.monsters.map((m) => [m.species, m.element, m.star])).toEqual([
      ['fangrel', 'forest', 4],
      ['wispling', 'mountain', 4],
    ])
    expect(scenario?.teams.B.monsters.map((m) => [m.species, m.element, m.star])).toEqual([
      ['tidewall', 'desert', 4],
      ['quillfox', 'water', 4],
    ])
    // Same loadouts as Scenario 1; the Prototype kit values (D-25), not sim v4's.
    expect(scenario?.teams.B.monsters.map((m) => m.skills)).toEqual(scenario1Team('B').monsters.map((m) => m.skills))
    expect(scenario?.teams.B.monsters[0].stats.pow).toBe(20)
    expect(scenario?.teams.B.monsters[1].stats.spi).toBe(16)
  })

  function scenario1Team(side: 'A' | 'B') {
    return data.scenarios.scenario_1!.teams[side]
  }
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

  it('rejects a Board that does not look the same after a 180° turn (rules §2.1)', () => {
    const board = structuredClone(realFiles['boards/shallows.json']) as { rows: string[] }
    board.rows[1] = '.F..DWM' // g2 is now mountain, but its turned tile a6 is normal
    const issues = issuesOf(withFile('boards/shallows.json', board))
    expect(issues).toEqual([
      {
        file: 'boards/shallows.json',
        path: 'rows.1',
        message: 'not the same after a 180° turn: g2 is "M" but a6 is "."',
      },
    ])
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
    expect(issuesOf(withFile('traits/keen_eye.json', { id: 'keen_eye' }))).toContainEqual(
      expect.objectContaining({ file: 'traits/keen_eye.json', message: expect.stringContaining('no schema') }),
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
      target: 'enemy',
      range: 1,
      attack: 'physical',
      damage: { count: 1, sides: 8 },
      tamerDamage: { count: 1, sides: 6 },
    })
  })

  const skills = loadGameData(realFiles).skills

  it('has every skill of every Scenario loadout, plus Basic Attack and Defend', () => {
    const data = loadGameData(realFiles)
    const loadouts = Object.values(data.scenarios).flatMap((s) =>
      (['A', 'B'] as const).flatMap((side) => [s.teams[side].tamer.skills, ...s.teams[side].monsters.map((m) => m.skills)]),
    )
    for (const id of [...loadouts.flat(), 'basic_attack', 'defend']) expect(skills[id], id).toBeDefined()
  })

  it("Fangrel's loadout as rules §15.1 writes it", () => {
    expect(skills.heavy_blow).toMatchObject({ tier: 'major', target: 'enemy', range: 1, attack: 'physical', damage: { count: 2, sides: 8 } })
    expect(skills.rend).toMatchObject({
      tier: 'major',
      range: 1,
      attack: 'physical',
      damage: { count: 1, sides: 6 },
      dcStat: 'pow',
      applies: [{ status: 'bleed', save: 'vit' }],
    })
    expect(skills.hit_and_run).toMatchObject({ tier: 'minor', range: 1, damage: { count: 1, sides: 8 }, effects: { retreat: 1 } })
    expect(skills.pack_howl).toMatchObject({ tier: 'major', target: 'selfAndAllies', range: 1, applies: [{ status: 'rallied' }] })
    expect(skills.pack_howl?.attack).toBeUndefined()
  })

  it('Defend gives Guarded +2 (rules §12)', () => {
    expect(skills.defend).toEqual({
      id: 'defend',
      name: 'Defend',
      tier: 'minor',
      target: 'self',
      range: 0,
      applies: [{ status: 'guarded', bonus: 2 }],
    })
  })

  it('Save DC stat is the main stat of the owner\'s role (rules §3.2): Striker POW, Guardian VIT, Caster INT, Ranger SEN, Tamer SPI', () => {
    expect([skills.rend, skills.taunt, skills.hex, skills.pin, skills.distract].map((s) => s?.dcStat)).toEqual([
      'pow',
      'vit',
      'int',
      'sen',
      'spi',
    ])
  })
})

describe('statuses in data/ (rules §14.2)', () => {
  const statuses = loadGameData(realFiles).statuses

  it('has the 10 phase 1 statuses', () => {
    expect(Object.keys(statuses).sort()).toEqual(
      ['bleed', 'countering', 'guarded', 'hidden', 'marked', 'off_balance', 'pin', 'rallied', 'taunted', 'weakened'].sort(),
    )
  })

  it('durations as in the status table', () => {
    const turns = (id: string) => {
      const duration = statuses[id]?.duration
      return duration?.kind === 'turns' ? duration.turns : duration?.kind
    }
    expect(['bleed', 'pin', 'taunted', 'weakened', 'marked', 'rallied'].map(turns)).toEqual([3, 1, 1, 2, 1, 2])
    expect(['guarded', 'countering', 'off_balance', 'hidden'].map(turns)).toEqual([
      'untilOwnTurnStart',
      'untilOwnTurnStart',
      'untilAttackRoll',
      'untilBroken',
    ])
  })

  it('Bleed 1d4 at the start of the Turn, Rallied +1 attack roll, Guarded keeps the higher bonus', () => {
    expect(statuses.bleed?.effects).toEqual({ startOfTurnDamage: { count: 1, sides: 4 } })
    expect(statuses.rallied?.effects).toEqual({ attackRoll: 1 })
    expect(statuses.guarded).toMatchObject({ stacking: 'keepHigher', effects: { defenceFromSource: true } })
    expect(statuses.bleed?.stacking).toBe('reset')
  })
})

describe('the element wheel in data/ (rules §4.1)', () => {
  it('forest > water > mountain > desert > forest; light and dark beat each other', () => {
    expect(loadGameData(realFiles).elementWheel.beats).toEqual({
      forest: ['water'],
      water: ['mountain'],
      mountain: ['desert'],
      desert: ['forest'],
      light: ['dark'],
      dark: ['light'],
    })
  })
})

describe('malformed skills, statuses and element wheel are rejected', () => {
  const file = (id: string): any => structuredClone(realFiles[id])

  it('rejects a Scenario loadout naming an unknown skill', () => {
    const scenario = scenario1()
    scenario.teams.A.monsters[0].skills[1] = 'rendd'
    scenario.teams.B.tamer.skills[0] = 'cuddle'
    expect(issuesOf(withFile('scenarios/scenario_1.json', scenario))).toEqual(
      expect.arrayContaining([
        { file: 'scenarios/scenario_1.json', path: 'teams.A.monsters.0.skills.1', message: 'unknown skill "rendd"' },
        { file: 'scenarios/scenario_1.json', path: 'teams.B.tamer.skills.0', message: 'unknown skill "cuddle"' },
      ]),
    )
  })

  it('rejects a skill that gives an unknown status, or a save without a Save DC stat', () => {
    const rend = file('skills/rend.json')
    rend.applies = [{ status: 'bleeding', save: 'vit' }]
    expect(issuesOf(withFile('skills/rend.json', rend))).toContainEqual(
      expect.objectContaining({ path: 'applies.0.status', message: 'unknown status "bleeding"' }),
    )
    delete rend.dcStat
    expect(issuesOf(withFile('skills/rend.json', rend)).map((i) => i.path)).toContain('dcStat')
  })

  it('rejects a skill whose fields do not fit together', () => {
    const howl = file('skills/pack_howl.json')
    howl.damage = { count: 1, sides: 6 }
    howl.tier = 'passive'
    const paths = issuesOf(withFile('skills/pack_howl.json', howl)).map((i) => i.path)
    expect(paths).toEqual(expect.arrayContaining(['damage', 'target']))
    const defend = file('skills/defend.json')
    defend.range = 1
    expect(issuesOf(withFile('skills/defend.json', defend)).map((i) => i.path)).toEqual(['range'])
    // Guarded's bonus comes from its source: Defend without one is rejected.
    const noBonus = file('skills/defend.json')
    noBonus.applies = [{ status: 'guarded' }]
    expect(issuesOf(withFile('skills/defend.json', noBonus)).map((i) => i.path)).toEqual(['applies.0.bonus'])
  })

  it('rejects a bad status: unknown duration kind, negative duration, unknown effect, wrong id', () => {
    const bleed = file('statuses/bleed.json')
    bleed.duration = { kind: 'turns', turns: 0 }
    bleed.effects.poison = true
    const paths = issuesOf(withFile('statuses/bleed.json', bleed)).map((i) => i.path)
    expect(paths).toEqual(expect.arrayContaining(['duration.turns', 'effects']))
    const rallied = file('statuses/rallied.json')
    rallied.duration = { kind: 'forever' }
    rallied.stacking = 'add'
    expect(issuesOf(withFile('statuses/rallied.json', rallied)).map((i) => i.path)).toEqual(
      expect.arrayContaining(['duration.kind', 'stacking']),
    )
  })

  it('rejects an element wheel where an element beats itself, and a missing wheel', () => {
    const wheel = file('elements/element_wheel.json')
    wheel.beats.water = ['water']
    expect(issuesOf(withFile('elements/element_wheel.json', wheel))).toContainEqual(
      expect.objectContaining({ path: 'beats.water', message: 'water cannot beat itself' }),
    )
    const files = structuredClone(realFiles)
    delete files['elements/element_wheel.json']
    expect(issuesOf(files)).toContainEqual(expect.objectContaining({ message: 'the element wheel is missing' }))
  })
})
