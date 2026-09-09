import { createBufferedAnalytics } from './adapters/analytics.js';
import { withFrequencyCap } from './adapters/frequency-cap.js';
import { createIdbStorage } from './adapters/idb-storage.js';
import { createSessionCounter } from './adapters/sessions.js';
import { createStubAds } from './adapters/stub-ads.js';
import { createHost, type HostCore } from './core.js';
import { readLocalePreference, writeLocalePreference } from './locale-preference.js';

/**
 * A host running inside the game's own document, for when there is no shell:
 * the installed PWA opening at `/g/<slug>/`, direct navigation, or a game
 * booted on its own at `pnpm dev`.
 *
 * Identical adapters to the embedded path — only the transport differs — so
 * the two modes cannot drift apart.
 *
 * The game's own settings screen works here exactly as it does embedded: it
 * ships with the game, so it is on screen whether or not a shell is above it.
 * `setLocale` writes the same same-origin preference the shell writes, and
 * `exitToHub` walks the browser to `/` because there is no shell to ask.
 */
export function createStandaloneHost(_options: { slug: string }): HostCore {
  const sessions = createSessionCounter();
  const locale = readLocalePreference();
  return createHost({
    storage: createIdbStorage(),
    ads: withFrequencyCap(createStubAds(), { isFirstSession: () => sessions.isFirstSession() }),
    analytics: createBufferedAnalytics(),
    onLocaleChanged: writeLocalePreference,
    // A full navigation, not history: the hub is a separate document from
    // `/g/<slug>/`, and an installed game opened at its own start_url has no
    // history entry to go back to.
    onExitToHub: () => window.location.assign('/'),
    // Omitted rather than passed as null: `createHost` falls back to
    // `navigator.language`, and `exactOptionalPropertyTypes` makes the
    // difference between "no opinion" and "explicitly nothing" a real one.
    ...(locale !== null ? { context: { locale } } : {}),
  });
}
