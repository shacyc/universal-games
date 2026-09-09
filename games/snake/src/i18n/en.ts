/**
 * The fallback locale, and the language this game is authored in.
 *
 * A factory rather than a plain object so every locale carries its own
 * `Intl.NumberFormat`: a score reads as `1,024` or `1.024` depending on the
 * platform's language, and `toLocaleString()` with no argument would follow the
 * device instead. Sentences that interpolate a value are one entry each —
 * building them by concatenation at the call site cannot be reordered by a
 * translator.
 */
export function en(n: Intl.NumberFormat) {
  return {
    play: 'Play',
    settings: 'Settings',
    language: 'Language',
    back_to_hub: 'Back to the hub',
    back: 'Back',

    swipe_to_start: 'Swipe or press an arrow to start',
    tap_to_resume: 'Tap to resume',

    game_over: 'Game over',
    new_game: 'New game',
    continue_with_ad: 'Continue with ad',

    score: (v: number) => `Score ${n.format(v)}`,
    best: (v: number) => `Best ${n.format(v)}`,

    /** Not a translation — the shared formatter for the HUD's bare numbers. */
    number: (v: number) => n.format(v),
  };
}

/**
 * Every other locale is typed against this, so a key nobody translated is a
 * build error rather than a blank on someone's screen.
 */
export type Strings = ReturnType<typeof en>;
