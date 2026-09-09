import { en, type Strings } from './en.js';
import { isGenreKey } from './genres.js';
import { vi } from './vi.js';

/**
 * The locales the platform ships. The first entry is the fallback and must be
 * the language the shell is authored in.
 *
 * This is the platform's list, not a game's: it is what the picker offers and
 * what `host.setLocale` will ever emit. A game ships its own `SUPPORTED` and
 * resolves against it, so a game that has not been translated yet is not a
 * blocker for adding a locale here — it simply keeps rendering its fallback.
 */
export const SUPPORTED = ['en', 'vi'] as const;

/**
 * What the picker shows. Each language is named **in itself** — a player
 * looking for Vietnamese is looking for "Tiếng Việt", not for whatever the
 * current language calls it. That is why these are not in the locale files.
 *
 * `short` is for places with no room for the full name, like the button over a
 * running game.
 */
export const LOCALE_NAMES: Record<string, { name: string; short: string }> = {
  en: { name: 'English', short: 'EN' },
  vi: { name: 'Tiếng Việt', short: 'VI' },
};

const FACTORIES: Record<string, (n: Intl.NumberFormat) => Strings> = { en, vi };

export function stringsFor(locale: string): Strings {
  const make = FACTORIES[locale] ?? en;
  return make(new Intl.NumberFormat(locale));
}

/** The label for a genre key, falling back to the key itself. */
export function genreLabel(strings: Strings, genre: string): string {
  return isGenreKey(genre) ? strings.genres[genre] : genre;
}

export type { Strings };
export { GENRE_KEYS, CATALOG_GENRES, isGenreKey, type GenreKey } from './genres.js';
