import { describe, expect, it } from 'vitest';
import catalog from '../../../catalog.json' with { type: 'json' };
import { pickText, type LocalisedText } from '../src/catalog.js';
import { demoCopyFor } from '../src/demo/copy.js';
import { STATS, SAVED, homeGames } from '../src/demo/demoData.js';
import {
  CATALOG_GENRES, GENRE_KEYS, LOCALE_NAMES, SUPPORTED, genreLabel, isGenreKey, stringsFor,
} from '../src/i18n/index.js';

/**
 * These tests are about *coverage*, not about wording.
 *
 * Missing-key parity between locale files is already a compile error, because
 * every locale is typed against `en`. What the type system cannot see is data:
 * a catalog entry with a genre nobody wrote a label for, a demo game added
 * without a tagline, a locale offered in the picker with no strings behind it.
 * Each of those renders a blank or an untranslated key rather than throwing, so
 * a test is the only thing that catches them.
 */
const LOCALES = [...SUPPORTED];

describe('locales', () => {
  it('every locale in the picker has strings and a name of its own', () => {
    for (const locale of LOCALES) {
      expect(stringsFor(locale).play_now, locale).toBeTruthy();
      expect(LOCALE_NAMES[locale]?.name, locale).toBeTruthy();
      expect(LOCALE_NAMES[locale]?.short, locale).toBeTruthy();
    }
  });

  it('the first supported locale is the one the shell is authored in', () => {
    expect(SUPPORTED[0]).toBe('en');
  });

  it('an unknown locale falls back to real English rather than to a key', () => {
    expect(stringsFor('de').play_now).toBe(stringsFor('en').play_now);
  });

  it('formats numbers by locale, not by device', () => {
    expect(stringsFor('en').number(128940)).toBe('128,940');
    expect(stringsFor('vi').number(128940)).toBe('128.940');
  });

  it('interpolates counts into the sentence rather than around it', () => {
    for (const locale of LOCALES) {
      const t = stringsFor(locale);
      expect(t.plays_count(1204), locale).toContain(t.number(1204));
      expect(t.titles_filtered(3, 10), locale).toContain(t.number(10));
    }
  });
});

describe('genres', () => {
  it('every genre key has a label in every locale', () => {
    for (const locale of LOCALES) {
      for (const key of GENRE_KEYS) {
        expect(stringsFor(locale).genres[key], `${locale}/${key}`).toBeTruthy();
      }
    }
  });

  it('every genre used by real or placeholder games is a known key', () => {
    for (const game of homeGames) {
      expect(isGenreKey(game.genre), `${game.slug} has genre "${game.genre}"`).toBe(true);
    }
  });

  it('no catalog entry claims the shell\'s "no filter" pseudo-genre', () => {
    for (const game of catalog.games) {
      expect(CATALOG_GENRES, game.slug).toContain(game.genre);
    }
  });

  it('falls back to the raw key rather than rendering nothing', () => {
    expect(genreLabel(stringsFor('en'), 'roguelike')).toBe('roguelike');
  });
});

describe('catalog copy', () => {
  it('every catalog entry is translated into every locale the platform ships', () => {
    for (const game of catalog.games) {
      for (const locale of LOCALES) {
        const tagline = game.tagline as LocalisedText;
        expect(tagline[locale], `${game.slug}/${locale}`).toBeTruthy();
      }
    }
  });

  it('resolves a regional tag to the language it belongs to', () => {
    const tagline: LocalisedText = { en: 'Slide.', vi: 'Trượt.' };
    expect(pickText(tagline, 'vi-VN')).toBe('Trượt.');
    expect(pickText(tagline, 'en-GB')).toBe('Slide.');
  });

  it('degrades an untranslated entry to English instead of a blank', () => {
    expect(pickText({ en: 'Slide.' }, 'vi')).toBe('Slide.');
  });
});

describe('placeholder copy', () => {
  it('every placeholder game has a tagline and a blurb in every locale', () => {
    const placeholders = homeGames.filter((g) => !g.playable);
    expect(placeholders.length).toBeGreaterThan(0);
    for (const locale of LOCALES) {
      const copy = demoCopyFor(locale);
      for (const game of placeholders) {
        expect(copy.tagline[game.slug], `${game.slug}/${locale}`).toBeTruthy();
      }
      for (const slug of Object.keys(STATS)) {
        expect(copy.blurb[slug], `${slug}/${locale}`).toBeTruthy();
      }
      for (const run of SAVED) {
        expect(copy.saved[run.slug], `${run.slug}/${locale}`).toBeTruthy();
      }
    }
  });

  it('formats the numbers inside placeholder copy in the same language', () => {
    expect(demoCopyFor('en').saved['2048']).toContain('96,120');
    expect(demoCopyFor('vi').saved['2048']).toContain('96.120');
  });
});
