export interface StorageAdapter {
  getUser(): Promise<{ id: string; isAnonymous: boolean }>;
  /** Returns the last saved state for this game, or `null`. */
  load(slug: string): Promise<unknown>;
  save(slug: string, state: unknown): Promise<void>;
}

export interface AdsAdapter {
  /** `true` only when watched to completion. Must never reject. */
  showRewarded(slug: string, placement: string): Promise<boolean>;
  /** Subject to host-side frequency capping. Must never reject. */
  showInterstitial(slug: string, placement: string): Promise<void>;
}

export interface AnalyticsAdapter {
  track(slug: string, event: string, props: Record<string, string | number | boolean>): void;
}
