/**
 * The fallback locale, and the language this game is authored in.
 *
 * A factory rather than a plain object so every locale carries its own
 * `Intl.NumberFormat`: a score has to read as `1,024` or `1.024` depending on
 * where the player is, and `toLocaleString()` with no argument would follow the
 * device instead of the language the platform picked.
 *
 * Sentences that interpolate a value are one entry each. Building them by
 * concatenation at the call site cannot be reordered by a translator.
 */
export function en(n: Intl.NumberFormat) {
  return {
    score_label: 'SCORE',
    best_label: 'BEST',
    new_short: 'New',
    undo: 'Undo',
    ad_badge: 'AD',

    win_title: 'You made 2048',
    win_note: 'Keep going for a bigger tile.',
    keep_going: 'Keep going',

    stuck_title: 'No moves left',
    stuck_note: 'Watch a short ad to clear the four smallest tiles and carry on.',
    watch_ad: 'Watch ad',
    no_thanks: 'No thanks',

    settings: 'Settings',
    settings_open: 'Settings',
    language: 'Language',
    back_to_home: 'Back to home',
    back: 'Back',
    close: 'Close',

    game_over: 'Game over',
    new_game: 'New game',
    final_score: (score: number, best: number) => `Score ${n.format(score)} · Best ${n.format(best)}`,

    boot_error: (message: string) => `Could not start: ${message}`,

    /** Not a translation — the shared number formatter, used by the HUD. */
    number: (value: number) => n.format(value),
  };
}

/**
 * Every other locale is typed against this, so a key nobody translated is a
 * type error at build time rather than a blank on someone's screen.
 */
export type Strings = ReturnType<typeof en>;
