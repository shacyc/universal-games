/**
 * PLACEHOLDER COPY — deleted together with `demoData.ts` when the API lands.
 *
 * It is a locale file rather than strings inside `demoData.ts` for the same
 * reason every other locale file exists: a string that only exists in English
 * is a string nobody will remember to translate. Keeping it next to the module
 * it belongs to means deleting the placeholder deletes its words too.
 *
 * Real games' taglines come from `catalog.json`, not from here. Only the nine
 * invented games and the fake leaderboard furniture live in this file.
 */
export function demoEn(n: Intl.NumberFormat) {
  return {
    /** Nine invented games. `2048` is real and gets its tagline from the catalog. */
    tagline: {
      blokku: 'Stack it. Clear it. Sweat it.',
      snake: 'Do not bite yourself.',
      brick: 'One ball. Forty bricks.',
      klondike: 'The patient one.',
      mines: 'Count, flag, breathe.',
      sudoku: 'A new grid every morning.',
      word: 'Five letters, six tries.',
      rhythm: 'Four lanes, no mercy.',
      bubble: 'Match three, clear the board.',
    } as Record<string, string>,

    blurb: {
      '2048':
        'The one everybody already knows how to play. Four-by-four grid, two starting tiles, and one more shot at finally seeing 4096.',
      blokku:
        'Seven falling shapes, one narrow well, and a drop speed that stops being polite somewhere around level nine.',
      snake:
        'A grid, a growing tail, and exactly one bad decision between you and a personal best.',
      brick:
        'Angle the paddle, break the wall, and try to stop the last brick from ruining a perfect run.',
      klondike:
        'Solitaire as it was on every office machine in 1994, minus the office and the machine.',
      mines: 'Numbers, neighbours and nerve.',
      sudoku: 'One puzzle a day.',
      word: 'Change one letter at a time.',
      rhythm: 'Hit the beat.',
      bubble: 'Aim and shoot.',
    } as Record<string, string>,

    /** What the resume list says about a half-finished run. */
    saved: {
      '2048': `Score ${n.format(96120)} · best tile 512`,
      blokku: `Level 12 · ${n.format(188400)} pts`,
      klondike: '38 of 52 cards home',
    } as Record<string, string>,

    season: 'SEASON 3 · ENDS IN 4D 12H',
  };
}

/** Every other locale is typed against this, so a gap is a build error. */
export type DemoCopy = ReturnType<typeof demoEn>;
