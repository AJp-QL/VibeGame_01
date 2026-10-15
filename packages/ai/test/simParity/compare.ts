import { legalActions, type Action } from '@mt/engine'
import { sameTile } from '@mt/shared'
import { Ctx } from '../../src/model.ts'
import { planUnit, type Plan, type PlanDebug } from '../../src/planner.ts'
import { SIM_PROFILES } from '../../src/index.ts'
import { rebuild, type SimDecision } from './rebuild.ts'

export interface Comparison {
  readonly decision: SimDecision
  readonly ours: Plan
  readonly gains: Readonly<Record<string, number>>
  readonly sameUnit: boolean
  readonly sameDest: boolean
  readonly sameAction: boolean
  readonly debug: Readonly<Record<string, PlanDebug>>
}

function actionKey(action: Action | null): string {
  if (action === null) return 'none'
  switch (action.type) {
    case 'basicAttack':
      return `basic_attack>${action.target}`
    case 'defend':
      return 'defend'
    case 'useSkill':
      if (action.targets !== undefined) return `${action.skill}>${[...action.targets].sort().join('+')}`
      if (action.element !== undefined && action.tile !== undefined) return `${action.skill}@${action.tile.x},${action.tile.y}:${action.element}`
      return action.target !== undefined ? `${action.skill}>${action.target}` : action.skill
    default:
      return action.type
  }
}

function simActionKey(d: SimDecision): string {
  const a = d.plan.action
  if (a === undefined) return 'none'
  if (a.targets !== undefined) return `${a.skill}>${[...a.targets].sort().join('+')}`
  if (a.element !== undefined && a.tile !== undefined) return `${a.skill}@${a.tile.x},${a.tile.y}:${a.element}`
  return a.target !== undefined ? `${a.skill}>${a.target}` : a.skill
}

export function compareDecision(d: SimDecision): Comparison {
  const state = rebuild(d)
  const done = new Set(d.units.filter((u) => u.acted && u.id.startsWith(d.side)).map((u) => u.id))
  const ctx = new Ctx(SIM_PROFILES[d.modes[d.side]], d.side, state, done)
  const legal = legalActions(state)
  let best: Plan | undefined
  const gains: Record<string, number> = {}
  const debug: Record<string, PlanDebug> = {}
  for (const unit of state.units) {
    if (unit.side !== d.side || done.has(unit.id)) continue
    const dbg: PlanDebug = { pv: {}, cands: [] }
    debug[unit.id] = dbg
    const plan = planUnit(ctx, unit, legal, dbg)
    gains[unit.id] = plan.gain
    if (best === undefined || plan.gain > best.gain) best = plan
  }
  if (best === undefined) throw new Error('no plan')
  const sameUnit = best.unit === d.plan.unit
  const sameDest = sameUnit && d.plan.dest !== undefined && sameTile(best.dest, d.plan.dest)
  const sameAction = sameUnit && actionKey(best.action) === simActionKey(d)
  return { decision: d, ours: best, gains, sameUnit, sameDest, sameAction, debug }
}

export function describe(c: Comparison, verbose = false): string {
  const d = c.decision
  return [
    `${d.scenario} ${d.side} turn ${d.turn[d.side]} (${d.modes[d.side]})`,
    `  sim: ${d.plan.unit} ${d.plan.order} -> ${d.plan.dest?.x},${d.plan.dest?.y} ${simActionKey(d)} gain ${d.plan.gain.toFixed(3)} cmd ${JSON.stringify(d.plan.command ?? null)}`,
    `  ts : ${c.ours.unit} ${c.ours.order} -> ${c.ours.dest.x},${c.ours.dest.y} ${actionKey(c.ours.action)} gain ${c.ours.gain.toFixed(3)} cmd ${JSON.stringify(c.ours.command)}`,
    `  gains sim ${JSON.stringify(Object.fromEntries(Object.entries(d.gains).map(([k, v]) => [k, +v.toFixed(3)])))} ts ${JSON.stringify(Object.fromEntries(Object.entries(c.gains).map(([k, v]) => [k, +v.toFixed(3)])))}`,
  ]
    .concat(verbose ? debugLines(c) : [])
    .join('\n')
}

function debugLines(c: Comparison): string[] {
  const d = c.decision as SimDecision & { debug?: Record<string, { pv: Record<string, number>; cands: unknown[] }> }
  const lines: string[] = []
  for (const unit of new Set([d.plan.unit, c.ours.unit])) {
    const simDbg = d.debug?.[unit]
    const ts = c.debug[unit]
    if (simDbg === undefined || ts === undefined) continue
    const pvDiff = Object.keys({ ...simDbg.pv, ...ts.pv })
      .filter((k) => simDbg.pv[k] === undefined || ts.pv[k] === undefined || Math.abs((simDbg.pv[k] ?? 0) - (ts.pv[k] ?? 0)) > 1e-6)
      .map((k) => `${k}: sim ${simDbg.pv[k]?.toFixed(3)} ts ${ts.pv[k]?.toFixed(3)}`)
    lines.push(`  [${unit}] pv diffs: ${pvDiff.join('; ') || 'none'}`)
    lines.push(`  [${unit}] sim cands: ${simDbg.cands.slice(0, 6).map((x) => JSON.stringify(x)).join(' ')}`)
    lines.push(`  [${unit}] ts  cands: ${ts.cands.slice(0, 6).map((x) => JSON.stringify(x)).join(' ')}`)
  }
  return lines
}
