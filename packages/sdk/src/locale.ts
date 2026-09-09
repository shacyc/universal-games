/**
 * Locale resolution, shared by every side of the SDK.
 *
 * It lives at the root rather than under `client/`, `game/` or `host/` because
 * all three need the identical answer: the shell resolves the player's choice
 * against the locales *it* ships, a game resolves the platform's tag against
 * the locales *it* ships, and getting the two subtly different is silent —
 * the page renders half in one language and nobody files a bug.
 */

/**
 * Resolves a BCP 47 tag against a list of locales.
 *
 * Exact match first, then the primary subtag, then the fallback: `vi-VN` finds
 * `vi`, `en-GB` finds `en`, `de` finds nothing and gets the fallback. Case is
 * ignored because `navigator.language` is not consistent about it across
 * browsers.
 */
export function resolveLocale(tag: string, supported: readonly string[], fallback: string): string {
  const wanted = tag.toLowerCase();
  const exact = supported.find((s) => s.toLowerCase() === wanted);
  if (exact !== undefined) return exact;

  const primary = wanted.split('-')[0] ?? wanted;
  const base = supported.find((s) => s.toLowerCase() === primary);
  return base ?? fallback;
}
