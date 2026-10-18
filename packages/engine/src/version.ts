/**
 * The engine version stored in every Replay (spec user stories 57–59).
 *
 * Semver. Bump it in the same commit as any engine change that can make the
 * same game data, Dice Seed and action list give a different result: a
 * different final state, different events, a different dice order, or an
 * action accepted that used to be rejected (or the other way round). New
 * action types and every rules ticket count. Pure refactors, UI and docs do
 * not. While the version starts with 0, bump the minor number (0.1.0 → 0.2.0);
 * the patch number is for fixes that change no result.
 *
 * A Replay is only replayed by the engine version that recorded it; to open
 * an older Replay, check out the git tag of the build that made it (its
 * `meta.appVersion`). Changing data/ changes the data hash instead.
 */
export const ENGINE_VERSION = '0.11.0'
