/**
 * The player's language choice, remembered per device.
 *
 * It is a display preference, exactly like the shell's theme, so
 * `localStorage` is the right home for it — rule 5 is about *game state*, and
 * losing this only means the next visit starts from the browser's language
 * again.
 *
 * It lives in the SDK rather than in the shell because two different hosts
 * read it. Games are same-origin with the shell by design (rule 1), so a
 * choice made in the hub is already visible to a game launched standalone from
 * its own installed icon, with nothing to sync.
 *
 * The one place that does not hold: an installed PWA on iOS gets its own
 * storage bucket, so it starts from the browser's language until the player
 * picks again inside it. Same limitation as the install memory in
 * `apps/shell/src/install.ts`, and for the same reason.
 */
const KEY = 'arcade:locale';

/** The stored tag, or `null` when the player has never chosen. */
export function readLocalePreference(): string | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw !== null && raw !== '' ? raw : null;
  } catch {
    // Private mode or blocked storage. Not knowing is the same as never having
    // chosen, and the caller falls back to the browser's language.
    return null;
  }
}

export function writeLocalePreference(tag: string): void {
  try {
    window.localStorage.setItem(KEY, tag);
  } catch {
    /* private mode or blocked storage: the choice just does not persist */
  }
}
