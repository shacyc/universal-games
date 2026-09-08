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

export interface CatalogGame {
  slug: string;
  title: string;
  tagline: string;
  genre: string;
  themeColor: string;
  backgroundColor: string;
  devPort: number;
  cover: Cover;
}

export interface Catalog {
  v: 1;
  games: CatalogGame[];
}

export const catalog: Catalog = raw as Catalog;

export function findGame(slug: string): CatalogGame | undefined {
  return catalog.games.find((game) => game.slug === slug);
}
