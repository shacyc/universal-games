import { afterEach, describe, expect, it } from 'vitest';
import { readLocalePreference, writeLocalePreference } from '../src/host/locale-preference.js';

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
