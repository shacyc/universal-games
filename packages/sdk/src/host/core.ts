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
  subscribeEvents(listener: (event: HostEvent) => void): () => void;
  setMuted(isMuted: boolean): void;
  isMuted(): boolean;
}

export function createHost(deps: HostDeps): HostCore {
  const listeners = new Set<(event: HostEvent) => void>();
  /** Tracks the current run per game so `gameOver` can be made idempotent. */
  const runs = new Map<string, { id: number; ended: boolean }>();
  let nextRunId = 1;
  let muted = deps.context?.isMuted ?? false;

  function emit(event: HostEvent): void {
    for (const listener of listeners) listener(event);
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
        return ok(request.id, await deps.ads.showRewarded(slug, placement));
      }

      case 'showInterstitial': {
        const placement = params.placement;
        if (typeof placement !== 'string') return err(request.id, 'BAD_PARAMS', 'showInterstitial requires a placement');
        await deps.ads.showInterstitial(slug, placement);
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
        locale: deps.context?.locale ?? navigator.language,
        isInstalled: deps.context?.isInstalled ?? detectInstalled(),
        isMuted: muted,
      };
    },

    subscribeEvents(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    setMuted(isMuted) {
      if (isMuted === muted) return;
      muted = isMuted;
      emit({ v: PROTOCOL_VERSION, type: 'mute', data: { isMuted } });
    },

    isMuted: () => muted,
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
