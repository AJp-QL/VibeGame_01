import {
  aiOpponent, battleReplay, battleSetup, createBattleSession, defaultChoice,
  openReplay, statsFileName, createBattle,
  type BattleChoice, type OpenedReplay, type PlayStatsStore, type BattleSession,
} from '@mt/session'
import { DataError, type GameData } from '@mt/shared'
import { loadBundledGameData } from './gameData.ts'
import type { ReplayNotice } from './Menu.tsx'
import { downloadJson } from './replay.ts'

/** What the app shows: the menu, a Battle, a Replay, or why the game data failed to load. */
export type Screen =
  | {
      readonly kind: 'menu'
      readonly data: GameData
      readonly choice: BattleChoice
      /** Why the last Replay file could not be opened, if it could not. */
      readonly notice?: ReplayNotice
    }
  | {
      readonly kind: 'battle'
      readonly data: GameData
      readonly choice: BattleChoice
      readonly session: BattleSession
      readonly diceSeed: string
      /** This Battle in the local play stats. */
      readonly statsIndex: number
    }
  | { readonly kind: 'guide'; readonly data: GameData; readonly choice: BattleChoice }
  | {
      readonly kind: 'replay'
      readonly data: GameData
      /** The menu choice to return to. */
      readonly choice: BattleChoice
      readonly opened: Extract<OpenedReplay, { kind: 'ready' }>
    }
  | { readonly kind: 'error'; readonly details: string }

/** A fresh 64-bit Dice Seed as 16 hex digits. Randomness lives here, never in the engine. */
function randomDiceSeed(): string {
  const words = crypto.getRandomValues(new Uint32Array(2))
  return Array.from(words, (w) => w.toString(16).padStart(8, '0')).join('')
}

export function errorScreen(error: unknown): Screen {
  const details = error instanceof DataError || error instanceof Error ? error.message : String(error)
  return { kind: 'error', details }
}

export function openMenu(): Screen {
  try {
    const data = loadBundledGameData()
    return { kind: 'menu', data, choice: defaultChoice(data) }
  } catch (error) {
    return errorScreen(error)
  }
}

export function startBattle(data: GameData, choice: BattleChoice, stats: PlayStatsStore): Screen {
  try {
    const diceSeed = randomDiceSeed()
    const ai = aiOpponent(choice)
    const session = createBattleSession(createBattle(battleSetup(data, choice, diceSeed)), ai === undefined ? {} : { ai })
    return { kind: 'battle', data, choice, session, diceSeed, statsIndex: stats.recordBattleStarted(choice) }
  } catch (error) {
    return errorScreen(error)
  }
}

/**
 * The Replay of the Battle so far, with the local play stats in `meta.stats`;
 * the export time comes from the UI, not the engine.
 */
export function replayToExport(screen: Extract<Screen, { kind: 'battle' }>, stats: PlayStatsStore, at: Date) {
  const { actions } = screen.session.getSnapshot()
  return battleReplay(screen.data, screen.choice, screen.diceSeed, actions, {
    appVersion: __APP_VERSION__,
    createdAt: at.toISOString(),
    stats: stats.read(),
  })
}

/** Save the local play stats on their own, as a JSON file. */
export function exportStats(stats: PlayStatsStore): void {
  const at = new Date()
  downloadJson(statsFileName(at), `${JSON.stringify({ ...stats.read(), appVersion: __APP_VERSION__, exportedAt: at.toISOString() }, null, 2)}\n`)
}

/** Open a Replay file: play it back, or go back to the menu saying why it cannot be. */
export async function replayScreen(file: File, data: GameData, choice: BattleChoice): Promise<Screen> {
  const opened = openReplay(await file.text(), data)
  if (opened.kind === 'ready') return { kind: 'replay', data, choice, opened }
  return { kind: 'menu', data, choice, notice: opened }
}
