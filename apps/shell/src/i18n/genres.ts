/**
 * The genres a catalog entry may claim.
 *
 * `catalog.json` stores the **key**, not the label, because the filter chips
 * compare genres: comparing translated words would silently empty the grid the
 * moment the player switched language. Every key here needs a label in every
 * locale file, which the type system enforces.
 *
 * `all` is the shell's own pseudo-genre for "no filter" and is never a catalog
 * value. Adding a real genre is a platform decision — it costs one key here and
 * one line in each locale — so a game proposes it rather than inventing it.
 */
export const GENRE_KEYS = ['all', 'puzzle', 'arcade', 'cards', 'word', 'casual'] as const;

export type GenreKey = (typeof GENRE_KEYS)[number];

/** The keys a game may actually use: everything except the pseudo-genre. */
export const CATALOG_GENRES: readonly GenreKey[] = GENRE_KEYS.filter((g) => g !== 'all');

/**
 * `catalog.json` is data and can say anything, so the shell has to ask before
 * it trusts a genre. A catalog entry with an unknown genre still renders — its
 * raw key stands in for the label — rather than crashing the grid, and the test
 * suite is what actually catches it.
 */
export function isGenreKey(value: string): value is GenreKey {
  return (GENRE_KEYS as readonly string[]).includes(value);
}
