/**
 * The player's language choice, remembered per device, and the one place it is
 * read from or written to.
 *
 * Two rules make "set it once and everything follows" actually hold:
 *
 * 1. **What is stored is the player's choice, verbatim** — not a tag resolved
 *    against what any one surface happens to ship. The hub, each game and the
 *    installed PWA each ship a different set of locales; resolving on the way
 *    *in* would let whichever surface has the shortest list quietly overwrite a
 *    choice the others could have honoured. Resolution belongs at the point of
 *    rendering (`resolveLocale`), never at the point of storage.
 * 2. **A change in one tab reaches the others**, through `watchLocalePreference`.
 *    The hub in one tab and an installed game in another are the same player.
 *
 * It is a display preference, exactly like the shell's theme, so `localStorage`
 * is the right home for it — rule 5 is about *game state*, and losing this only
 * means the next visit starts from the browser's language again.
 *
 * It lives in the SDK rather than in the shell because more than one host reads
 * it. Games are same-origin with the shell by design (rule 1), so a choice made
 * in the hub is already visible to a game launched standalone from its own
 * installed icon, with nothing to sync.
 *
 * The one place that does not hold: an installed PWA on iOS gets its own
 * storage bucket, so it starts from the browser's language until the player
 * picks again inside it, and never sees another tab's change. Same limitation
 * as the install memory in `apps/shell/src/install.ts`, and for the same reason.
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

/**
 * Calls back when another tab of this origin changes the language.
 *
 * The `storage` event only fires in the tabs that did *not* write, so this
 * cannot loop with the write above. Returns an unsubscribe function.
 */
export function watchLocalePreference(onChange: (tag: string) => void): () => void {
  const listener = (event: StorageEvent): void => {
    if (event.key !== KEY) return;
    // A null newValue is the key being removed — the player has no choice again
    // rather than a choice of nothing, and the current one stands until they
    // make a new one.
    if (event.newValue === null || event.newValue === '') return;
    onChange(event.newValue);
  };

  try {
    window.addEventListener('storage', listener);
  } catch {
    // No window — a worker, or a test. Nothing to watch, and nothing to undo.
    return () => {};
  }
  return () => window.removeEventListener('storage', listener);
}
