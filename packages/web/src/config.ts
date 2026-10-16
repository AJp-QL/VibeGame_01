/**
 * Settings a human edits before handing a build to playtesters (ticket 17).
 * See docs/deploy/cloudflare.md ("Feedback form").
 */

/**
 * The short feedback form (e.g. a Google Form) linked from the result screen
 * and the menu. Empty: the link is hidden. Set it here, or at build time with
 * the env var `VITE_FEEDBACK_FORM_URL`, which wins when set.
 */
export const FEEDBACK_FORM_URL = ''

/** The feedback form to link, or null to hide the link. Only http(s) URLs are linked. */
export function feedbackFormUrl(configured: string = import.meta.env.VITE_FEEDBACK_FORM_URL || FEEDBACK_FORM_URL): string | null {
  const url = configured.trim()
  return /^https?:\/\/\S+$/i.test(url) ? url : null
}
