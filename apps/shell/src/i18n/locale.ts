import { useSyncExternalStore } from 'react';
import {
  readLocalePreference,
  resolveLocale,
  watchLocalePreference,
  writeLocalePreference,
} from '@platform/sdk/host';
import { SUPPORTED, stringsFor, type Strings } from './index.js';

/**
 * The one place the shell's language lives.
 *
 * Two values, and keeping them apart is the whole point:
 *
 * - **`choice`** is the player's, verbatim. It is what gets stored, what the
 *   host broadcasts, and what every game resolves for itself.
 * - **`rendered`** is `choice` resolved against the locales *the shell* ships,
 *   and is only used to pick the shell's own strings.
 *
 * Collapsing the two would make the hub's translation status a ceiling on the
 * whole platform: a game translated into a language the hub is not would be
 * dragged back to English the moment the shell wrote the preference. The hub
 * rendering English while a game renders French is the correct outcome, and
 * `resolveLocale` is what makes it a normal one.
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

/**
 * `navigator.language` is a starting guess and nothing more: the moment the
 * player picks, the stored preference wins, on this and every later visit.
 */
let choice = readLocalePreference() ?? navigator.language;
let rendered = resolveLocale(choice, SUPPORTED, FALLBACK);
let strings = stringsFor(rendered);
const listeners = new Set<() => void>();

/**
 * Stamps the language onto the document.
 *
 * Called once from `main.tsx` rather than at import time, so this module can be
 * read by anything that is not a browser — the test suite included. The
 * document's language is not decoration: it is what a screen reader picks a
 * voice from and what the browser offers to translate. It gets `rendered`,
 * because that is the language the words on this page are actually in. Games
 * set their own inside their iframe, from their own resolution.
 */
export function applyDocumentLocale(): void {
  document.documentElement.lang = rendered;
}

/** The player's choice. What games are told, and what is persisted. */
export function getLocale(): string {
  return choice;
}

/** The choice resolved to a language the shell has words for. */
export function getRenderedLocale(): string {
  return rendered;
}

export function getStrings(): Strings {
  return strings;
}

/**
 * The player picked a language — here, inside a game, or in another tab.
 *
 * `persist` is false only when the change *came from* storage: rewriting the
 * key we were just told about is noise, and on a browser that echoes it back
 * it would be a loop.
 */
function adopt(next: string, persist: boolean): void {
  if (next === choice) return;
  choice = next;
  rendered = resolveLocale(next, SUPPORTED, FALLBACK);
  strings = stringsFor(rendered);
  document.documentElement.lang = rendered;
  if (persist) writeLocalePreference(next);
  for (const listener of listeners) listener();
}

export function setLocale(next: string): void {
  adopt(next, true);
}

// Another tab of this origin — the hub in a second window, or an installed game
// — changed the language. One choice, every surface, no reload.
watchLocalePreference((tag) => adopt(tag, false));

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

/** The player's choice — what a picker should show as selected. */
export function useLocale(): string {
  return useSyncExternalStore(subscribeLocale, getLocale);
}
