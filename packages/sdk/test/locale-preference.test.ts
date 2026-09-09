import { afterEach, describe, expect, it } from 'vitest';
import {
  readLocalePreference,
  watchLocalePreference,
  writeLocalePreference,
} from '../src/host/locale-preference.js';

/**
 * The preference is the only piece of the language feature that outlives the
 * tab, and it is read by two hosts that never meet: the shell, and a game
 * booted standalone from its own installed icon. Both paths go through these
 * two functions, so both are worth pinning.
 */
function stubStorage(store: Map<string, string>): void {
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    },
  };
}

function breakStorage(): void {
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('blocked');
      },
    },
  };
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe('locale preference', () => {
  it('round-trips the chosen tag', () => {
    const store = new Map<string, string>();
    stubStorage(store);
    writeLocalePreference('vi');
    expect(readLocalePreference()).toBe('vi');
  });

  it('reads as "never chosen" before anything is written', () => {
    stubStorage(new Map());
    expect(readLocalePreference()).toBeNull();
  });

  it('reads as "never chosen" rather than throwing when storage is blocked', () => {
    breakStorage();
    expect(readLocalePreference()).toBeNull();
  });

  it('does not throw when the choice cannot be persisted', () => {
    breakStorage();
    expect(() => writeLocalePreference('vi')).not.toThrow();
  });

  it('treats an empty string as no choice, not as a locale', () => {
    const store = new Map<string, string>([['arcade:locale', '']]);
    stubStorage(store);
    // An empty tag would resolve to the fallback anyway, but it would also
    // stop the browser's language from being consulted on a fresh profile.
    expect(readLocalePreference()).toBeNull();
  });
});

describe('cross-tab', () => {
  /** What a browser hands the other tabs when one of them writes. */
  function fireStorage(init: { key: string | null; newValue: string | null }): void {
    const w = (globalThis as { window?: { __on?: ((e: unknown) => void)[] } }).window;
    for (const listener of w?.__on ?? []) listener(init);
  }

  function stubWindowWithEvents(): void {
    const handlers: ((e: unknown) => void)[] = [];
    (globalThis as { window?: unknown }).window = {
      __on: handlers,
      addEventListener: (type: string, fn: (e: unknown) => void) => {
        if (type === 'storage') handlers.push(fn);
      },
      removeEventListener: (type: string, fn: (e: unknown) => void) => {
        if (type !== 'storage') return;
        const i = handlers.indexOf(fn);
        if (i >= 0) handlers.splice(i, 1);
      },
    };
  }

  it('a language set in another tab reaches this one', () => {
    stubWindowWithEvents();
    const seen: string[] = [];
    watchLocalePreference((tag) => seen.push(tag));

    fireStorage({ key: 'arcade:locale', newValue: 'vi' });
    expect(seen).toEqual(['vi']);
  });

  it('ignores every other key — the origin stores more than this', () => {
    stubWindowWithEvents();
    const seen: string[] = [];
    watchLocalePreference((tag) => seen.push(tag));

    fireStorage({ key: 'arcade:theme', newValue: 'modern' });
    fireStorage({ key: 'arcade:install', newValue: '{}' });
    expect(seen).toEqual([]);
  });

  it('treats a cleared key as "no new choice", not as a choice of nothing', () => {
    stubWindowWithEvents();
    const seen: string[] = [];
    watchLocalePreference((tag) => seen.push(tag));

    fireStorage({ key: 'arcade:locale', newValue: null });
    fireStorage({ key: 'arcade:locale', newValue: '' });
    expect(seen).toEqual([]);
  });

  it('stops when unsubscribed', () => {
    stubWindowWithEvents();
    const seen: string[] = [];
    const off = watchLocalePreference((tag) => seen.push(tag));
    off();

    fireStorage({ key: 'arcade:locale', newValue: 'vi' });
    expect(seen).toEqual([]);
  });

  it('is a no-op with no window at all rather than throwing', () => {
    delete (globalThis as { window?: unknown }).window;
    expect(() => watchLocalePreference(() => {})()).not.toThrow();
  });
});

describe('what gets stored', () => {
  it('keeps the tag verbatim — resolution belongs at render, not at storage', () => {
    const store = new Map<string, string>();
    stubStorage(store);
    // A game may ship a locale the hub does not. Storing what the hub could
    // render would let the shortest list on the origin win.
    writeLocalePreference('fr-CA');
    expect(readLocalePreference()).toBe('fr-CA');
  });
});
