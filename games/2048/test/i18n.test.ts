import { describe, expect, it } from 'vitest';
import { LOCALE_NAMES, SUPPORTED, stringsFor } from '../src/i18n/index.js';

/**
 * The type system already guarantees every locale has every key — `vi` is
 * typed as `Strings`. What it cannot catch is a key that is present but empty,
 * or a sentence a translator left in English, so those are checked here.
 */
describe('i18n', () => {
  it('ships the fallback first', () => {
    expect(SUPPORTED[0]).toBe('en');
  });

  for (const locale of SUPPORTED) {
    describe(locale, () => {
      const s = stringsFor(locale);

      it('has no empty string', () => {
        for (const [key, value] of Object.entries(s)) {
          if (typeof value === 'string') expect(value, key).not.toBe('');
        }
      });

      it('interpolates rather than concatenating', () => {
        // Formatted by this locale's own separator, not the test's.
        expect(s.final_score(1024, 2048)).toContain(s.number(1024));
        expect(s.final_score(1024, 2048)).toContain(s.number(2048));
        expect(s.boot_error('boom')).toContain('boom');
      });
    });
  }

  it('formats numbers for the locale it was asked for', () => {
    // The separator differs, which is the whole reason this goes through Intl.
    expect(stringsFor('en').number(1024)).toBe('1,024');
    expect(stringsFor('vi').number(1024)).toBe('1.024');
  });

  it('falls back to the authoring language for a locale it does not ship', () => {
    expect(stringsFor('de').game_over).toBe(stringsFor('en').game_over);
  });

  it('actually translates — vi is not a copy of en', () => {
    const en = stringsFor('en');
    const vi = stringsFor('vi');
    for (const key of ['game_over', 'new_game', 'undo', 'watch_ad'] as const) {
      expect(vi[key], key).not.toBe(en[key]);
    }
  });
});

describe('settings screen', () => {
  it('every locale this game ships has a name to show in the picker', () => {
    for (const tag of SUPPORTED) {
      expect(LOCALE_NAMES[tag], tag).toBeTruthy();
    }
  });

  it('names each language in itself, not in the language currently on screen', () => {
    // A player who cannot read the current language has to be able to find
    // their own; translating these would defeat the only screen that matters.
    expect(LOCALE_NAMES.vi).toBe('Tiếng Việt');
    expect(LOCALE_NAMES.en).toBe('English');
  });

  it('the platform-required rows are translated in every locale', () => {
    for (const tag of SUPPORTED) {
      const s = stringsFor(tag);
      expect(s.settings, tag).toBeTruthy();
      expect(s.language, tag).toBeTruthy();
      expect(s.back_to_home, tag).toBeTruthy();
      expect(s.back, tag).toBeTruthy();
      expect(s.close, tag).toBeTruthy();
      expect(s.settings_open, tag).toBeTruthy();
    }
  });
});
