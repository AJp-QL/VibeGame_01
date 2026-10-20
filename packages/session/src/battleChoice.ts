/**
 * The menu before a Battle (spec user stories 8–9): which Scenario, which
 * Board, which mode and, against the AI, which team the human plays. No
 * rules and no text here (the menu's words are web's strings);
 * `battleSetup` turns the choice into the engine's BattleSetup.
 */
import { DEFAULT_GAME_PROFILE } from '@mt/ai'
import type { BattleSetup } from '@mt/engine'
import { BATTLE_MODES, boardSize, type BattleMode, type Board, type GameData, type Scenario, type Side } from '@mt/shared'
import type { AiOpponent } from './session.ts'

/** The modes live in @mt/shared because every Replay records one. */
export const MODES = BATTLE_MODES
/** Hotseat: two players share one device. AI: one player against the AI. */
export type Mode = BattleMode

/** Modes that can start now: both (the AI arrived with ticket 15). */
export function isModeAvailable(mode: Mode): boolean {
  return (MODES as readonly string[]).includes(mode)
}

/** Against the AI: the AI plays the team the human did not choose, with the in-game profile. */
export function aiOpponent(choice: BattleChoice): AiOpponent | undefined {
  if (choice.mode !== 'ai') return undefined
  return { side: choice.humanSide === 'A' ? 'B' : 'A', profile: DEFAULT_GAME_PROFILE }
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

/**
 * The side of the Boards the menu offers. The 9x9 Boards (`grand_crossroads`,
 * `wide_shallows`) miss the balance targets, so v0.2.0 plays on 7x7 only
 * (user, 2026-10-20; P1X-37). Their data stays in data/ and a Battle created
 * on them directly (simulator, tests, a Replay) still works. To offer them
 * again once P1X-36 meets its targets, drop this filter.
 */
const MENU_BOARD_SIZE = 7

/** The Boards the menu offers, in id order: the 7x7 Boards (see MENU_BOARD_SIZE). */
export function menuBoards(data: GameData): Board[] {
  return byId(data.boards).filter((board) => boardSize(board) === MENU_BOARD_SIZE)
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
  return {
    scenario,
    board,
    species: data.species,
    skills: data.skills,
    statuses: data.statuses,
    elementWheel: data.elementWheel,
    dice: { seed: diceSeed },
  }
}
