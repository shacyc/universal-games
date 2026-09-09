import { useSyncExternalStore } from 'react';
import { resolveLocale } from '@platform/sdk/host';
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
 * The value itself is **not** stored here or on the device: it belongs to the
 * player, so it lives on their user record and `hydrate()` fetches it at boot
 * along with everything else about them. Writing it back is the host's job, in
 * one place, for both hosts.
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
 * `navigator.language` is the guess the page opens with, replaced by the
 * player's own language as soon as their record has been read. Nothing is
 * rendered in between — `main.tsx` awaits `hydrate()` before the first paint.
 */
let choice = navigator.language;
let rendered = resolveLocale(choice, SUPPORTED, FALLBACK);
let strings = stringsFor(rendered);
const listeners = new Set<() => void>();

/**
 * Stamps the language onto the document.
 *
 * Called from `main.tsx` after the player's record has been read and before the
 * first render, rather than at import time — so this module can be read by
 * anything that is not a browser, the test suite included.
 *
 * `<html lang>` gets `rendered`, because that is the language the words on this
 * page are actually in. Games set their own inside their iframe, from their own
 * resolution.
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

/** The player picked a language — here, or inside a game. */
function adopt(next: string): void {
  if (next === choice) return;
  choice = next;
  rendered = resolveLocale(next, SUPPORTED, FALLBACK);
  strings = stringsFor(rendered);
  document.documentElement.lang = rendered;
  for (const listener of listeners) listener();
}

/**
 * Recording it is the host's job, not this module's — `adoptLocale` in
 * `createHost` writes it to the user record whoever asked, so the hub's picker
 * and a game's settings screen cannot persist it differently. This store is
 * told through `onLocaleChanged`.
 */
export function setLocale(next: string): void {
  adopt(next);
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

/** The player's choice — what a picker should show as selected. */
export function useLocale(): string {
  return useSyncExternalStore(subscribeLocale, getLocale);
}
