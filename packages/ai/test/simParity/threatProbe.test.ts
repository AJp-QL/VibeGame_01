import { readFileSync, writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { moveRangeNow } from '@mt/engine'
import { Ctx, findUnit, withUnitAt } from '../../src/model.ts'
import { SIM_PROFILES } from '../../src/index.ts'
import { rebuild, type SimDecision } from './rebuild.ts'

// Manual probe: AI_THREAT="<json>|<index>|<unit>|<x>|<y>" AI_PROBE_OUT=<file>
it.skipIf(process.env.AI_THREAT === undefined)('threat probe', () => {
  const [file, idx, unitId, x, y] = (process.env.AI_THREAT ?? '').split('|')
  const d = (JSON.parse(readFileSync(file ?? '', 'utf8')) as SimDecision[])[Number(idx)]!
  const base = rebuild(d)
  const ctx = new Ctx(SIM_PROFILES[d.modes[d.side]], d.side, base, new Set())
  const st = withUnitAt(base, unitId!, { x: Number(x), y: Number(y) })
  const u = findUnit(st, unitId!)!
  const lines: string[] = []
  for (const e of st.units) {
    if (e.side === u.side) continue
    for (const s of ctx.damageSkills(e)) {
      const p = ctx.preview(st, e, u, s.id)
      lines.push(`${e.id} ${JSON.stringify(e.tile)} ${s.id} mv ${moveRangeNow(st, e)} cd ${ctx.cooldown(e, s.id)} mode ${p.rollMode} src ${p.rollModeSources.map((x) => x.kind + ':' + x.effect).join(',')} bonus ${p.attackBonus} def ${p.defence} dmg ${JSON.stringify(p.damage)} ev ${ctx.ev(st, e, u, s.id, { simple: true, tamerProtection: true })}`)
    }
  }
  lines.push(`threat ${ctx.threat(st, u)}`)
  writeFileSync(process.env.AI_PROBE_OUT ?? 'threat.txt', lines.join('\n'))
})

// AI_ATTACK="<json>|<index>|<attacker>|<target>|<skill>|<x>|<y>"
it.skipIf(process.env.AI_ATTACK === undefined)('attack probe', () => {
  const [file, idx, att, tgt, skill, x, y] = (process.env.AI_ATTACK ?? '').split('|')
  const d = (JSON.parse(readFileSync(file ?? '', 'utf8')) as SimDecision[])[Number(idx)]!
  const base = rebuild(d)
  const ctx = new Ctx(SIM_PROFILES[d.modes[d.side]], d.side, base, new Set())
  const st = withUnitAt(base, att!, { x: Number(x), y: Number(y) })
  const a = findUnit(st, att!)!
  const t = findUnit(st, tgt!)!
  const p = ctx.preview(st, a, t, skill!)
  writeFileSync(process.env.AI_PROBE_OUT ?? 'attack.txt', JSON.stringify({ command: st.command, p, ev: ctx.ev(st, a, t, skill!) }, null, 1))
})
