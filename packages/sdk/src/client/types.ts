import type { GameContext, HostEvent, Request, Response } from '../protocol.js';

/** The surface every game is written against. Keep it small. */
export interface PlatformSDK {
  /** Resolves once the handshake with the host has completed. */
  ready(): Promise<GameContext>;

  getUser(): Promise<{ id: string; isAnonymous: boolean }>;

  /**
   * Returns whatever was last saved, or `null`. Deliberately `unknown`:
   * a save may have been written by an older build of this game, so the
   * game validates the shape before trusting it.
   */
  load(): Promise<unknown>;
  save(state: unknown): Promise<void>;

  /** Resolves `true` only if the ad was watched to completion. Never rejects. */
  showRewarded(placement: string): Promise<boolean>;
  /** A request, not a command — the host applies frequency capping. Never rejects. */
  showInterstitial(placement: string): Promise<void>;

  gameStart(): void;
  gameOver(payload: { score?: number }): void;

  track(event: string, props?: Record<string, string | number | boolean>): void;

  /** Platform mute changes. Returns an unsubscribe function. */
  onMuteChange(listener: (isMuted: boolean) => void): () => void;
  /** Platform language changes. Prefer `watchLocale` — it resolves the tag. */
  onLocaleChange(listener: (locale: string) => void): () => void;
  /** The shell has covered the game (its own modal, background tab, ad). */
  onPause(listener: () => void): () => void;
  onResume(listener: () => void): () => void;
}

export interface TransportHandlers {
  onResponse(response: Response): void;
  onEvent(event: HostEvent): void;
}

/**
 * How the client reaches a host. Two implementations exist:
 * `frame` (embedded in the shell, via MessagePort) and `local`
 * (installed PWA or standalone dev — the host runs in this document).
 */
export interface ClientTransport {
  connect(handlers: TransportHandlers): Promise<GameContext>;
  send(request: Request): void;
  close(): void;
}
