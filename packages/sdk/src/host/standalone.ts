import { createBufferedAnalytics } from './adapters/analytics.js';
import { withFrequencyCap } from './adapters/frequency-cap.js';
import { createIdbStorage } from './adapters/idb-storage.js';
import { createSessionCounter } from './adapters/sessions.js';
import { createStubAds } from './adapters/stub-ads.js';
import { createHost, type HostCore } from './core.js';

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
 * `setLocale` records the language on the same user record the hub reads, and
 * `exitToHub` walks the browser to `/` because there is no shell to ask.
 *
 * Async because of that user record: the language is fetched before the host
 * exists, so the first `GameContext` a game is handed is already right and it
 * never renders one language and then swaps to another.
 */
export async function createStandaloneHost(_options: { slug: string }): Promise<HostCore> {
  const sessions = createSessionCounter();
  const storage = createIdbStorage();

  // A failure here is not fatal: the player gets the browser's language for
  // this session rather than no game at all.
  const locale = await storage
    .getUser()
    .then((user) => user.locale)
    .catch(() => null);

  return createHost({
    storage,
    ads: withFrequencyCap(createStubAds(), { isFirstSession: () => sessions.isFirstSession() }),
    analytics: createBufferedAnalytics(),
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
