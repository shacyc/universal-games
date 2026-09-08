import { describe, expect, it } from 'vitest';
import { withFrequencyCap } from '../src/host/adapters/frequency-cap.js';
import { createScriptedAds } from '../src/testing/mock-adapters.js';

describe('withFrequencyCap', () => {
  function setup(options: { firstSession?: boolean; hasPass?: boolean } = {}) {
    const ads = createScriptedAds();
    let now = 1_000_000;
    const capped = withFrequencyCap(ads, {
      isFirstSession: () => options.firstSession ?? false,
      hasPass: () => options.hasPass ?? false,
      now: () => now,
    });
    return { ads, capped, advance: (ms: number) => (now += ms) };
  }

  it('suppresses interstitials during the first session', async () => {
    const { ads, capped } = setup({ firstSession: true });
    await capped.showInterstitial('g', 'run_end');
    expect(ads.calls).toEqual([]);
  });

  it('suppresses interstitials for pass holders', async () => {
    const { ads, capped } = setup({ hasPass: true });
    await capped.showInterstitial('g', 'run_end');
    expect(ads.calls).toEqual([]);
  });

  it('enforces the 90s gap between interstitials', async () => {
    const { ads, capped, advance } = setup();
    await capped.showInterstitial('g', 'run_end');
    advance(89_000);
    await capped.showInterstitial('g', 'run_end');
    expect(ads.calls).toHaveLength(1);

    advance(2_000);
    await capped.showInterstitial('g', 'run_end');
    expect(ads.calls).toHaveLength(2);
  });

  it('never caps rewarded ads — the player asked for them', async () => {
    const { ads, capped } = setup({ firstSession: true, hasPass: true });
    await capped.showRewarded('g', 'undo');
    await capped.showRewarded('g', 'undo');
    expect(ads.calls).toHaveLength(2);
  });
});
