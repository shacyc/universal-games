import { en, type Strings } from './en.js';
import { vi } from './vi.js';

/**
 * The locales this game ships. The first entry is the fallback and must be the
 * language the game is authored in, so a locale the platform reports but this
 * game does not have degrades to real text rather than to a key.
 *
 * `watchLocale` from `@platform/sdk/game` resolves the platform's tag against
 * this list — `vi-VN` finds `vi`, `de-DE` finds the fallback.
 */
export const SUPPORTED = ['en', 'vi'] as const;

const FACTORIES: Record<string, (n: Intl.NumberFormat) => Strings> = { en, vi };

export function stringsFor(locale: string): Strings {
  const make = FACTORIES[locale] ?? en;
  return make(new Intl.NumberFormat(locale));
}

export type { Strings };
