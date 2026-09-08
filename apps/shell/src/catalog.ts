import raw from '../../../catalog.json' with { type: 'json' };

/**
 * `catalog.json` is the source of truth for which games exist. It is read at
 * build time (dev proxy ports, assemble step) and at runtime (this grid).
 */
export interface CatalogGame {
  slug: string;
  title: string;
  tagline: string;
  themeColor: string;
  backgroundColor: string;
  devPort: number;
}

export interface Catalog {
  v: 1;
  games: CatalogGame[];
}

export const catalog: Catalog = raw as Catalog;

export function findGame(slug: string): CatalogGame | undefined {
  return catalog.games.find((game) => game.slug === slug);
}
