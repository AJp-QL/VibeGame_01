import { appendFileSync } from 'node:fs'
import { it } from 'vitest'
import { SIM_PROFILES, type AiMode } from '../src/index.ts'
import { newBattle, playBattle, seedOf } from './play.ts'

// Manual benchmark and sanity statistics: AI_BENCH=<games> [AI_SCEN=scenario_1] [AI_MODES=greedy,greedy] npx vitest run packages/ai/test/bench.test.ts
it.skipIf(process.env.AI_BENCH === undefined)('bench', () => {
  const n = Number(process.env.AI_BENCH)
  const [ma, mb] = (process.env.AI_MODES ?? 'greedy,greedy').split(',') as [AiMode, AiMode]
  for (const scen of (process.env.AI_SCEN ?? 'scenario_1,scenario_2').split(',')) {
    const t0 = performance.now()
    let actions = 0
    const wins: Record<string, number> = {}
    const causes: Record<string, number> = {}
    const skills: Record<string, number> = {}
    let rounds = 0
    let firstTamer = 0
    for (let i = 0; i < n; i++) {
      const r = playBattle(newBattle(scen, 'crossroads', seedOf(i + 1)), { A: SIM_PROFILES[ma], B: SIM_PROFILES[mb] })
      actions += r.actions.length
      const w = String(r.final.outcome?.winner ?? 'draw')
      wins[w] = (wins[w] ?? 0) + 1
      const c = String(r.final.outcome?.cause)
      causes[c] = (causes[c] ?? 0) + 1
      rounds += r.final.round
      const down = r.events.find((e) => e.type === 'unitDown')
      if (down?.type === 'unitDown' && down.unit.endsWith('tamer')) firstTamer++
      for (const e of r.events) {
        if (e.type === 'attackRolled' && e.target.endsWith('tamer')) skills['atkTamer'] = (skills['atkTamer'] ?? 0) + 1
        if (e.type === 'attackRolled') skills[`atk:${e.attacker[0]}`] = (skills[`atk:${e.attacker[0]}`] ?? 0) + 1
        if (e.type === 'damageDealt') skills[`dmg:${e.source}`] = (skills[`dmg:${e.source}`] ?? 0) + e.amount
        if (e.type === 'initiativeDecided') skills[`first:${e.firstSide}`] = (skills[`first:${e.firstSide}`] ?? 0) + 1
      }
      for (const a of r.actions) {
        const k = a.type === 'useSkill' ? `${a.unit[0]}:${a.skill}` : a.type === 'basicAttack' || a.type === 'defend' || a.type === 'command' ? `${a.unit[0]}:${a.type}` : a.type
        skills[k] = (skills[k] ?? 0) + 1
      }
    }
    const ms = performance.now() - t0
    const out = process.env.AI_BENCH_OUT ?? 'ai-bench.txt'
    appendFileSync(out, [scen, ma, mb, `${(ms / n).toFixed(1)} ms/battle`, `${(actions / n).toFixed(0)} actions`, JSON.stringify(wins), JSON.stringify(causes), `rounds ${(rounds / n).toFixed(2)}`, `tamerFirst ${(firstTamer / n).toFixed(2)}`].join(' ') + '\n')
    appendFileSync(out, Object.entries(skills).sort().map(([k, v]) => `${k}=${(v / n).toFixed(2)}`).join(' ') + '\n\n')
  }
}, 600000)
