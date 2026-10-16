import type { StatsStorage } from '@mt/session'

/** `window.localStorage` for the play stats, or null where reading it throws or it does not exist. */
export function browserStorage(): StatsStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}
