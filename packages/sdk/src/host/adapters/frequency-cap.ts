import type { AdsAdapter } from './types.js';

/**
 * Interstitial frequency capping, as host policy rather than network policy —
 * wrapping the adapter means the rules survive swapping the ad network, and a
 * game can keep calling `showInterstitial` at every legal moment without
 * knowing any of this.
 *
 * Rewarded ads are never capped: the player asked for them.
 */
export interface FrequencyCapOptions {
  /** No interstitial within this window of the previous one. */
  minGapMs?: number;
  /** Suppress entirely during a player's first session. */
  isFirstSession: () => boolean;
  /** Pass holders never see interstitials. Always false in v0. */
  hasPass?: () => boolean;
  now?: () => number;
}

export function withFrequencyCap(ads: AdsAdapter, options: FrequencyCapOptions): AdsAdapter {
  const minGapMs = options.minGapMs ?? 90_000;
  const now = options.now ?? (() => Date.now());
  const hasPass = options.hasPass ?? (() => false);
  let lastShownAt = Number.NEGATIVE_INFINITY;

  return {
    showRewarded: (slug, placement) => ads.showRewarded(slug, placement),

    async showInterstitial(slug, placement) {
      const reason = suppressionReason();
      if (reason) {
        console.debug(`[ads] interstitial "${placement}" suppressed: ${reason}`);
        return;
      }
      lastShownAt = now();
      await ads.showInterstitial(slug, placement);
    },
  };

  function suppressionReason(): string | null {
    if (hasPass()) return 'pass holder';
    if (options.isFirstSession()) return 'first session';
    if (now() - lastShownAt < minGapMs) return 'within frequency cap';
    return null;
  }
}
