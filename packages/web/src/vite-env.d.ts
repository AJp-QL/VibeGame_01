/// <reference types="vite/client" />

/** App version from `git describe` or the APP_VERSION env var (vite.config.ts). */
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  /** Feedback form URL for playtesters (src/config.ts); unset or empty hides the link. */
  readonly VITE_FEEDBACK_FORM_URL?: string
}
