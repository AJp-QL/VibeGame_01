import { describe, expect, it } from 'vitest'
import { SIM_PROFILES } from '@mt/ai'
import type { Board } from '@mt/shared'
import { aggregate, loadRepoData, simulateGames } from '../src/index.ts'

// The simulator plays whatever Board the data holds, whatever its size (phase 1.x ticket 13).

const rows = ['.........', '..F......', '.........', '.........', '....W....', '.........', '.........', '......F..', '.........']
const symbols: Record<string, Board['terrain'][number][number]> = { '.': 'normal', F: 'forest', W: 'water' }
const arena: Board = { id: 'arena', name: 'Arena', terrain: rows.map((row) => [...row].map((s) => symbols[s] ?? 'normal')) }
const base = loadRepoData()
const data = { ...base, boards: { ...base.boards, arena } }
const greedy = { A: SIM_PROFILES.greedy, B: SIM_PROFILES.greedy }

describe('the simulator on a 9x9 Board', () => {
  it('plays Battles to the end, the same every time', () => {
    const matchup = { scenario: 'scenario_1', board: 'arena', profiles: greedy }
    const first = simulateGames(data, matchup, 6, '0000000000000001')
    const second = simulateGames(data, matchup, 6, '0000000000000001')
    expect(first).toHaveLength(6)
    expect(first).toEqual(second)
    const metrics = aggregate(first)
    expect(metrics.games).toBe(6)
  })
})
