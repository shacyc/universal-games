/**
 * Every `sdk.*` call this game makes, in one module (hard rule: no other file
 * imports `@platform/sdk/client`). Keeping them here is what makes the
 * monetisation and lifecycle rules reviewable in one place, and what makes a
 * future SDK change one file to touch.
 *
 * The rules the SDK docs put on these calls are enforced here, not scattered:
 * a rewarded ad never punishes the player, and the interstitial is only ever
 * asked for when the player chooses a new game.
 */
import { createClient, type GameContext } from '@platform/sdk/client';
import { createSaveSlot, watchLocale, watchMute } from '@platform/sdk/game';
import { isSaveState, type SaveState } from './save.js';
import { SUPPORTED } from './i18n/index.js';

export type { SaveState };

export interface RunEnd {
  score: number;
  /** Final body length — reported as `length` in analytics. */
  length: number;
  durationMs: number;
}

export interface Session {
  ready(): Promise<GameContext>;
  load(): Promise<SaveState | null>;
  /** Fire-and-forget; the host debounces. No game-side debounce or flush. */
  save(state: SaveState): void;

  /** Opens a run. Call on a new run *and* on a run restored from save. */
  startRun(): void;
  /** Closes a run — once, after any revive has been spent or declined. */
  endRun(end: RunEnd): void;

  /**
   * The revive offer. Resolves `false` on decline, no-fill or failure and
   * never rejects; `false` must change nothing (hard rule 5).
   */
  offerRevive(): Promise<boolean>;
  /**
   * Legal only when the player taps "New game", after the score has been
   * shown — never on the game-over screen itself. The host may suppress it.
   */
  interstitialBeforeNewGame(): Promise<void>;

  track(event: string, props?: Record<string, string | number | boolean>): void;

  onMuteChange(listener: (muted: boolean) => void): () => void;
  /**
   * The platform language, resolved to one this game ships. Fires once with the
   * current value, then on every change — including the ones this game's own
   * settings screen asks for. Re-render from here, never from the click.
   */
  onLocaleChange(listener: (locale: string) => void): () => void;
  /** The host covered the game (an ad overlay). Stop the clock. */
  onPause(listener: () => void): () => void;
  /** The overlay is gone. Idempotent — it fires even when nothing was shown. */
  onResume(listener: () => void): () => void;

  /** From the settings screen. The platform owns the outcome; it arrives via
   *  `onLocaleChange`. */
  setLocale(locale: string): void;
  /** From the settings screen. This document is leaving — save before calling. */
  exitToHub(): void;
}

export function createSession(): Session {
  const sdk = createClient({ slug: 'snake' });
  const slot = createSaveSlot(sdk, isSaveState);

  return {
    ready: () => sdk.ready(),
    load: () => slot.load(),
    save: (state) => slot.save(state),

    startRun() {
      sdk.gameStart();
      sdk.track('run_start');
    },

    endRun({ score, length, durationMs }) {
      // The host issues a run id on gameStart and ignores a duplicate here, but
      // the game still calls this exactly once per run.
      sdk.gameOver({ score });
      sdk.track('run_end', { score, length, duration_ms: durationMs });
    },

    offerRevive: () => sdk.showRewarded('revive'),
    interstitialBeforeNewGame: () => sdk.showInterstitial('run_end'),

    track: (event, props) => sdk.track(event, props),

    onMuteChange: (listener) => watchMute(sdk, listener),
    onLocaleChange: (listener) => watchLocale(sdk, SUPPORTED, listener),
    onPause: (listener) => sdk.onPause(listener),
    onResume: (listener) => sdk.onResume(listener),

    setLocale: (locale) => sdk.setLocale(locale),
    exitToHub: () => sdk.exitToHub(),
  };
}
