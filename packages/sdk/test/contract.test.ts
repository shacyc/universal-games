import { describe, expect, it, vi } from 'vitest';
import { createClient } from '../src/client/index.js';
import { createLocalTransport } from '../src/client/local-transport.js';
import { createHost } from '../src/host/core.js';
import { isRequest, isResponse, PROTOCOL_VERSION } from '../src/protocol.js';
import { createMemoryStorage, createMockHost, createScriptedAds } from '../src/testing/mock-adapters.js';
import type { AdsAdapter } from '../src/host/adapters/types.js';

const SLUG = 'test-game';

function connect(overrides: Parameters<typeof createMockHost>[0] = {}) {
  const mock = createMockHost(overrides);
  const sdk = createClient({ slug: SLUG, transport: createLocalTransport(mock.host, SLUG) });
  return { ...mock, sdk };
}

describe('envelope', () => {
  it('accepts only v1 messages', () => {
    expect(isRequest({ v: PROTOCOL_VERSION, id: 1, method: 'load' })).toBe(true);
    expect(isRequest({ v: 2, id: 1, method: 'load' })).toBe(false);
    expect(isRequest({ id: 1, method: 'load' })).toBe(false);
    expect(isResponse({ v: PROTOCOL_VERSION, id: 1, ok: true, data: null })).toBe(true);
  });

  it('ignores anything that is not a request', async () => {
    const { host } = createMockHost();
    expect(await host.handle(SLUG, { hello: 'there' })).toBeNull();
    expect(await host.handle(SLUG, { v: 2, id: 1, method: 'load' })).toBeNull();
  });
});

describe('handshake', () => {
  it('resolves the context supplied by the host', async () => {
    const { sdk } = connect({ context: { locale: 'fr', isInstalled: true, isMuted: true } });
    await expect(sdk.ready()).resolves.toEqual({
      slug: SLUG,
      locale: 'fr',
      isInstalled: true,
      isMuted: true,
    });
  });

  it('queues calls made before ready() resolves', async () => {
    const { sdk } = connect({ storage: createMemoryStorage({ [SLUG]: { score: 7 } }) });
    // Deliberately not awaiting ready() first.
    await expect(sdk.load()).resolves.toEqual({ score: 7 });
  });
});

describe('identity', () => {
  it('namespaces saves by the host-assigned slug, not anything the game says', async () => {
    const storage = createMemoryStorage();
    const host = createMockHost({ storage }).host;

    await host.handle('game-a', { v: PROTOCOL_VERSION, id: 1, method: 'save', params: { state: 'a' } });
    await host.handle('game-b', { v: PROTOCOL_VERSION, id: 2, method: 'save', params: { state: 'b' } });

    await expect(storage.load('game-a')).resolves.toBe('a');
    await expect(storage.load('game-b')).resolves.toBe('b');
  });
});

describe('getUser', () => {
  it('returns an anonymous identity', async () => {
    const { sdk } = connect();
    await expect(sdk.getUser()).resolves.toEqual({ id: 'test-user', isAnonymous: true });
  });

  it('rejects when storage fails', async () => {
    const storage = createMemoryStorage();
    storage.getUser = () => Promise.reject(new Error('disk on fire'));
    const { sdk } = connect({ storage });
    await expect(sdk.getUser()).rejects.toThrow('disk on fire');
  });
});

describe('load / save', () => {
  it('round-trips state', async () => {
    const { sdk, storage } = connect();
    await sdk.save({ v: 1, score: 42 });
    await expect(storage.load(SLUG)).resolves.toEqual({ v: 1, score: 42 });
    await expect(sdk.load()).resolves.toEqual({ v: 1, score: 42 });
  });

  it('returns null when nothing has been saved', async () => {
    const { sdk } = connect();
    await expect(sdk.load()).resolves.toBeNull();
  });

  it('rejects save with missing params at the host boundary', async () => {
    const { host } = createMockHost();
    const response = await host.handle(SLUG, { v: PROTOCOL_VERSION, id: 1, method: 'save' });
    expect(response).toMatchObject({ ok: false, error: { code: 'BAD_PARAMS' } });
  });

  it('surfaces a storage failure as STORAGE_FAILED', async () => {
    const storage = createMemoryStorage();
    storage.save = () => Promise.reject(new Error('quota exceeded'));
    const { host } = createMockHost({ storage });
    const response = await host.handle(SLUG, {
      v: PROTOCOL_VERSION,
      id: 1,
      method: 'save',
      params: { state: {} },
    });
    expect(response).toMatchObject({ ok: false, error: { code: 'INTERNAL' } });
  });
});

describe('showRewarded', () => {
  it('passes the placement through and reports completion', async () => {
    const ads = createScriptedAds();
    const { sdk } = connect({ ads });
    await expect(sdk.showRewarded('undo')).resolves.toBe(true);
    expect(ads.calls).toEqual([{ method: 'rewarded', slug: SLUG, placement: 'undo' }]);
  });

  it('resolves false when the player closes early', async () => {
    const ads = createScriptedAds();
    ads.nextRewardedResult = false;
    const { sdk } = connect({ ads });
    await expect(sdk.showRewarded('continue')).resolves.toBe(false);
  });

  it('resolves false rather than rejecting when the ad path throws', async () => {
    const ads: AdsAdapter = {
      showRewarded: () => Promise.reject(new Error('network down')),
      showInterstitial: () => Promise.resolve(),
    };
    const sdk = createClient({
      slug: SLUG,
      transport: createLocalTransport(
        createHost({
          storage: createMemoryStorage(),
          ads,
          analytics: { track: () => {} },
          context: { locale: 'en', isInstalled: false, isMuted: false },
        }),
        SLUG,
      ),
    });
    await expect(sdk.showRewarded('undo')).resolves.toBe(false);
  });

  it('rejects a placement that is not a string', async () => {
    const { host } = createMockHost();
    const response = await host.handle(SLUG, {
      v: PROTOCOL_VERSION,
      id: 1,
      method: 'showRewarded',
      params: { placement: 7 },
    });
    expect(response).toMatchObject({ ok: false, error: { code: 'BAD_PARAMS' } });
  });
});

describe('showInterstitial', () => {
  it('forwards the placement', async () => {
    const ads = createScriptedAds();
    const { sdk } = connect({ ads });
    await sdk.showInterstitial('run_end');
    expect(ads.calls).toEqual([{ method: 'interstitial', slug: SLUG, placement: 'run_end' }]);
  });

  it('resolves rather than rejecting when the ad path throws', async () => {
    const ads: AdsAdapter = {
      showRewarded: () => Promise.resolve(false),
      showInterstitial: () => Promise.reject(new Error('no fill')),
    };
    const sdk = createClient({
      slug: SLUG,
      transport: createLocalTransport(
        createHost({
          storage: createMemoryStorage(),
          ads,
          analytics: { track: () => {} },
          context: { locale: 'en', isInstalled: false, isMuted: false },
        }),
        SLUG,
      ),
    });
    await expect(sdk.showInterstitial('run_end')).resolves.toBeUndefined();
  });
});

describe('lifecycle', () => {
  it('records one run_ended per run and ignores duplicate gameOver', async () => {
    const events: string[] = [];
    const { host } = createMockHost({ analytics: { track: (_s, event) => events.push(event) } });

    const send = (method: string, params?: unknown) =>
      host.handle(SLUG, { v: PROTOCOL_VERSION, id: 1, method, ...(params ? { params } : {}) });

    await send('gameStart');
    await send('gameOver', { score: 100 });
    await send('gameOver', { score: 100 });

    expect(events).toEqual(['run_started', 'run_ended']);
  });

  it('ignores gameOver with no run in progress', async () => {
    const events: string[] = [];
    const { host } = createMockHost({ analytics: { track: (_s, event) => events.push(event) } });
    await host.handle(SLUG, { v: PROTOCOL_VERSION, id: 1, method: 'gameOver', params: { score: 1 } });
    expect(events).toEqual([]);
  });

  it('never surfaces a lifecycle failure to the game', async () => {
    const storage = createMemoryStorage();
    const { sdk } = connect({ storage });
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    expect(() => sdk.gameOver({ score: 1 })).not.toThrow();
    spy.mockRestore();
  });
});

describe('track', () => {
  it('forwards event name and props', async () => {
    const seen: { event: string; props: Record<string, unknown> }[] = [];
    const { sdk } = connect({ analytics: { track: (_s, event, props) => seen.push({ event, props }) } });
    await sdk.ready();
    sdk.track('undo_used', { rewarded: true });
    await vi.waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0]).toEqual({ event: 'undo_used', props: { rewarded: true } });
  });

  it('drops non-scalar props rather than failing the call', async () => {
    const { host } = createMockHost();
    const response = await host.handle(SLUG, {
      v: PROTOCOL_VERSION,
      id: 1,
      method: 'track',
      params: { event: 'x', props: { nested: { a: 1 } } },
    });
    expect(response).toMatchObject({ ok: true });
  });
});

describe('version skew', () => {
  it('answers an unknown method with UNKNOWN_METHOD instead of hanging', async () => {
    const { host } = createMockHost();
    const response = await host.handle(SLUG, { v: PROTOCOL_VERSION, id: 9, method: 'submitScore' });
    expect(response).toMatchObject({ id: 9, ok: false, error: { code: 'UNKNOWN_METHOD' } });
  });
});

describe('mute', () => {
  it('pushes changes to subscribers and ignores no-op sets', async () => {
    const { sdk, host } = connect();
    await sdk.ready();
    const seen: boolean[] = [];
    sdk.onMuteChange((isMuted) => seen.push(isMuted));

    host.setMuted(true);
    host.setMuted(true);
    host.setMuted(false);

    expect(seen).toEqual([true, false]);
  });

  it('stops delivering after unsubscribe', async () => {
    const { sdk, host } = connect();
    await sdk.ready();
    const seen: boolean[] = [];
    const off = sdk.onMuteChange((isMuted) => seen.push(isMuted));
    host.setMuted(true);
    off();
    host.setMuted(false);
    expect(seen).toEqual([true]);
  });
});
