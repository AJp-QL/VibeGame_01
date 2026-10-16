import type { PlayStats } from './playStats.ts'
import { th } from './strings.ts'

/** The feedback form link; nothing at all when no form URL is configured (src/config.ts). */
export function FeedbackLink({ url }: { url: string | null }) {
  if (url === null) return null
  return (
    <p className="feedback">
      <a className="button-link secondary" href={url} target="_blank" rel="noopener noreferrer">
        {th.playtest.feedback}
      </a>
      <span className="muted">{th.playtest.feedbackHint}</span>
    </p>
  )
}

interface PlaytestPanelProps {
  stats: PlayStats
  /** False when the browser refused storage: the counts last for this visit only. */
  persistent: boolean
  feedbackUrl: string | null
  onOpenGuide: () => void
  onExportStats: () => void
}

/** The menu's playtester box: the guide, the stats (and their export) and the feedback form. */
export function PlaytestPanel({ stats, persistent, feedbackUrl, onOpenGuide, onExportStats }: PlaytestPanelProps) {
  return (
    <section className="panel playtest">
      <h3>{th.menu.playtestTitle}</h3>
      <div className="buttons">
        <button type="button" className="secondary" onClick={onOpenGuide}>
          {th.menu.guide}
        </button>
        <button type="button" className="secondary" onClick={onExportStats}>
          {th.playtest.exportStats}
        </button>
      </div>
      <p>{th.playtest.statsSummary(stats.appOpens, stats.battlesStarted, stats.battlesFinished, stats.daysPlayed.length)}</p>
      <p className="muted">{persistent ? th.playtest.statsLocal : th.playtest.statsMemoryOnly}</p>
      <FeedbackLink url={feedbackUrl} />
    </section>
  )
}

/** The playtester guide: how to play, how to export a Replay and the stats, and where to send them. */
export function Guide({ feedbackUrl, onBack }: { feedbackUrl: string | null; onBack: () => void }) {
  return (
    <main className="guide">
      <h2>{th.guide.title}</h2>
      {th.guide.sections.map((section) => (
        <section key={section.title} className="panel">
          <h3>{section.title}</h3>
          {section.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
      <FeedbackLink url={feedbackUrl} />
      <button type="button" className="primary" onClick={onBack}>
        {th.guide.back}
      </button>
    </main>
  )
}
