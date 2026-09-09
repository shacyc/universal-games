import raw from '../../../catalog.json' with { type: 'json' };

/**
 * `catalog.json` is the source of truth for which games exist. It is read at
 * build time (dev proxy ports, assemble step) and at runtime (the home page).
 *
 * Presentation metadata lives here on purpose: adding a game must stay "one
 * folder plus one catalog entry", with no shell code to touch.
 */
export interface CoverShape {
  /** All four are CSS lengths, positioned against the cover box. */
  x: string;
  y: string;
  w: string;
  h: string;
  r: string;
  c: string;
}

export interface Cover {
  bg: string;
  shapes: CoverShape[];
}

/**
 * Copy a player reads, in every locale the platform ships, keyed by BCP 47 tag.
 *
 * It lives inline in `catalog.json` rather than in the shell's locale files
 * because of rule 3: adding a game is one folder plus one catalog entry, with
 * no shell code to touch. A per-slug lookup in the shell would make every new
 * game a shell change, and a game whose words nobody remembered to add.
 */
export type LocalisedText = Record<string, string>;

/**
 * Colours the **shell's** own chrome uses while this game is open — the
 * settings sheet and the button that opens it, which float over the game's own
 * canvas.
 *
 * It is data in the catalog rather than CSS in the shell because of rule 1 and
 * rule 3 at once: the shell may not import a game's stylesheet, and adding a
 * game may not mean editing the shell. A game that omits it gets a neutral dark
 * palette, which is correct-looking rather than matching.
 */
export interface ChromeTheme {
  /** The sheet's background. */
  surface: string;
  /** Primary text on `surface`. */
  ink: string;
  /** Secondary text and hairlines. */
  muted: string;
  /** The floating button, and the selected row. */
  accent: string;
  /** Text and icons on `accent`. */
  onAccent: string;
}

/**
 * What a game gets when it declares nothing: the same palette the install sheet
 * has always used. Deliberately not a guess derived from `themeColor` — a
 * readable neutral beats a contrast failure computed from one hex.
 */
const NEUTRAL_CHROME: ChromeTheme = {
  surface: '#262421',
  ink: '#f6f3ee',
  muted: '#b8b0a4',
  accent: '#3b3733',
  onAccent: '#f6f3ee',
};

export interface CatalogGame {
  slug: string;
  /** A proper noun. Never translated — "Neon Snake" is the game's name. */
  title: string;
  tagline: LocalisedText;
  /**
   * A key from `apps/shell/src/i18n/genres.ts`, lowercase, not a label. The
   * filter chips compare genres, and comparing translated words would empty the
   * grid as soon as the player switched language.
   */
  genre: string;
  themeColor: string;
  backgroundColor: string;
  devPort: number;
  cover: Cover;
  /** Optional. See `ChromeTheme`. */
  chrome?: ChromeTheme;
}

export interface Catalog {
  v: 1;
  games: CatalogGame[];
}

export const catalog: Catalog = raw as Catalog;

export function findGame(slug: string): CatalogGame | undefined {
  return catalog.games.find((game) => game.slug === slug);
}

/** The palette the shell's overlay chrome wears while this game is open. */
export function chromeTheme(game: CatalogGame): ChromeTheme {
  return game.chrome ?? NEUTRAL_CHROME;
}

/**
 * The best available wording of one piece of catalog copy.
 *
 * Exact tag, then the primary subtag, then English, then whatever exists —
 * never a blank. A locale added to the platform before every catalog entry has
 * been translated must degrade to real words, because the alternative is a game
 * card with no tagline and no error anywhere.
 */
export function pickText(text: LocalisedText, locale: string): string {
  const wanted = locale.toLowerCase();
  const keys = Object.keys(text);
  const exact = keys.find((k) => k.toLowerCase() === wanted);
  const primary = wanted.split('-')[0] ?? wanted;
  const base = keys.find((k) => k.toLowerCase() === primary);
  const key = exact ?? base ?? (keys.includes('en') ? 'en' : keys[0]);
  return (key !== undefined ? text[key] : undefined) ?? '';
}
