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
 */
export function createStandaloneHost(_options: { slug: string }): HostCore {
  const sessions = createSessionCounter();
  return createHost({
    storage: createIdbStorage(),
    ads: withFrequencyCap(createStubAds(), { isFirstSession: () => sessions.isFirstSession() }),
    analytics: createBufferedAnalytics(),
  });
}
