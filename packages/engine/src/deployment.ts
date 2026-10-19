/**
 * Deployment (rules §17.1): before the first Turn each side places its Tamer
 * and 2 Monsters on empty tiles of its own start zone (the back 2 rows of the
 * Board, any terrain), hidden from the other side. Team A places first, then
 * team B. When both have confirmed, the placements are revealed together,
 * initiative is rolled and the first Turn starts. Deployment uses no dice.
 */
import { boardSizeOf } from './state.ts'
import { isOnBoard, sameTile, tileName, type Side, type Tile } from '@mt/shared'
import type { Action, ApplyResult, Rejection, RejectionCode } from './battle.ts'
import { rollInitiative } from './initiative.ts'
import { emit, type Resolution } from './resolution.ts'
import type { BattleState, Deployment, UnitId, UnitState, UnitTemplate } from './state.ts'
import { startTurn, TEAM_SIZE } from './turns.ts'

/** Rows (`y`) of each side's start zone on a Board of `size`: team A the first 2 rows, team B the last 2 (rules §2.1, §17.1). */
export function startZoneRows(side: Side, size: number): readonly number[] {
  return side === 'A' ? [0, 1] : [size - 2, size - 1]
}

/** Whether `tile` is in the start zone of `side` on a Board of `size`. */
export function isInStartZone(side: Side, tile: Tile, size: number): boolean {
  return isOnBoard(tile, size) && startZoneRows(side, size).includes(tile.y)
}

const otherSide = (side: Side): Side => (side === 'A' ? 'B' : 'A')

function reject(state: BattleState, code: RejectionCode, message: string): ApplyResult {
  return { ok: false, state, rejection: { code, message } }
}

function inDeployment(state: BattleState): Deployment | undefined {
  return state.phase === 'deployment' && state.deployment !== null ? state.deployment : undefined
}

/** Deploy actions for every Unit of the side placing, then Confirm once all are placed. */
export function deploymentActions(state: BattleState): Action[] {
  const deployment = inDeployment(state)
  if (deployment === undefined) return []
  const side = state.sideToAct
  const placed = deployment.placements[side]
  const taken = Object.values(placed)
  const free: Tile[] = []
  const size = boardSizeOf(state)
  for (const y of startZoneRows(side, size)) {
    for (let x = 0; x < size; x++) {
      if (!taken.some((t) => t.x === x && t.y === y)) free.push({ x, y })
    }
  }
  const actions: Action[] = []
  for (const unit of deployment.roster) {
    if (unit.side !== side) continue
    for (const to of free) actions.push({ type: 'deploy', unit: unit.id, to })
  }
  if (allPlaced(deployment, side)) actions.push({ type: 'confirmDeployment' })
  return actions
}

function allPlaced(deployment: Deployment, side: Side): boolean {
  return deployment.roster.every((unit) => unit.side !== side || deployment.placements[side][unit.id] !== undefined)
}

/** Place (or re-place) one Unit of the side placing on an empty tile of its start zone. */
export function applyDeploy(state: BattleState, unitId: UnitId, to: Tile): ApplyResult {
  const deployment = inDeployment(state)
  if (deployment === undefined) return reject(state, 'wrong-phase', 'Deployment is over')
  const unit = deployment.roster.find((u) => u.id === unitId)
  if (unit === undefined) return reject(state, 'unknown-unit', `No Unit "${unitId}"`)
  const side = state.sideToAct
  if (unit.side !== side) {
    return reject(state, 'not-your-turn', `${unitId} belongs to side ${unit.side}; side ${side} is placing`)
  }
  if (!isOnBoard(to, boardSizeOf(state))) return reject(state, 'off-board', `(${to.x}, ${to.y}) is not on the Board`)
  if (!isInStartZone(side, to, boardSizeOf(state))) {
    return reject(state, 'outside-start-zone', `${tileName(to)} is not in side ${side}'s start zone`)
  }
  const placed = deployment.placements[side]
  const occupant = Object.entries(placed).find(([, tile]) => sameTile(tile, to))
  if (occupant !== undefined) {
    return reject(state, 'tile-occupied', `${tileName(to)} is taken by ${occupant[0]}`)
  }

  const from = placed[unitId] ?? null
  return {
    ok: true,
    state: {
      ...state,
      deployment: { ...deployment, placements: { ...deployment.placements, [side]: { ...placed, [unitId]: to } } },
    },
    events: [{ type: 'unitPlaced', side, unit: unitId, from, to, hiddenFrom: otherSide(side) }],
  }
}

/**
 * Confirm the side's placements. After team A, team B places. After both,
 * reveal every placement, roll initiative (with its Inspiration decisions)
 * and start the first Turn. Returns the resolution, or why not.
 */
export function confirmDeploymentResolution(state: BattleState): Resolution<BattleState> | Rejection {
  const deployment = inDeployment(state)
  if (deployment === undefined) return { code: 'wrong-phase', message: 'Deployment is over' }
  const side = state.sideToAct
  if (!allPlaced(deployment, side)) {
    return { code: 'deployment-incomplete', message: `Side ${side} must place all ${TEAM_SIZE} Units first` }
  }
  return confirm(state, deployment, side)
}

function* confirm(state: BattleState, deployment: Deployment, side: Side): Resolution<BattleState> {
  const confirmed = { ...deployment.confirmed, [side]: true }
  yield* emit({ type: 'deploymentConfirmed', side })
  const waiting = otherSide(side)
  if (!confirmed[waiting]) return { ...state, sideToAct: waiting, deployment: { ...deployment, confirmed } }

  const units = deployment.roster.map((template) => placeUnit(template, deployment.placements[template.side][template.id]))
  yield* emit({ type: 'deploymentRevealed', placements: units.map((u) => ({ unit: u.id, tile: u.tile })) })
  // Placements are revealed before initiative: while an Inspiration decision is pending the Board shows.
  const revealed: BattleState = { ...state, phase: 'play', units, deployment: null }
  const rolled = yield* rollInitiative(deployment.roster, revealed)
  const { initiative } = rolled
  yield* emit({ type: 'initiativeDecided', firstSide: initiative.firstSide })

  const decided: BattleState = { ...rolled.state, initiative, firstSide: initiative.firstSide }
  const started = startTurn(decided, initiative.firstSide, initiative.firstSide)
  yield* emit({
    type: 'turnStarted',
    side: started.sideToAct,
    turn: started.turnNumber[started.sideToAct],
    round: started.round,
  })
  return started
}

/** A Unit template on its tile. */
export function placeUnit(template: UnitTemplate, tile: Tile | undefined): UnitState {
  if (tile === undefined) throw new Error(`${template.id} has no tile`)
  return { ...template, tile }
}

/**
 * The Units `viewer` may see. In play that is every Unit (no fog of war,
 * rules §2.1). During deployment it is only the viewer's own placed Units:
 * the other side's placements stay hidden until both sides confirm.
 */
export function unitsVisibleTo(state: BattleState, viewer: Side): UnitState[] {
  const deployment = inDeployment(state)
  if (deployment === undefined) return [...state.units]
  const placed = deployment.placements[viewer]
  return deployment.roster.flatMap((template) => {
    const tile = template.side === viewer ? placed[template.id] : undefined
    return tile === undefined ? [] : [placeUnit(template, tile)]
  })
}
