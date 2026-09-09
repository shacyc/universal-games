import type { AdsAdapter, AnalyticsAdapter, StorageAdapter } from '../host/adapters/types.js';
import { createBufferedAnalytics } from '../host/adapters/analytics.js';
import { createHost, type HostCore, type HostDeps } from '../host/core.js';

/**
 * Test doubles for the adapters — note that there is no mock *host*. The
 * "mock host" the docs call for is the real host with these swapped in, so
 * contract tests exercise the same dispatch, validation and run-tracking code
 * that ships.
 */

export function createMemoryStorage(seed: Record<string, unknown> = {}): StorageAdapter {
  const saves = new Map<string, unknown>(Object.entries(seed));
  const user = { id: 'test-user', isAnonymous: true };
  return {
    getUser: async () => user,
    load: async (slug) => saves.get(slug) ?? null,
    save: async (slug, state) => {
      saves.set(slug, state);
    },
  };
}

export interface ScriptedAds extends AdsAdapter {
  /** What the next `showRewarded` should resolve to. */
  nextRewardedResult: boolean;
  readonly calls: { method: 'rewarded' | 'interstitial'; slug: string; placement: string }[];
}

export function createScriptedAds(): ScriptedAds {
  const calls: ScriptedAds['calls'] = [];
  const ads: ScriptedAds = {
    nextRewardedResult: true,
    calls,
    async showRewarded(slug, placement) {
      calls.push({ method: 'rewarded', slug, placement });
      return ads.nextRewardedResult;
    },
    async showInterstitial(slug, placement) {
      calls.push({ method: 'interstitial', slug, placement });
    },
  };
  return ads;
}

export interface MockHost {
  host: HostCore;
  storage: StorageAdapter;
  ads: ScriptedAds;
  analytics: AnalyticsAdapter;
}

export interface MockHostOverrides extends Partial<Omit<MockHost, 'host'>> {
  /** Supply these to keep the host off `navigator` and `matchMedia` in tests. */
  context?: HostDeps['context'];
  onLocaleChanged?: HostDeps['onLocaleChanged'];
  /**
   * Left out by default on purpose: a host with nowhere to go should answer
   * `exitToHub` with `UNKNOWN_METHOD`, and a test that never wires it is the
   * one that proves it.
   */
  onExitToHub?: HostDeps['onExitToHub'];
}

export function createMockHost(overrides: MockHostOverrides = {}): MockHost {
  const storage = overrides.storage ?? createMemoryStorage();
  const ads = overrides.ads ?? createScriptedAds();
  const analytics = overrides.analytics ?? createBufferedAnalytics();
  const context = overrides.context ?? { locale: 'en', isInstalled: false, isMuted: false };
  const host = createHost({
    storage,
    ads,
    analytics,
    context,
    ...(overrides.onLocaleChanged ? { onLocaleChanged: overrides.onLocaleChanged } : {}),
    ...(overrides.onExitToHub ? { onExitToHub: overrides.onExitToHub } : {}),
  });
  return { host, storage, ads, analytics };
}
