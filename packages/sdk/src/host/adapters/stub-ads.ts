import { createAdOverlay, type AdOverlay } from '../overlay/ad-overlay.js';
import type { AdsAdapter } from './types.js';

/**
 * v0 ad "network": the real modal, the real timing, no network. Every rule
 * that survives the swap to a real network lives in `withFrequencyCap`, not
 * here — this file is the part that gets thrown away at v1.
 */
export function createStubAds(overlay: AdOverlay = createAdOverlay()): AdsAdapter {
  return {
    async showRewarded(_slug, placement) {
      try {
        return await overlay.showRewarded(labelFor(placement));
      } catch {
        return false; // an ad failure is never the player's problem
      }
    },
    async showInterstitial() {
      try {
        await overlay.showInterstitial();
      } catch {
        /* ignore */
      }
    },
  };
}

function labelFor(placement: string): string {
  switch (placement) {
    case 'undo':
      return 'Watch an ad to undo';
    case 'continue':
      return 'Watch an ad to continue';
    default:
      return 'Watch an ad';
  }
}
