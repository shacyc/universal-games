import type { GameContext, HostEvent, Request, Response } from '../protocol.js';

/** The surface every game is written against. Keep it small. */
export interface PlatformSDK {
  /** Resolves once the handshake with the host has completed. */
  ready(): Promise<GameContext>;

  /**
   * Who is playing. `locale` is on the record because a language belongs to the
   * player rather than to the device — but **do not render from it**: it is a
   * snapshot, and the language can change while your game is open. Use
   * `watchLocale`, which gives you the current value *and* every change.
   */
  getUser(): Promise<{ id: string; isAnonymous: boolean; locale: string | null }>;

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

  /**
   * Sets the platform's language, from this game's own settings screen.
   *
   * Pass a tag this game ships. The host resolves and remembers it, tells every
   * mounted game through `onLocaleChange`, and keeps it for the next visit — so
   * the game does not persist anything itself. Fire-and-forget: the change
   * arrives back as a `locale` event, which is what the game re-renders from.
   */
  setLocale(locale: string): void;

  /**
   * Leaves the game and returns to the hub, from this game's own settings
   * screen. Embedded, the shell navigates; standalone, the browser does.
   *
   * Fire-and-forget, and there is no "it worked" — by the time it has, this
   * document is on its way out. Do not save after calling it; save first.
   */
  exitToHub(): void;

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
