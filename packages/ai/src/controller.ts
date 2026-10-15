/**
 * The AI player: `createAi` once per Battle and side, then `chooseAction`
 * whenever `decidingSide(state)` is the AI's side. Pure: the AI's memory
 * (its own dice stream, the activation it is playing, which Units it is done
 * with this Turn) is a plain value passed in and returned, so the same
 * state + the same memory always give the same action.
 *
 * Turn structure follows sim.py's `take_turn`: as many activations as the
 * Turn allows; each time, plan every Unit not yet done, play the one with
 * the highest gain (first in Unit order on ties) to the end of its plan.
 */
import {
  aiDiceStream,
  decidingSide,
  legalActions,
  nextUint32,
  previewAction,
  START_ZONE_ROWS,
  terrainEffectAt,
  type Action,
  type BattleState,
  type DiceStream,
  type InspirationDecision,
  type RetreatDecision,
  type UnitId,
  type UnitTemplate,
} from '@mt/engine'
import { BOARD_SIZE, sameTile, type Side, type Tile } from '@mt/shared'
import { BASIC_ATTACK, Ctx } from './model.ts'
import { planUnit, type Plan } from './planner.ts'
import type { AiProfile } from './profiles.ts'

/** The AI's memory between its actions. Plain data. */
export interface AiState {
  readonly side: Side
  readonly profile: AiProfile
  /** The AI's own dice stream (rules §21.5 item 4); only deployment draws from it. */
  readonly rng: DiceStream
  /** Deployment actions still to send, once worked out. */
  readonly deployment: readonly Action[] | null
  /** The side's Turn number the fields below belong to. */
  readonly turn: number
  /** Units whose activation is over this Turn (sim.py `acted`), in order. */
  readonly done: readonly UnitId[]
  /** Activations used this Turn (sim.py `acts`), whether or not the Unit did anything. */
  readonly activations: number
  /** The activation being played: what is left of it. */
  readonly plan: Plan | null
  readonly steps: readonly Action[]
}

/**
 * A new AI for `side` of the Battle `battle` (the state as created: its dice
 * stream is copied and jumped for the AI's own stream, rules §21.5 item 4).
 */
export function createAi(battle: BattleState, side: Side, profile: AiProfile): AiState {
  return {
    side,
    profile,
    rng: aiDiceStream(battle.dice),
    deployment: null,
    turn: 0,
    done: [],
    activations: 0,
    plan: null,
    steps: [],
  }
}

export interface AiChoice {
  readonly action: Action
  readonly ai: AiState
}

/**
 * The AI's next action for the decision now (deployment, initiative or save
 * Inspiration, Hit and Run's step, or its Turn). Throws when the Battle is
 * over or another side must decide. The action is always legal now.
 */
export function chooseAction(state: BattleState, ai: AiState): AiChoice {
  if (state.outcome !== null) throw new Error('The Battle is over')
  if (decidingSide(state) !== ai.side) throw new Error(`Side ${decidingSide(state)} decides now, not the AI (${ai.side})`)
  const pending = state.pending
  if (pending?.kind === 'inspiration') return { action: inspirationAnswer(state, pending), ai }
  if (pending?.kind === 'retreat') return { action: retreatAnswer(state, pending, ai), ai }
  if (state.phase === 'deployment') return nextDeployment(state, ai)
  return nextTurnAction(state, ai)
}

// ------------------------------------------------------------- decisions

/**
 * sim.py uses Inspiration in two places only: its attack roll on a Tamer
 * missed, or one of its Units failed a save. Initiative: never.
 */
function inspirationAnswer(state: BattleState, pending: InspirationDecision): Action {
  const roll = pending.roll
  let use = false
  if (roll.type === 'attackRolled') {
    const target = state.units.find((u) => u.id === roll.target)
    use = !roll.hit && target?.kind === 'tamer'
  } else if (roll.type === 'saveRolled') {
    use = !roll.saved
  }
  return use ? { type: 'useInspiration', side: pending.side } : { type: 'declineInspiration', side: pending.side }
}

/** Hit and Run's step: the tile chosen with the plan (sim.py `extra`) when still possible, else stay. */
function retreatAnswer(state: BattleState, pending: RetreatDecision, ai: AiState): Action {
  const planned = ai.plan?.unit === pending.unit && ai.plan.order === 'mf' ? ai.plan.retreat : null
  if (planned !== null) {
    const step: Action = { type: 'retreat', unit: pending.unit, to: planned }
    if (previewAction(state, step).ok) return step
  }
  return { type: 'retreat', unit: pending.unit, to: null }
}

// ------------------------------------------------------------ deployment

/** A uniform number in [0, 1) from the AI stream (sim.py `rng.random()`). */
function random(rng: DiceStream): { value: number; rng: DiceStream } {
  if (rng.kind !== 'seeded') throw new Error('The AI stream is always seeded')
  const next = nextUint32(rng.state)
  return { value: next.value / 4294967296, rng: { kind: 'seeded', state: next.state } }
}

function maxRangeOf(state: BattleState, unit: UnitTemplate): number {
  let max = 0
  for (const id of [BASIC_ATTACK, ...unit.skills]) {
    const skill = state.skills[id]
    if (skill?.attack !== undefined && skill.damage !== undefined && skill.tier !== 'passive') max = Math.max(max, skill.range)
  }
  return max
}

/**
 * sim.py `deploy`: Monsters first, then the Tamer; each takes the best free
 * tile of its start zone by a random score plus terrain (×3) and role:
 * Tamer back row and centre, melee front row, ranged back row. Uses only the
 * Board and the AI's own Units (the other side's placements are hidden), so
 * it can be worked out before the other side places (rules §17.1: vs AI, the
 * AI deploys first). Returns the deploy actions and Confirm.
 */
export function planDeployment(state: BattleState, ai: AiState): { actions: readonly Action[]; ai: AiState } {
  if (ai.deployment !== null) return { actions: ai.deployment, ai }
  const roster = state.deployment?.roster
  if (roster === undefined) throw new Error('No deployment to plan')
  const rows = START_ZONE_ROWS[ai.side]
  const centre = (BOARD_SIZE - 1) / 2
  const back = [...rows].sort((a, b) => Math.abs(b - centre) - Math.abs(a - centre))[0] ?? 0
  const front = rows.find((r) => r !== back) ?? back
  const own = roster.filter((u) => u.side === ai.side)
  const order = [...own.filter((u) => u.kind !== 'tamer'), ...own.filter((u) => u.kind === 'tamer')]
  const taken: Tile[] = []
  const actions: Action[] = []
  let rng = ai.rng
  for (const unit of order) {
    let best: Tile | null = null
    let bestScore = -1e9
    for (let x = 0; x < BOARD_SIZE; x++) {
      for (const y of [back, front]) {
        const tile = { x, y }
        if (taken.some((t) => sameTile(t, tile))) continue
        const r = random(rng)
        rng = r.rng
        const effect = terrainEffectAt(state, unit, tile)
        let score = r.value + 3 * (effect === 'advantage' ? 1 : effect === 'disadvantage' ? -1 : 0)
        if (unit.kind === 'tamer') score += (y === back ? 1 : 0) - 0.3 * Math.abs(x - centre)
        else if (maxRangeOf(state, unit) <= 1) score += y === front ? 1 : 0
        else score += y === back ? 0.5 : 0
        if (score > bestScore) {
          best = tile
          bestScore = score
        }
      }
    }
    if (best === null) throw new Error('No free tile to deploy on')
    taken.push(best)
    actions.push({ type: 'deploy', unit: unit.id, to: best })
  }
  actions.push({ type: 'confirmDeployment' })
  return { actions, ai: { ...ai, rng, deployment: actions } }
}

function nextDeployment(state: BattleState, ai: AiState): AiChoice {
  const planned = planDeployment(state, ai)
  const placed = state.deployment?.placements[ai.side] ?? {}
  for (const action of planned.actions) {
    if (action.type === 'deploy') {
      const at = placed[action.unit]
      if (at !== undefined && sameTile(at, action.to)) continue
    }
    return { action, ai: planned.ai }
  }
  return { action: { type: 'confirmDeployment' }, ai: planned.ai }
}

// ------------------------------------------------------------------ Turn

function nextTurnAction(state: BattleState, start: AiState): AiChoice {
  const turn = state.turnNumber[start.side]
  let ai: AiState = start.turn === turn ? start : { ...start, turn, done: [], activations: 0, plan: null, steps: [] }
  for (;;) {
    // Carry on with the activation being played; skip steps that are no longer legal.
    let steps = ai.steps
    while (steps.length > 0) {
      const [step, ...rest] = steps
      steps = rest
      if (step !== undefined && previewAction(state, step).ok) return { action: step, ai: { ...ai, steps } }
    }
    ai = { ...ai, steps: [] }

    const remaining = state.units.filter((u) => u.side === ai.side && !ai.done.includes(u.id))
    if (ai.activations >= state.activations.limit || remaining.length === 0) {
      return { action: { type: 'endTurn' }, ai: { ...ai, plan: null } }
    }
    const ctx = new Ctx(ai.profile, ai.side, state, new Set(ai.done))
    const legal = legalActions(state)
    let best: Plan | undefined
    for (const unit of remaining) {
      const plan = planUnit(ctx, unit, legal)
      if (best === undefined || plan.gain > best.gain) best = plan
    }
    if (best === undefined) return { action: { type: 'endTurn' }, ai }
    ai = { ...ai, done: [...ai.done, best.unit], activations: ai.activations + 1, plan: best, steps: planSteps(best) }
  }
}

/** sim.py `execute`: Command (start), Move/Action in the planned order, Command (end). */
function planSteps(plan: Plan): Action[] {
  const steps: Action[] = []
  const command = plan.command
  const commandAction = command === null ? null : ({ type: 'command', unit: plan.unit, target: command.target, option: command.option } as const)
  if (commandAction !== null && command?.when === 'start') steps.push(commandAction)
  if (plan.order === 'mf') {
    if (plan.move !== null) steps.push(plan.move)
    if (plan.action !== null) steps.push(plan.action)
  } else {
    if (plan.action !== null) steps.push(plan.action)
    if (plan.move !== null) steps.push(plan.move)
  }
  if (commandAction !== null && command?.when === 'end') steps.push(commandAction)
  return steps
}
