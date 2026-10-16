/** Words the Board draws, from the web string table (battle has no text of its own). */
export interface BoardLabels {
  /** Optional font stack; defaults to monospace. Visual tests use pinned fonts. */
  readonly fontFamily?: string
  readonly miss: string
  readonly critical: string
  /** Shown over a Unit that strikes back (Countering). */
  readonly counter: string
  /** Shown over a Unit whose push had nowhere to go. */
  readonly pushBlocked: string
}
