import { describe, expect, it, vi } from 'vitest';
import { createClient, type PlatformSDK } from '../src/client/index.js';
import { createLocalTransport } from '../src/client/local-transport.js';
import { createSaveSlot, watchMute } from '../src/game/index.js';
import { createMemoryStorage, createMockHost } from '../src/testing/mock-adapters.js';
import type { ClientTransport } from '../src/client/types.js';
import type { StorageAdapter } from '../src/host/adapters/types.js';

const SLUG = 'test-game';

function connect(overrides: Parameters<typeof createMockHost>[0] = {}) {
  const mock = createMockHost(overrides);
  const sdk = createClient({ slug: SLUG, transport: createLocalTransport(mock.host, SLUG) });
  return { ...mock, sdk };
}

interface Run {
  v: 1;
  score: number;
}

const isRun = (raw: unknown): Run | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Partial<Run>;
  return r.v === 1 && typeof r.score === 'number' ? { v: 1, score: r.score } : null;
};

describe('createSaveSlot', () => {
  it('round-trips a validated state', async () => {
    const { sdk, storage } = connect();
    const slot = createSaveSlot(sdk, isRun);

    slot.save({ v: 1, score: 42 });
    await vi.waitFor(async () => expect(await storage.load(SLUG)).toEqual({ v: 1, score: 42 }));
    await expect(slot.load()).resolves.toEqual({ v: 1, score: 42 });
  });

  it('returns null when nothing has been saved', async () => {
    const { sdk } = connect();
    await expect(createSaveSlot(sdk, isRun).load()).resolves.toBeNull();
  });

  it('discards a payload the game no longer recognises', async () => {
    const { sdk } = connect({ storage: createMemoryStorage({ [SLUG]: { v: 0, tiles: 'old' } }) });
    await expect(createSaveSlot(sdk, isRun).load()).resolves.toBeNull();
  });

  it('treats a throwing validator as a discard rather than a crash', async () => {
    const { sdk } = connect({ storage: createMemoryStorage({ [SLUG]: { v: 1, score: 1 } }) });
    const slot = createSaveSlot<Run>(sdk, () => {
      throw new Error('validator blew up');
    });
    await expect(slot.load()).resolves.toBeNull();
  });

  it('suspends writing when the slot could not be read, so a real save is not overwritten', async () => {
    const storage: StorageAdapter = createMemoryStorage({ [SLUG]: { v: 1, score: 999 } });
    let readable = false;
    const realLoad = storage.load.bind(storage);
    storage.load = (slug) => (readable ? realLoad(slug) : Promise.reject(new Error('disk error')));

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { sdk } = connect({ storage });
    const slot = createSaveSlot(sdk, isRun);

    await expect(slot.load()).resolves.toBeNull();
    expect(slot.writable).toBe(false);

    slot.save({ v: 1, score: 1 });
    await new Promise((r) => setTimeout(r, 20));

    readable = true;
    // The stored run survived: nothing was written over it.
    await expect(storage.load(SLUG)).resolves.toEqual({ v: 1, score: 999 });
    warn.mockRestore();
  });

  it('resumes writing once a later read succeeds', async () => {
    const storage: StorageAdapter = createMemoryStorage();
    let readable = false;
    const realLoad = storage.load.bind(storage);
    storage.load = (slug) => (readable ? realLoad(slug) : Promise.reject(new Error('disk error')));

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { sdk } = connect({ storage });
    const slot = createSaveSlot(sdk, isRun);

    await slot.load();
    expect(slot.writable).toBe(false);

    readable = true;
    await slot.load();
    expect(slot.writable).toBe(true);

    slot.save({ v: 1, score: 7 });
    await vi.waitFor(async () => expect(await storage.load(SLUG)).toEqual({ v: 1, score: 7 }));
    warn.mockRestore();
  });

  it('never surfaces a write failure to the game', async () => {
    const storage = createMemoryStorage();
    storage.save = () => Promise.reject(new Error('quota exceeded'));
    const { sdk } = connect({ storage });
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});

    expect(() => createSaveSlot(sdk, isRun).save({ v: 1, score: 3 })).not.toThrow();
    await new Promise((r) => setTimeout(r, 20));
    debug.mockRestore();
  });
});

describe('watchMute', () => {
  it('delivers the current platform value before any change', async () => {
    const { sdk } = connect({ context: { locale: 'en', isInstalled: false, isMuted: true } });
    const seen: boolean[] = [];
    watchMute(sdk, (m) => seen.push(m));
    await vi.waitFor(() => expect(seen).toEqual([true]));
  });

  it('delivers changes after the initial value', async () => {
    const { sdk, host } = connect();
    const seen: boolean[] = [];
    watchMute(sdk, (m) => seen.push(m));
    await sdk.ready();
    await vi.waitFor(() => expect(seen).toEqual([false]));

    host.setMuted(true);
    host.setMuted(false);
    expect(seen).toEqual([false, true, false]);
  });

  it('does not repeat a value that has not changed', async () => {
    const { sdk, host } = connect({ context: { locale: 'en', isInstalled: false, isMuted: false } });
    const seen: boolean[] = [];
    watchMute(sdk, (m) => seen.push(m));
    await sdk.ready();
    await vi.waitFor(() => expect(seen).toHaveLength(1));

    host.setMuted(false); // already unmuted
    expect(seen).toEqual([false]);
  });

  it('stops delivering after unsubscribe', async () => {
    const { sdk, host } = connect();
    const seen: boolean[] = [];
    const off = watchMute(sdk, (m) => seen.push(m));
    await sdk.ready();
    await vi.waitFor(() => expect(seen).toHaveLength(1));

    off();
    host.setMuted(true);
    expect(seen).toEqual([false]);
  });

  it('still fires once when there is no host to ask', async () => {
    const dead: ClientTransport = {
      connect: () => Promise.reject(new Error('no host')),
      send: () => {},
      close: () => {},
    };
    const sdk: PlatformSDK = createClient({ slug: SLUG, transport: dead });
    const seen: boolean[] = [];
    watchMute(sdk, (m) => seen.push(m));
    await vi.waitFor(() => expect(seen).toEqual([false]));
  });

  it('still delivers the current value when the game subscribes after ready()', async () => {
    const { sdk } = connect({ context: { locale: 'en', isInstalled: false, isMuted: true } });
    await sdk.ready();

    const seen: boolean[] = [];
    watchMute(sdk, (m) => seen.push(m));
    await vi.waitFor(() => expect(seen).toEqual([true]));
  });
});
