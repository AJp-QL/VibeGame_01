import { useState } from 'react'
import type { BattleChoice, PlayStatsStore } from '@mt/session'
import { BattleScreen } from './BattleScreen.tsx'
import { errorScreen, exportStats, openMenu, replayScreen, replayToExport, startBattle, startOver, undoBattle } from './appScreens.ts'
import type { GameData } from '@mt/shared'
import { Menu } from './Menu.tsx'
import { feedbackFormUrl } from './config.ts'
import { Guide } from './Playtest.tsx'
import { downloadReplay } from './replay.ts'
import { ReplayScreen } from './ReplayScreen.tsx'
import { th } from './strings.ts'

interface AppProps {
  /** The local play stats (main.tsx counts the app open). */
  stats: PlayStatsStore
  /** The feedback form; defaults to src/config.ts. */
  feedbackUrl?: string | null
}

export function App({ stats, feedbackUrl = feedbackFormUrl() }: AppProps) {
  const [screen, setScreen] = useState(openMenu)
  const toMenu = (from: { data: GameData; choice: BattleChoice }) => setScreen({ kind: 'menu', data: from.data, choice: from.choice })
  return (
    <div className="app">
      <header className="app-header">
        <h1>{th.appTitle}</h1>
      </header>
      {screen.kind === 'menu' ? (
        <Menu
          data={screen.data}
          choice={screen.choice}
          notice={screen.notice ?? null}
          onChange={(choice) => setScreen({ ...screen, choice })}
          onStart={() => setScreen(startBattle(screen.data, screen.choice, stats))}
          onOpenReplay={(file) => {
            replayScreen(file, screen.data, screen.choice).then(setScreen, (error: unknown) => setScreen(errorScreen(error)))
          }}
          onDismissNotice={() => toMenu(screen)}
          stats={stats.read()}
          statsPersistent={stats.persistent()}
          feedbackUrl={feedbackUrl}
          onOpenGuide={() => setScreen({ kind: 'guide', data: screen.data, choice: screen.choice })}
          onExportStats={() => exportStats(stats)}
        />
      ) : screen.kind === 'guide' ? (
        <Guide feedbackUrl={feedbackUrl} onBack={() => toMenu(screen)} />
      ) : screen.kind === 'battle' ? (
        <BattleScreen
          // A new session per Battle: React and Phaser both start over.
          key={screen.diceSeed}
          data={screen.data}
          session={screen.session}
          diceSeed={screen.diceSeed}
          feedbackUrl={feedbackUrl}
          onPlayAgain={() => setScreen(startBattle(screen.data, screen.choice, stats))}
          onStartOver={() => setScreen(startOver(screen, stats))}
          onUndo={() => undoBattle(screen, stats)}
          onMenu={() => toMenu(screen)}
          onExportReplay={() => downloadReplay(replayToExport(screen, stats, new Date()))}
          onFinished={(outcome, rounds) => stats.recordBattleFinished(screen.statsIndex, outcome, rounds)}
        />
      ) : screen.kind === 'replay' ? (
        <ReplayScreen
          data={screen.data}
          opened={screen.opened}
          onMenu={() => setScreen({ kind: 'menu', data: screen.data, choice: screen.choice })}
        />
      ) : (
        <section className="panel error" role="alert">
          <h2>{th.dataErrorTitle}</h2>
          <p>{th.dataErrorBody}</p>
          <pre>{screen.details}</pre>
        </section>
      )}
      <footer className="app-footer">{th.version(__APP_VERSION__)}</footer>
    </div>
  )
}
