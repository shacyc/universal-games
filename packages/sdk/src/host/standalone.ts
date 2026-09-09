import { createBufferedAnalytics } from './adapters/analytics.js';
import { withFrequencyCap } from './adapters/frequency-cap.js';
import { createIdbStorage } from './adapters/idb-storage.js';
import { createSessionCounter } from './adapters/sessions.js';
import { createStubAds } from './adapters/stub-ads.js';
import { createHost, type HostCore } from './core.js';
import { readLocalePreference } from './locale-preference.js';

/**
 * A host running inside the game's own document, for when there is no shell:
 * the installed PWA opening at `/g/<slug>/`, direct navigation, or a game
 * booted on its own at `pnpm dev`.
 *
 * Identical adapters to the embedded path — only the transport differs — so
 * the two modes cannot drift apart.
 *
 * There is no language picker here: that is shell chrome, and standalone means
 * there is no shell. The game still opens in the language the player chose in
 * the hub, because the preference is same-origin storage rather than something
 * the shell keeps to itself.
 */
export function createStandaloneHost(_options: { slug: string }): HostCore {
  const sessions = createSessionCounter();
  const locale = readLocalePreference();
  return createHost({
    storage: createIdbStorage(),
    ads: withFrequencyCap(createStubAds(), { isFirstSession: () => sessions.isFirstSession() }),
    analytics: createBufferedAnalytics(),
    // Omitted rather than passed as null: `createHost` falls back to
    // `navigator.language`, and `exactOptionalPropertyTypes` makes the
    // difference between "no opinion" and "explicitly nothing" a real one.
    ...(locale !== null ? { context: { locale } } : {}),
  });
}
