import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The shell's locale store, exercised against stubbed globals rather than a
 * jsdom dependency — it touches exactly two browser things (`localStorage` and
 * `document.documentElement.lang`) and stubbing those is more honest about what
 * is under test than pulling in a DOM.
 *
 * What is being pinned is one property: **the player's choice is what gets
 * stored and broadcast, and the shell's own translation status never narrows
 * it.** Getting this wrong is silent — the hub simply overwrites a language a
 * game could have rendered, and nothing errors.
 */
const KEY = 'arcade:locale';

interface Env {
  store: Map<string, string>;
  lang: () => string;
  storage: (key: string, newValue: string | null) => void;
}

let env: Env;

async function load(stored: string | null, browserLanguage = 'en-US') {
  const store = new Map<string, string>();
  if (stored !== null) store.set(KEY, stored);
  const handlers: ((e: unknown) => void)[] = [];
  const documentElement = { lang: '' };

  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
    addEventListener: (type: string, fn: (e: unknown) => void) => {
      if (type === 'storage') handlers.push(fn);
    },
    removeEventListener: () => {},
  });
  vi.stubGlobal('document', { documentElement });
  vi.stubGlobal('navigator', { language: browserLanguage });

  env = {
    store,
    lang: () => documentElement.lang,
    storage: (key, newValue) => {
      for (const fn of handlers) fn({ key, newValue });
    },
  };

  // Fresh module state per case: this store is module-level on purpose, so it
  // has to be re-evaluated rather than reset through its own API.
  vi.resetModules();
  return import('../src/i18n/locale.js');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the stored choice', () => {
  it('is what the player picked, not what the hub can render', async () => {
    const locale = await load(null);
    // `fr` is a language a game may ship before the hub is translated into it.
    locale.setLocale('fr');

    expect(locale.getLocale(), 'the choice games are told about').toBe('fr');
    expect(env.store.get(KEY), 'what survives to the next visit').toBe('fr');
    expect(locale.getRenderedLocale(), 'what the hub has words for').toBe('en');
    expect(env.lang(), '<html lang> is the language on the page').toBe('en');
  });

  it('survives a reload rather than being narrowed on the way back in', async () => {
    const locale = await load('fr');
    expect(locale.getLocale()).toBe('fr');
    expect(env.store.get(KEY)).toBe('fr');
  });

  it('is the browser language until the player has picked once', async () => {
    const locale = await load(null, 'vi-VN');
    expect(locale.getLocale()).toBe('vi-VN');
    expect(locale.getRenderedLocale()).toBe('vi');
  });
});

describe('one choice, every surface', () => {
  it('a change in another tab is adopted here', async () => {
    const locale = await load('en');
    let notified = 0;
    locale.subscribeLocale(() => (notified += 1));

    env.storage(KEY, 'vi');

    expect(locale.getLocale()).toBe('vi');
    expect(locale.getStrings().play_now).toBe('CHƠI NGAY');
    expect(notified).toBe(1);
  });

  it('does not write back what a storage event just told it', async () => {
    const locale = await load('en');
    env.storage(KEY, 'vi');
    // Rewriting the key we were told about is noise at best, and a loop on a
    // browser that echoes its own writes back.
    expect(env.store.get(KEY)).toBe('en');
    expect(locale.getLocale()).toBe('vi');
  });

  it('ignores storage traffic for the origin\'s other keys', async () => {
    const locale = await load('en');
    env.storage('arcade:theme', 'modern');
    expect(locale.getLocale()).toBe('en');
  });
});
