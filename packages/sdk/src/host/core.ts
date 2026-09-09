import {
  err,
  isRequest,
  ok,
  PROTOCOL_VERSION,
  type GameContext,
  type HostEvent,
  type Request,
  type Response,
} from '../protocol.js';
import type { AdsAdapter, AnalyticsAdapter, StorageAdapter } from './adapters/types.js';

export interface HostDeps {
  storage: StorageAdapter;
  ads: AdsAdapter;
  analytics: AnalyticsAdapter;
  /** Overrides for context fields the environment cannot infer. */
  context?: Partial<Pick<GameContext, 'locale' | 'isInstalled' | 'isMuted'>>;
  /**
   * The language changed — including when a game's own settings screen asked
   * for it (decision 18). The embedder persists it and re-renders whatever it
   * has of its own; the host has already told every mounted game.
   */
  onLocaleChanged?: (locale: string) => void;
  /**
   * A game asked to leave. The embedder navigates: the shell back to the hub,
   * a standalone document to `/`. Omitted, the request is answered with
   * `UNKNOWN_METHOD`, which is the truth — this host has nowhere to go.
   */
  onExitToHub?: () => void;
}

export interface HostCore {
  /**
   * Handles one request on behalf of `slug`. The slug is supplied by the
   * caller (the shell knows which iframe it mounted) and never read from the
   * message — a same-origin game must not be able to name itself into another
   * game's save data.
   */
  handle(slug: string, request: unknown): Promise<Response | null>;
  context(slug: string): GameContext;
  /**
   * Subscribes one mounted game to host events. The slug is what makes
   * `pause`/`resume` deliverable: they concern the game the host just covered,
   * not every game the host knows about. Broadcast events (`mute`) reach every
   * subscriber regardless.
   */
  subscribeEvents(slug: string, listener: (event: HostEvent) => void): () => void;
  setMuted(isMuted: boolean): void;
  isMuted(): boolean;
  /**
   * Sets the platform language from the embedder's side. A game's own settings
   * screen reaches the same code through the `setLocale` request.
   */
  setLocale(locale: string): void;
  locale(): string;
}

export function createHost(deps: HostDeps): HostCore {
  const listeners = new Set<{ slug: string; listener: (event: HostEvent) => void }>();
  /** Tracks the current run per game so `gameOver` can be made idempotent. */
  const runs = new Map<string, { id: number; ended: boolean }>();
  /**
   * How many overlays are currently covering each game. A counter rather than
   * a flag: a game that manages to have two ad calls in flight must still see
   * exactly one `pause` and one `resume`.
   */
  const covered = new Map<string, number>();
  let nextRunId = 1;
  let muted = deps.context?.isMuted ?? false;
  // Read once: navigator.language cannot change mid-session, and re-reading it
  // per context() would quietly undo a locale the player picked in the shell.
  let locale = deps.context?.locale ?? navigator.language;

  /** `target` undefined = every game; a slug = only that game. */
  function emit(event: HostEvent, target?: string): void {
    for (const entry of listeners) {
      if (target === undefined || entry.slug === target) entry.listener(event);
    }
  }

  /**
   * The one place the language changes, whoever asked. Both `setLocale` on this
   * interface and the `setLocale` request a game sends land here, so the shell's
   * picker and a game's own settings screen cannot drift apart.
   */
  function adoptLocale(next: string): void {
    if (next === locale) return;
    locale = next;
    emit({ v: PROTOCOL_VERSION, type: 'locale', data: { locale: next } });
    deps.onLocaleChanged?.(next);
  }

  /**
   * Brackets anything that covers the game with `pause`/`resume`.
   *
   * Games must not have to guess when they are obscured: an ad overlay stops
   * the player interacting, and a real-time game that keeps ticking under one
   * kills the player while they are watching an ad they chose to watch.
   *
   * `resume` fires even when nothing was actually shown — the frequency cap
   * suppressed the interstitial, or a real network reports no fill. That is
   * inherent rather than a v0 wart, so the contract is that a game's `resume`
   * handler is idempotent and only restarts a loop that `pause` actually
   * stopped.
   */
  async function underOverlay<T>(slug: string, run: () => Promise<T>): Promise<T> {
    const depth = (covered.get(slug) ?? 0) + 1;
    covered.set(slug, depth);
    if (depth === 1) emit({ v: PROTOCOL_VERSION, type: 'pause' }, slug);

    try {
      return await run();
    } finally {
      const remaining = (covered.get(slug) ?? 1) - 1;
      if (remaining > 0) {
        covered.set(slug, remaining);
      } else {
        covered.delete(slug);
        emit({ v: PROTOCOL_VERSION, type: 'resume' }, slug);
      }
    }
  }

  async function dispatch(slug: string, request: Request): Promise<Response> {
    const params = (request.params ?? {}) as Record<string, unknown>;

    switch (request.method) {
      case 'getUser':
        return ok(request.id, await deps.storage.getUser());

      case 'load':
        return ok(request.id, await deps.storage.load(slug));

      case 'save': {
        if (!('state' in params)) return err(request.id, 'BAD_PARAMS', 'save requires { state }');
        await deps.storage.save(slug, params.state);
        return ok(request.id, null);
      }

      case 'showRewarded': {
        const placement = params.placement;
        if (typeof placement !== 'string') return err(request.id, 'BAD_PARAMS', 'showRewarded requires a placement');
        const watched = await underOverlay(slug, () => deps.ads.showRewarded(slug, placement));
        return ok(request.id, watched);
      }

      case 'showInterstitial': {
        const placement = params.placement;
        if (typeof placement !== 'string') return err(request.id, 'BAD_PARAMS', 'showInterstitial requires a placement');
        await underOverlay(slug, () => deps.ads.showInterstitial(slug, placement));
        return ok(request.id, null);
      }

      case 'gameStart': {
        runs.set(slug, { id: nextRunId++, ended: false });
        deps.analytics.track(slug, 'run_started', {});
        return ok(request.id, null);
      }

      case 'gameOver': {
        const run = runs.get(slug);
        // The docs say games must call this exactly once per run. Enforce it
        // here rather than trusting them: a double call would mean two
        // interstitials and a double-counted run.
        if (!run || run.ended) {
          console.debug(`[host] ignoring duplicate gameOver from "${slug}"`);
          return ok(request.id, null);
        }
        run.ended = true;
        const score = params.score;
        deps.analytics.track(slug, 'run_ended', typeof score === 'number' ? { score } : {});
        return ok(request.id, null);
      }

      case 'setLocale': {
        const next = params.locale;
        if (typeof next !== 'string' || next === '') {
          return err(request.id, 'BAD_PARAMS', 'setLocale requires a BCP 47 tag');
        }
        // Same path as the embedder's own setter, so a language picked inside a
        // game and one picked in the shell cannot behave differently.
        adoptLocale(next);
        return ok(request.id, null);
      }

      case 'exitToHub': {
        if (!deps.onExitToHub) {
          return err(request.id, 'UNKNOWN_METHOD', 'This host has no hub to return to');
        }
        deps.onExitToHub();
        return ok(request.id, null);
      }

      case 'track': {
        const event = params.event;
        if (typeof event !== 'string') return err(request.id, 'BAD_PARAMS', 'track requires an event name');
        const props = params.props;
        deps.analytics.track(slug, event, isProps(props) ? props : {});
        return ok(request.id, null);
      }

      default:
        // Version skew: a game cached by its own service worker can outlive
        // the shell build it was written against.
        return err(request.id, 'UNKNOWN_METHOD', `Host does not implement "${request.method}"`);
    }
  }

  return {
    async handle(slug, message) {
      if (!isRequest(message)) return null;
      try {
        return await dispatch(slug, message);
      } catch (error) {
        const code = error instanceof StorageError ? 'STORAGE_FAILED' : 'INTERNAL';
        return err(message.id, code, error instanceof Error ? error.message : String(error));
      }
    },

    context(slug) {
      return {
        slug,
        locale,
        isInstalled: deps.context?.isInstalled ?? detectInstalled(),
        isMuted: muted,
      };
    },

    subscribeEvents(slug, listener) {
      const entry = { slug, listener };
      listeners.add(entry);
      return () => listeners.delete(entry);
    },

    setMuted(isMuted) {
      if (isMuted === muted) return;
      muted = isMuted;
      emit({ v: PROTOCOL_VERSION, type: 'mute', data: { isMuted } });
    },

    isMuted: () => muted,

    setLocale: adoptLocale,

    locale: () => locale,
  };
}

export class StorageError extends Error {
  constructor(message: string, options?: { cause: unknown }) {
    super(message, options);
    this.name = 'StorageError';
  }
}

function isProps(value: unknown): value is Record<string, string | number | boolean> {
  if (typeof value !== 'object' || value === null) return false;
  return Object.values(value).every(
    (v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean',
  );
}

function detectInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari predates display-mode and still reports this instead.
  return (window.navigator as { standalone?: boolean }).standalone === true;
}
