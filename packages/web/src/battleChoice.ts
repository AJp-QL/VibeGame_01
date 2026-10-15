/**
 * The menu before a Battle (spec user stories 8–9): which Scenario, which
 * Board, which mode and, against the AI, which team the human plays. No
 * rules here; `battleSetup` turns the choice into the engine's BattleSetup.
 */
import type { BattleSetup } from '@mt/engine'
import { BATTLE_MODES, type BattleMode, type Board, type GameData, type Scenario, type Side } from '@mt/shared'

/** The modes live in @mt/shared because every Replay records one. */
export const MODES = BATTLE_MODES
/** Hotseat: two players share one device. AI: one player against the AI. */
export type Mode = BattleMode

/** Modes that can start now; playing against the AI arrives with the AI ticket (15). */
export function isModeAvailable(mode: Mode): boolean {
  return mode === 'hotseat'
}

export interface BattleChoice {
  readonly scenarioId: string
  readonly boardId: string
  readonly mode: Mode
  /** The team the human plays against the AI; Hotseat plays both teams. */
  readonly humanSide: Side
}

const byId = <T extends { readonly id: string }>(records: Readonly<Record<string, T>>): T[] =>
  Object.values(records).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

/** Scenarios in id order: scenario_1 (early game), scenario_2 (mid game), … */
export function menuScenarios(data: GameData): Scenario[] {
  return byId(data.scenarios)
}

/** Boards in id order. */
export function menuBoards(data: GameData): Board[] {
  return byId(data.boards)
}

/** First Scenario on its own default Board, Hotseat, human as team A. */
export function defaultChoice(data: GameData): BattleChoice {
  const scenario = menuScenarios(data)[0]
  if (scenario === undefined) throw new Error('No Scenario in data/scenarios')
  return { scenarioId: scenario.id, boardId: scenario.board, mode: 'hotseat', humanSide: 'A' }
}

/** Whether the menu's Start button works for this choice. */
export function canStart(data: GameData, choice: BattleChoice): boolean {
  return (
    data.scenarios[choice.scenarioId] !== undefined &&
    data.boards[choice.boardId] !== undefined &&
    isModeAvailable(choice.mode)
  )
}

/** What the engine needs to create the chosen Battle with this Dice Seed. */
export function battleSetup(data: GameData, choice: BattleChoice, diceSeed: string): BattleSetup {
  const scenario = data.scenarios[choice.scenarioId]
  const board = data.boards[choice.boardId]
  if (scenario === undefined) throw new Error(`Unknown Scenario "${choice.scenarioId}"`)
  if (board === undefined) throw new Error(`Unknown Board "${choice.boardId}"`)
  if (!isModeAvailable(choice.mode)) throw new Error(`Mode "${choice.mode}" is not available yet`)
  return { scenario, board, species: data.species, skills: data.skills, dice: { seed: diceSeed } }
}
