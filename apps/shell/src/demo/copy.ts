import { useMemo } from 'react';
import { pickText } from '../catalog.js';
import { useLocale } from '../i18n/locale.js';
import { demoEn, type DemoCopy } from './copy.en.js';
import { demoVi } from './copy.vi.js';
import type { HomeGame } from './demoData.js';

/**
 * PLACEHOLDER COPY — deleted together with `demoData.ts`.
 *
 * The same shape as `apps/shell/src/i18n/index.ts`, deliberately: when this
 * module goes, nothing about how the shell does languages goes with it.
 */
const FACTORIES: Record<string, (n: Intl.NumberFormat) => DemoCopy> = { en: demoEn, vi: demoVi };

export function demoCopyFor(locale: string): DemoCopy {
  const make = FACTORIES[locale] ?? demoEn;
  return make(new Intl.NumberFormat(locale));
}

export type { DemoCopy };

/**
 * The React side. Memoised on the locale so a re-render does not build a fresh
 * `Intl.NumberFormat` for every card on the page.
 */
export function useDemoCopy(): DemoCopy {
  const locale = useLocale();
  return useMemo(() => demoCopyFor(locale), [locale]);
}

/**
 * One place that knows where a game's words come from: the catalog for a real
 * game, this placeholder file for one of the nine inventions. Callers ask for a
 * tagline and never learn which kind they were given, so deleting the demo
 * module later changes this file and nothing that renders.
 */
export interface GameCopy {
  tagline: (game: HomeGame) => string;
  blurb: (slug: string) => string;
  saved: (slug: string) => string;
  season: string;
}

export function useGameCopy(): GameCopy {
  const locale = useLocale();
  const copy = useDemoCopy();
  return useMemo(
    () => ({
      tagline: (game) => (game.tagline ? pickText(game.tagline, locale) : copy.tagline[game.slug] ?? ''),
      blurb: (slug) => copy.blurb[slug] ?? '',
      saved: (slug) => copy.saved[slug] ?? '',
      season: copy.season,
    }),
    [copy, locale],
  );
}
