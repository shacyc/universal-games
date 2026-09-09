import { useSyncExternalStore } from 'react';
import { readLocalePreference, resolveLocale, writeLocalePreference } from '@platform/sdk/host';
import { SUPPORTED, stringsFor, type Strings } from './index.js';

/**
 * The one place the shell's language lives.
 *
 * Deliberately not React state and not a context: the host in `host.ts` has to
 * read the same value to tell games about it, and `install.ts`-style module
 * state with `useSyncExternalStore` on top is the pattern this shell already
 * uses for anything two non-React callers share.
 *
 * It does not import `host.ts`. The dependency runs the other way — `host.ts`
 * subscribes here — because the host needs an initial locale at construction
 * and a cycle between the two would be a load-order bug waiting for the first
 * person who reorders an import.
 */
const FALLBACK = SUPPORTED[0];

function initialLocale(): string {
  // `navigator.language` is a starting guess and nothing more: the moment the
  // player picks, the stored preference wins, on this and every later visit.
  const stored = readLocalePreference();
  return resolveLocale(stored ?? navigator.language, SUPPORTED, FALLBACK);
}

let locale = initialLocale();
let strings = stringsFor(locale);
const listeners = new Set<() => void>();

/**
 * Stamps the chosen language onto the document.
 *
 * Called once from `main.tsx` rather than at import time, so this module can be
 * read by anything that is not a browser — the test suite included. The
 * document's language is not decoration: it is what a screen reader picks a
 * voice from and what the browser offers to translate. Games set their own
 * inside their iframe.
 */
export function applyDocumentLocale(): void {
  document.documentElement.lang = locale;
}

export function getLocale(): string {
  return locale;
}

export function getStrings(): Strings {
  return strings;
}

/** The player picked a language. Anything outside this list resolves into it. */
export function setLocale(next: string): void {
  const resolved = resolveLocale(next, SUPPORTED, FALLBACK);
  if (resolved === locale) return;
  locale = resolved;
  strings = stringsFor(resolved);
  document.documentElement.lang = resolved;
  writeLocalePreference(resolved);
  for (const listener of listeners) listener();
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Every component that renders a word calls this and nothing else. */
export function useStrings(): Strings {
  return useSyncExternalStore(subscribeLocale, getStrings);
}

export function useLocale(): string {
  return useSyncExternalStore(subscribeLocale, getLocale);
}
