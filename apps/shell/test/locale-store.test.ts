import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The shell's locale store, exercised against stubbed globals rather than a
 * jsdom dependency — it touches exactly one browser thing
 * (`document.documentElement.lang`) and stubbing that is more honest about what
 * is under test than pulling in a DOM.
 *
 * Two properties are pinned here, both of which fail silently when broken:
 *
 * 1. **The player's choice is not narrowed by what the hub can render.** The
 *    hub's translation status must never become a ceiling on the platform.
 * 2. **The language is not a device-local key.** It belongs to the player and
 *    lives on their user record; a copy kept beside it is a second source of
 *    truth that will disagree with the first.
 *
 * Fetching it at boot lives in `host.ts`, which owns the storage adapter, and
 * is verified in the browser rather than here — importing it would mean
 * stubbing IndexedDB, `matchMedia` and the install machinery to test one await.
 */
interface Env {
  lang: () => string;
  deviceWrites: Map<string, string>;
}

let env: Env;

async function load(browserLanguage = 'en-US') {
  const documentElement = { lang: '' };
  const deviceWrites = new Map<string, string>();

  vi.stubGlobal('window', {
    localStorage: {
      getItem: () => null,
      setItem: (k: string, v: string) => void deviceWrites.set(k, v),
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  vi.stubGlobal('document', { documentElement });
  vi.stubGlobal('navigator', { language: browserLanguage });

  env = { lang: () => documentElement.lang, deviceWrites };

  // Fresh module state per case: this store is module-level on purpose, so it
  // has to be re-evaluated rather than reset through its own API.
  vi.resetModules();
  return import('../src/i18n/locale.js');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the player’s choice', () => {
  it('is not narrowed to what the hub happens to ship', async () => {
    const locale = await load();
    // `fr` is a language a game may ship before the hub is translated into it.
    locale.setLocale('fr');

    expect(locale.getLocale(), 'what games are told').toBe('fr');
    expect(locale.getRenderedLocale(), 'what the hub has words for').toBe('en');
    expect(locale.getStrings().play_now).toBe('PLAY NOW');

    locale.applyDocumentLocale();
    expect(env.lang(), '<html lang> is the language on the page').toBe('en');
  });

  it('is applied when the hub does ship it', async () => {
    const locale = await load();
    locale.setLocale('vi');

    expect(locale.getLocale()).toBe('vi');
    expect(locale.getRenderedLocale()).toBe('vi');
    expect(locale.getStrings().play_now).toBe('CHƠI NGAY');
  });

  it('resolves a regional tag for rendering while keeping it whole', async () => {
    const locale = await load();
    locale.setLocale('vi-VN');

    expect(locale.getLocale()).toBe('vi-VN');
    expect(locale.getRenderedLocale()).toBe('vi');
  });

  it('starts from the browser until the user record has been read', async () => {
    const locale = await load('vi-VN');
    expect(locale.getLocale()).toBe('vi-VN');
    expect(locale.getRenderedLocale()).toBe('vi');
  });

  it('notifies subscribers once, and not at all for the same language', async () => {
    const locale = await load();
    let notified = 0;
    locale.subscribeLocale(() => (notified += 1));

    locale.setLocale('vi');
    locale.setLocale('vi');
    expect(notified).toBe(1);
  });
});

describe('where the language is kept', () => {
  it('is never written to a device-local key', async () => {
    const locale = await load();
    locale.setLocale('vi');

    // Recording it is the host's job, on the user record. A copy here would be
    // a second source of truth, and the two would drift the first time the
    // player changed language on another device.
    expect(env.deviceWrites.size).toBe(0);
  });
});
