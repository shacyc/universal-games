# Game 03 — Sudoku Daily

The third title, and the first with a **long session**: 2048 runs about four
minutes, this one runs ten to fifteen. It is also the first game built in plain
DOM rather than canvas, the first that generates content deterministically from
a seed, and the first with a natural hint economy — the strongest rewarded-ad
placement the platform has had so far.

Slug: `sudoku`. Builds to `/g/sudoku/`. Dev port `5176`. Genre `Puzzle`.

Read `docs/building-a-game.md` first — it is the contract. This file is only
what is specific to this game.

## Modes

- **Daily.** One puzzle per UTC day, seeded from the date so every player on
  every device gets the same grid with no server. Difficulty rotates by weekday
  (Mon–Tue easy, Wed–Fri medium, Sat–Sun hard). Completing today's puzzle shows
  a "come back tomorrow" state, not another daily.
- **Practice.** Unlimited puzzles at Easy / Medium / Hard, seeded from a random
  seed that is stored with the run so a reload gives the same puzzle back.

Both modes share one board implementation. No streaks, no calendar, no
achievements — those need a server.

## Generation

Pure, seeded, DOM-free, and unit-tested. A small PRNG (xorshift32 or mulberry32)
seeded from a number, so a seed always yields the same puzzle.

1. Fill a complete valid grid by backtracking over shuffled candidates.
2. Dig holes in symmetric pairs (180° rotation), rejecting any removal that
   leaves more than one solution.
3. Uniqueness is checked by a counting solver that **stops at two** solutions.
   Never run an exhaustive count.
4. Difficulty by remaining clues: Easy 40–45, Medium 32–36, Hard 27–30. Clue
   count is a crude proxy for difficulty and that is accepted for v0 — do not
   build a technique-rating engine.

Budget: under 300ms for Hard on a mid-range phone. If generation exceeds ~100ms
show the board skeleton with a spinner rather than a blank screen. Generate on
the main thread; a Web Worker is not worth the bundle for this.

## Input

Thumb-first. The grid is on top, the controls are in the bottom third where a
thumb reaches.

- Tap a cell to select it. The selected cell, its row, its column, its box and
  every cell holding the same digit are highlighted.
- A number pad 1–9 below the grid, plus **Notes** (pencil marks), **Erase** and
  **Undo**. All pad keys >= 44px; the grid cells themselves may be smaller than
  44px since they are a selection surface, not a control — but not below 32px.
- Notes mode toggles digits in a cell's pencil marks instead of setting a value.
  Entering a value clears that cell's notes; it does **not** auto-clear notes
  elsewhere in v0.
- Given cells are never editable.
- Conflicts (same digit in row, column or box) are marked immediately in red.
  This is a highlight, not a penalty — no lives, no mistake limit.
- Undo is unlimited and free, covering value, note and erase actions.
- Keyboard: 1–9, arrows to move the selection, Backspace to erase, `n` for
  notes. Desktop convenience only; never required.

## Rendering

Plain DOM and CSS Grid, not canvas — the text is real text, it scales, and it is
readable to a screen reader. No virtual DOM, no framework.

- Board is a square that fits the smaller viewport dimension, with the pad
  below; at 320px the whole thing must fit without page scroll.
- Box borders heavier than cell borders.
- The selection highlight and conflict marks are the only animation, both under
  100ms. Nothing bounces.
- `prefers-reduced-motion` removes transitions entirely.

## Persistence

Saved through `sdk.save()` after every entry and on pause. Shape:

```ts
type SaveState = {
  v: 1;
  best: Record<'easy' | 'medium' | 'hard', number | null>;  // best time in ms
  run: {
    mode: 'daily' | 'practice';
    difficulty: 'easy' | 'medium' | 'hard';
    seed: number;
    dayKey: string | null;     // 'YYYY-MM-DD' for daily, null for practice
    puzzle: number[];          // 81, 0 = empty. The givens.
    solution: number[];        // 81, stored so a hint never re-solves mid-run
    entries: number[];         // 81, 0 = empty. Player values only.
    notes: number[];           // 81, 9-bit masks
    elapsedMs: number;
    hintsUsed: number;
    freeHintUsed: boolean;
  } | null;
  lastDailyCompleted: string | null;   // 'YYYY-MM-DD'
};
```

Restore silently on boot — the board comes back exactly as it was, timer paused
until the first interaction. A restored run still calls `sdk.gameStart()`.
Storing `solution` alongside the puzzle is deliberate: a hint must be instant,
and re-solving on a slow phone mid-run is not.

The timer stops whenever the game is covered and resumes after, from two
sources converging on one pair of functions: `sdk.onPause`/`onResume` (the host
emits these around every ad, so a rewarded hint never costs the player time),
and `visibilitychange` to hidden, which the host cannot see. `resume()` must be
idempotent — it fires after every ad, including one taken from the completion
screen. Elapsed time is accumulated explicitly, never derived from a start
timestamp.

## Monetisation hooks

- **Hint.** One free hint per puzzle. Every hint after that costs
  `sdk.showRewarded('hint')`. A hint fills the currently selected empty cell —
  or, if nothing is selected, the empty cell with the fewest candidates — from
  the stored solution, and marks it as hinted so it renders differently from a
  player entry. On `false`: close the dialog, change nothing, no penalty.
- **Check board.** `sdk.showRewarded('check')` reveals which of the player's
  entries are wrong, once per puzzle. Optional if time is short — hint is the
  important one.
- **Interstitial.** `sdk.showInterstitial('puzzle_complete')` only when the
  player taps "Next puzzle" from the completion screen, after the time and
  result have been shown. Never on completion itself, never mid-puzzle.
- `sdk.gameStart()` when a puzzle is opened or restored;
  `sdk.gameOver({ score })` exactly once when the puzzle is solved **or** when
  the player abandons it by starting a different one. Score is
  `max(0, base[difficulty] - floor(elapsedMs / 1000) - hintsUsed * 60)`; keep
  the formula in the pure core.

Analytics via `sdk.track`: `run_start` (mode, difficulty), `run_end` (solved,
elapsed_ms, hints_used, score), `hint_used` (free vs rewarded), `check_used`,
`daily_completed`, `puzzle_abandoned`.

## UI

- Header: mode and difficulty, elapsed time, best time.
- Board.
- Pad: 1–9 with a remaining-count badge per digit, then Notes / Erase / Undo.
- Completion overlay: time, best, "Next puzzle" (practice) or "Come back
  tomorrow" (daily).
- One entry screen: Daily, or Practice with three difficulty buttons. That is
  the whole navigation.
- No tutorial, no settings screen, no themes. Sound is off in v0 but mute state
  is read and reflected.

## Acceptance criteria

- Unit tests, all DOM-free: a solver that finds the solution of a known grid; a
  counting solver that returns 2 for a deliberately ambiguous grid; the
  generator producing a unique-solution puzzle for every difficulty across 50
  seeds, each within the time budget; the same seed always producing the same
  puzzle; conflict detection across row, column and box; the score formula.
- Killing the tab mid-puzzle and reopening restores entries, notes, selection
  and elapsed time.
- The daily puzzle is identical for two devices on the same UTC day, and changes
  at UTC midnight.
- A rewarded ad does not advance the timer.
- Playable one-handed in portrait at 320px width with no page scroll.
- Runs both standalone at `/g/sudoku/` and embedded in the hub.
- Installs to the Android home screen with its own icon; plays offline,
  including generating new practice puzzles offline.
