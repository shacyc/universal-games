/**
 * Who is playing, and the settings that belong to *them* rather than to the
 * device they are on.
 *
 * `locale` lives here on purpose. A language is a property of the player, so
 * fetching the user is what tells you which language to render in — one read at
 * boot, no separate device-local key to keep in step. Today the record is
 * local-first in IndexedDB and the id is anonymous; when the API lands the same
 * record comes from the server and the language arrives with it, with nothing
 * to change in the shell or in any game.
 */
export interface User {
  id: string;
  isAnonymous: boolean;
  /** BCP 47 tag, verbatim as the player chose it. `null` = never chosen. */
  locale: string | null;
}

export interface StorageAdapter {
  getUser(): Promise<User>;
  /** Records the player's language on their user record. */
  saveUserLocale(locale: string): Promise<void>;
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
