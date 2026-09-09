import type { GameContext, HostEvent, HostEventType, Response } from '../protocol.js';
import { createFrameTransport } from './frame-transport.js';
import { Rpc } from './rpc.js';
import type { ClientTransport, PlatformSDK } from './types.js';

export type { PlatformSDK, ClientTransport } from './types.js';
export { RpcError, RpcTimeoutError } from './rpc.js';

const DEFAULT_TIMEOUT_MS = 5_000;
/** Ads block on a human, not on the host. Only guard against a truly dead host. */
const AD_TIMEOUT_MS = 300_000;

export interface CreateClientOptions {
  /**
   * This game's slug. Used to namespace storage when the game runs without a
   * shell (installed PWA, standalone dev). When embedded, the host's own
   * mapping wins — a game is never trusted to name itself.
   */
  slug: string;
  /** Override transport selection. Mainly for tests. */
  transport?: ClientTransport;
}

type Listeners = { [K in HostEventType]: Set<(payload: never) => void> };

export function createClient(options: CreateClientOptions): PlatformSDK {
  const listeners: Listeners = { mute: new Set(), locale: new Set(), pause: new Set(), resume: new Set() };

  const transport: ClientTransport = options.transport ?? selectTransport(options.slug);
  const rpc = new Rpc((request) => transport.send(request));

  const ready = transport
    .connect({
      onResponse: (response: Response) => rpc.receive(response),
      onEvent: (event: HostEvent) => dispatch(listeners, event),
    })
    .then((context) => {
      rpc.open();
      if (context.slug !== options.slug) {
        console.warn(`[sdk] host mounted this frame as "${context.slug}", game declared "${options.slug}"`);
      }
      return context;
    });

  // A game that never calls ready() should not produce an unhandled rejection.
  void ready.catch(() => {});

  const call = (method: string, params?: unknown, timeout = DEFAULT_TIMEOUT_MS): Promise<unknown> =>
    ready.then(() => rpc.call(method, params, timeout));

  /** Lifecycle and analytics are fire-and-forget: they must never surface an error to the game. */
  const notify = (method: string, params?: unknown): void => {
    void call(method, params).catch((error: unknown) => {
      console.debug(`[sdk] ${method} failed`, error);
    });
  };

  return {
    ready: () => ready,

    getUser: () => call('getUser') as Promise<{ id: string; isAnonymous: boolean }>,

    load: () => call('load'),
    save: (state: unknown) => call('save', { state }).then(() => undefined),

    // Contract: an ad path never rejects. Wrapped here once, so no game has to
    // remember to do it, and a broken host degrades into "no reward offered".
    showRewarded: (placement: string) =>
      call('showRewarded', { placement }, AD_TIMEOUT_MS).then(
        (data) => data === true,
        () => false,
      ),

    showInterstitial: (placement: string) =>
      call('showInterstitial', { placement }, AD_TIMEOUT_MS).then(
        () => undefined,
        () => undefined,
      ),

    setLocale: (locale: string) => notify('setLocale', { locale }),
    exitToHub: () => notify('exitToHub'),

    gameStart: () => notify('gameStart'),
    gameOver: (payload: { score?: number }) => notify('gameOver', payload),
    track: (event: string, props?: Record<string, string | number | boolean>) =>
      notify('track', props === undefined ? { event } : { event, props }),

    onMuteChange: (listener) => subscribe(listeners, 'mute', listener),
    onLocaleChange: (listener) => subscribe(listeners, 'locale', listener),
    onPause: (listener) => subscribe(listeners, 'pause', listener),
    onResume: (listener) => subscribe(listeners, 'resume', listener),
  };
}

function selectTransport(slug: string): ClientTransport {
  if (isFramed()) return createFrameTransport();

  // No shell above us: installed PWA, direct navigation, or standalone dev.
  // The host is loaded lazily so embedded games never pay for its bundle.
  return createDeferredLocalTransport(slug);
}

function isFramed(): boolean {
  try {
    return window.parent !== window;
  } catch {
    return true; // cross-origin parent access threw; we are definitely framed
  }
}

/** Wraps the dynamic import of the standalone host behind the transport interface. */
function createDeferredLocalTransport(slug: string): ClientTransport {
  let inner: ClientTransport | undefined;
  const pending: Parameters<ClientTransport['send']>[0][] = [];

  return {
    async connect(handlers) {
      const [{ createStandaloneHost }, { createLocalTransport }] = await Promise.all([
        import('../host/standalone.js'),
        import('./local-transport.js'),
      ]);
      inner = createLocalTransport(createStandaloneHost({ slug }), slug);
      const context = await inner.connect(handlers);
      for (const request of pending.splice(0)) inner.send(request);
      return context;
    },
    send(request) {
      if (inner) inner.send(request);
      else pending.push(request);
    },
    close() {
      inner?.close();
      inner = undefined;
    },
  };
}

function subscribe<T extends HostEventType>(
  listeners: Listeners,
  type: T,
  listener: (payload: never) => void,
): () => void {
  listeners[type].add(listener);
  return () => listeners[type].delete(listener);
}

function dispatch(listeners: Listeners, event: HostEvent): void {
  for (const listener of listeners[event.type]) {
    const fn = listener as unknown as (payload?: unknown) => void;
    // Only the data-carrying events have a payload; pause/resume are bare.
    if (event.type === 'mute') fn(event.data.isMuted);
    else if (event.type === 'locale') fn(event.data.locale);
    else fn(undefined);
  }
}

export type { GameContext };
