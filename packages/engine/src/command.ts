/**
 * Command (rules §16, D-04, D-24): the Tamer's free order, once per Turn.
 *
 * - Not a skill and not an Action (§15.3, §16.1): it uses neither the
 *   Tamer's Action nor its Move, but it starts (or continues) the Tamer's
 *   activation (§17.4), so it can come before the Move, between Move and
 *   Action, or after the Action, as long as no other Unit has started since.
 * - Not on a side's first Turn, whichever side starts (§16.1, §17.3).
 * - Target: an allied Monster on the Board at distance ≤ 3 from the Tamer
 *   when issued (no line of sight needed, D-24) that has not started its
 *   activation this Turn, so it only helps Monsters that play after the Tamer.
 * - Options (§16.2): `advantage` on the Monster's next attack roll this Turn
 *   (rollMode.ts: never a counterattack, left out against a protected Tamer
 *   §5.3, spent by that roll anyway D-04, only Burst's first target); `move`:
 *   +1 movement range this Turn (movement.ts; still 0 while Pinned, never
 *   Blink, D-13). Passing a loyalty check is out of scope in phase 1 (§22).
 * - What is left unused ends with the Turn (§16.3, §17.4 end of Turn step 4).
 *
 * No dice (rules §21.4).
 */
import type { ApplyResult, Rejection } from './battle.ts'
import { checkActor, isRejection } from './combat.ts'
import { distance } from './movement.ts'
import { COMMAND_OPTIONS, findUnit, type BattleState, type CommandOption, type UnitId, type UnitState } from './state.ts'
import { activate } from './turns.ts'

/** Command reaches allied Monsters this far from the Tamer when issued (rules §16.1). */
export const COMMAND_RANGE = 3

/** Command (rules §16): the Tamer `unit` orders the allied Monster `target`; `option` is what it gets. */
export type CommandAction = {
  readonly type: 'command'
  readonly unit: UnitId
  readonly target: UnitId
  readonly option: CommandOption
}

/** Why `action` cannot be issued now, or the Tamer and the Monster. Shared by legalActions and applyAction. */
export function checkCommand(state: BattleState, action: CommandAction): { tamer: UnitState; target: UnitState } | Rejection {
  const tamer = checkActor(state, action.unit, 'neither')
  if (isRejection(tamer)) return tamer
  if (tamer.kind !== 'tamer') return { code: 'not-a-tamer', message: `${tamer.id} is not a Tamer: only a Tamer commands` }
  if (state.command !== null) {
    return { code: 'command-used', message: `Side ${tamer.side} already used its Command this Turn (on ${state.command.target})` }
  }
  if (state.turnNumber[tamer.side] <= 1) {
    return { code: 'command-first-turn', message: `No Command on a side's first Turn (rules §16.1)` }
  }
  if (!(COMMAND_OPTIONS as readonly string[]).includes(action.option)) {
    return { code: 'invalid-target', message: `"${String(action.option)}" is not a Command option (${COMMAND_OPTIONS.join(', ')})` }
  }
  const target = findUnit(state, action.target ?? '')
  if (target === undefined) return { code: 'unknown-unit', message: `No Unit "${action.target}" on the Board` }
  if (target.side !== tamer.side) return { code: 'not-an-ally', message: `${target.id} is not on ${tamer.id}'s side` }
  if (target.kind !== 'monster') return { code: 'invalid-target', message: 'Command is for an allied Monster' }
  const d = distance(tamer.tile, target.tile)
  if (d > COMMAND_RANGE) {
    return { code: 'out-of-range', message: `${target.id} is ${d} tiles away; Command reaches ${COMMAND_RANGE}` }
  }
  if (state.activations.started.includes(target.id)) {
    return { code: 'already-activated', message: `${target.id} already started its activation this Turn` }
  }
  return { tamer, target }
}

/** Issue a Command: the Tamer's activation starts (or goes on); nothing else of the Tamer's is used. */
export function applyCommand(state: BattleState, action: CommandAction): ApplyResult {
  const checked = checkCommand(state, action)
  if (isRejection(checked)) return { ok: false, state, rejection: checked }
  const { tamer, target } = checked
  const active = activate(state, tamer.id)
  return {
    ok: true,
    state: { ...active, command: { side: tamer.side, tamer: tamer.id, target: target.id, option: action.option } },
    events: [{ type: 'commandIssued', unit: tamer.id, target: target.id, option: action.option }],
  }
}

/** Every legal Command now: each Tamer of the side to act, each Monster in Unit order, each option. */
export function legalCommands(state: BattleState): CommandAction[] {
  if (state.phase !== 'play' || state.pending !== null || state.outcome !== null || state.command !== null) return []
  const actions: CommandAction[] = []
  for (const tamer of state.units) {
    if (tamer.kind !== 'tamer' || tamer.side !== state.sideToAct) continue
    for (const target of state.units) {
      for (const option of COMMAND_OPTIONS) {
        const action: CommandAction = { type: 'command', unit: tamer.id, target: target.id, option }
        if (!isRejection(checkCommand(state, action))) actions.push(action)
      }
    }
  }
  return actions
}
