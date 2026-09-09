import type { GenreKey } from './genres.js';

/**
 * The shell's own words, and the locale it is authored in.
 *
 * A factory rather than a plain object, exactly like a game's `src/i18n/en.ts`
 * (`games/2048/src/i18n/en.ts` is the worked example): every locale carries its
 * own `Intl.NumberFormat`, so `128,940 plays` becomes `128.940 lượt chơi`
 * without a second list of numbers to keep in sync.
 *
 * Rules, the same three every locale file in this repo follows:
 *
 * 1. A sentence that interpolates a value is **one entry**, a function. Built
 *    by concatenation at the call site it could not be reordered, and word
 *    order is the first thing a translation changes.
 * 2. Numbers go through `n.format`, never `toLocaleString()` — the latter
 *    follows the device, which is not the language the player picked.
 * 3. Layout has to survive a longer word. Vietnamese runs 20-30% longer than
 *    English here and nothing may be sized to fit exactly one language.
 *
 * `ARCADE` and `POCKET ARCADE` are deliberately absent: they are the product's
 * name and the engraving on the fake console, not sentences. They live in
 * `brand.ts`.
 */
export function en(n: Intl.NumberFormat) {
  return {
    // Topbar ---------------------------------------------------------------
    nav_games: 'Games',
    nav_continue: 'Continue',
    nav_install: 'Install',
    theme_group: 'Theme',
    theme_vintage: 'VINTAGE',
    theme_modern: 'MODERN',
    language_group: 'Language',

    // Spotlight ------------------------------------------------------------
    spotlight_title: 'SPOTLIGHT',
    playing_now: (live: number) => `${n.format(live)} playing now`,
    show_game: (title: string) => `Show ${title}`,
    prev_game: 'Previous game',
    next_game: 'Next game',
    stat_plays: 'Plays',
    stat_session: 'Avg run',
    stat_best: 'World best',
    play_now: 'PLAY NOW',
    coming_soon: 'COMING SOON',
    board_title: 'TOP PLAYERS',
    board_you: 'You',

    // Catalogue ------------------------------------------------------------
    all_games: 'ALL GAMES',
    titles_all: (total: number) => `${n.format(total)} titles, more every month`,
    titles_filtered: (shown: number, total: number) =>
      `${n.format(shown)} of ${n.format(total)} titles`,
    search_games: 'Search games',
    /**
     * Keyed by the `genre` field in `catalog.json`, which is a key and not a
     * label for exactly this reason: the filter compares genres, and comparing
     * translated words would break the chips the moment someone switched
     * language. `all` is the shell's own pseudo-genre, not a catalog value.
     */
    genres: {
      all: 'All',
      puzzle: 'Puzzle',
      arcade: 'Arcade',
      cards: 'Cards',
      word: 'Word',
      casual: 'Casual',
    } as Record<GenreKey, string>,
    empty_title: 'NO GAMES MATCH',
    empty_body: 'Try a different word, or clear the filter.',
    card_play: (title: string) => `Play ${title}`,
    card_soon: (title: string) => `${title} — coming soon`,
    badge_soon: 'SOON',
    plays_count: (plays: number) => `${n.format(plays)} plays`,

    // Continue -------------------------------------------------------------
    resume_title: 'PICK UP WHERE YOU LEFT OFF',
    resume_sub: 'Saved on this device — no account needed.',
    resume_action: 'RESUME',

    // Install section ------------------------------------------------------
    /**
     * The line break is part of the copy, not the layout: the display face is
     * large and the heading is written to break in two. A newline here lets a
     * translator move the break to where their own sentence wants it.
     */
    install_title: 'EVERY GAME GETS\nITS OWN ICON',
    install_body:
      'Add a game to your home screen and it installs on its own — its own icon, its own full-screen window, and it keeps working with no signal. Nothing to download from a store.',
    install_android: 'Android — one tap from the game screen',
    install_ios: 'iPhone — Share, then Add to Home Screen',
    install_cta: (target: string) => `INSTALL ${target.toUpperCase()}`,

    // Install sheet --------------------------------------------------------
    install_sheet_title: (target: string) => `Add ${target} to your home screen`,
    /**
     * The Share glyph is rendered before this sentence rather than inside it.
     * Splitting a sentence around an icon would make it two half-strings that
     * no translator can reorder.
     */
    ios_step_share: 'Tap Share, at the bottom of Safari',
    /** The quoted words are iOS's own menu item — use the label iOS ships. */
    ios_step_add: 'Choose “Add to Home Screen”',
    ios_note: 'It gets its own icon and opens full screen — nothing to download.',
    ios_done: 'Got it',
    prompt_note: 'Its own icon, its own full-screen window, and it works with no signal.',
    prompt_close: 'Close',
    prompt_not_now: 'Not now',
    prompt_install: 'Install',
    install_target: (target: string) => `Install ${target}`,

    // Game frame -----------------------------------------------------------
    back_to_games: 'Back to games',

    // Footer ---------------------------------------------------------------
    /**
     * The brand is interpolated rather than joined to a tagline in the markup:
     * a translation may want it after the phrase, and half-sentences glued
     * together in JSX cannot be reordered.
     */
    foot_brand: (brand: string) => `${brand} — SMALL GAMES, NO INSTALL`,
    foot_note: 'Made for the browser · 2026',

    // Formatters -----------------------------------------------------------
    /** Not a translation — the shared number formatter for this locale. */
    number: (value: number) => n.format(value),
    /** An average run length. Minutes and seconds are abbreviated per locale. */
    duration: (minutes: number, seconds: number) =>
      `${n.format(minutes)}m ${seconds.toString().padStart(2, '0')}s`,
    rank: (position: number) => `#${n.format(position)}`,
  };
}

/**
 * Every other locale is typed against this, so a key nobody translated is a
 * type error at build time rather than a blank on someone's screen.
 */
export type Strings = ReturnType<typeof en>;
