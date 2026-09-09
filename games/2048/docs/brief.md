# 2048 — Brief

Restructured from `docs/game-2048.md`, the pre-process spec, moved here with
`git mv` so the history follows. No rule was changed in the move. §7 is new:
multi-language became a platform requirement after this game shipped, so it
records what the game now does rather than what it was originally asked to do.

| | |
| --- | --- |
| Slug | `2048` |
| Route | `/g/2048/` |
| Dev port | `5174` |
| Genre | Puzzle |
| Milestone | v0 |
| Status | **Frozen** |
| Owner | shacyc |
| Frozen on | 2026-09-08 (retroactively — the game shipped against this spec) |

## 1. Why this game

The v0 launch title. Chosen because it is finishable in about a week, needs no
art pipeline, generates its own content, and exercises every part of the
platform pipeline: save/load, rewarded ads, interstitial placement, PWA install.

## 2. Rules

Standard 2048:

- 4x4 grid. Two starting tiles.
- New tile spawns after every move that changed the board: 90% chance of `2`,
  10% chance of `4`, in a uniformly random empty cell.
- A swipe slides every tile as far as possible in that direction. Two tiles with
  equal value that collide merge into one tile of double the value.
- **A tile that was produced by a merge cannot merge again in the same move.**
  Resolve each line from the leading edge inward.
- Score increases by the value of each tile created by a merge.
- A move that changes nothing is not a move: no spawn, no score, no undo entry.
- Game over when no empty cell exists and no orthogonal neighbours are equal.
- Reaching 2048 shows a win overlay with a "Keep going" option. Play continues.

## 3. Input

- Touch: swipe, threshold 24px, whichever axis has the larger delta wins.
  Must not fight page scroll — the board container uses `touch-action: none`.
- Keyboard: arrows and WASD.
- No tap-to-move, no on-screen d-pad.

## 4. Rendering

Plain `<canvas>`, no engine. Requirements:

- 60fps on a mid-range Android device.
- Tile movement animated ~100ms ease-out; merge pop ~120ms; spawn fade+scale.
  Animate positions, do not snap.
- Input is accepted during animation and queued, not dropped. A player swiping
  fast must not lose moves.
- Board sized from the smaller viewport dimension; layout works from 320px wide
  up to desktop. Portrait-first.
- Respect `prefers-reduced-motion` by shortening animations to near-zero.

## 5. Persistence

Saved through `sdk.save()` after every move.

```ts
type SaveState = {
  v: 1;
  board: (number | null)[];   // length 16, row-major
  score: number;
  best: number;
  undo: { board: (number | null)[]; score: number } | null;
  wonShown: boolean;
};
```

The game calls `save` freely; the host debounces. On boot, `load()` restores an
in-progress run silently — no "continue?" prompt.

**Deliberately not persisted:** the free undo and the continue are run-local, so
a reload grants a fresh one of each. That was a choice, not an oversight — the
saved shape is fixed by this spec and does not carry them.

## 6. Monetisation hooks

| Hook | Placement | Moment | On `false` / suppressed |
| --- | --- | --- | --- |
| Rewarded | `undo` | second undo onward in a run (the first is free) | close the dialog, change nothing, no toast |
| Rewarded | `continue` | once per run, on a locked board | fall through to the normal game-over screen |
| Interstitial | `run_end` | player taps "New game" from the game-over screen | nothing; never on the game-over screen itself |

`gameStart()` on a new or restored run; `gameOver({ score })` exactly once when
the board locks up, after any continue has been declined or used.

Analytics via `sdk.track`: `run_start`, `run_end` (score, highest tile, move
count), `undo_used` (free vs rewarded), `continue_offered`, `continue_taken`,
`tile_2048_reached`.

## 7. Copy and locales

| | |
| --- | --- |
| Locales | `en`, `vi` (`en` is the fallback and the authoring language) |
| Longest-string risk | the HUD's `BEST` label beside `SCORE`, and the two buttons on the continue-offer card |

Two entries are deliberately not literal translations, and the reasons are in
`src/i18n/vi.ts`: `best_label` is `CAO NHẤT` rather than the shorter `KỶ LỤC`,
which would read as a leaderboard rank this game does not have; `ad_badge` is
`QC`, the ordinary Vietnamese abbreviation, because the badge is two characters
wide and `AD` would be read as English.

`final_score` and `boot_error` are single entries taking their values, never
built by concatenation. Scores go through `Intl.NumberFormat(locale)`, so
`1024` reads as `1,024` in English and `1.024` in Vietnamese.

The board itself has no text. The brand in the header is the numeral `2048` and
is not translated.

## 8. Screens

- Header: brand, current score, best score, new-game button.
- Board.
- Footer: undo button, showing a small "ad" badge once the free undo is spent.
- Win overlay: title, note, "Keep going".
- Continue offer: title, note, "Watch ad" / "No thanks".
- Game-over overlay: title, final score line, "New game".

Visual direction is deliberately restrained — this is a classic people already
know how to play.

## 9. Explicitly out of scope

> **Amended 2026-09-09 by the owner.** The two struck lines below were true when
> this brief was frozen and are no longer: CLAUDE.md rule 7 now requires every
> game to ship its own settings screen holding the language and the way back to
> the hub. Recorded as a deviation in `progress.md` §4 rather than quietly
> rewritten, because a frozen brief that disagrees with the shipped game is the
> failure this process exists to prevent.

- No tutorial. ~~No settings screen.~~ No difficulty picker.
- No sound in v0; mute state is read and reflected, ready for when sounds land.
- No leaderboard, no accounts, no shop.
- ~~No language picker inside the game — the shell owns it.~~ The game ships the
  picker; the *language* is still the platform's, asked for with
  `sdk.setLocale()`.

## 10. Acceptance criteria

- All merge edge cases correct, verified by unit tests on the line-resolution
  function: `[2,2,2,2] -> [4,4]`, `[4,4,2,2] -> [8,4]`, `[2,2,4,null] -> [4,4]`,
  `[2,null,2,4] -> [4,4]`, `[null,null,null,2] -> [2]` unchanged when sliding
  in that direction.
- Killing the tab mid-run and reopening restores the exact board.
- Playable one-handed in portrait at 320px width.
- Runs standalone at `/g/2048/` and embedded in the hub.
- Installs to the Android home screen with its own icon and opens full-screen
  at `/g/2048/`.
- Works offline once installed.
- Every locale in `SUPPORTED` renders with no missing key and no clipped
  control at 320px, and a language change re-renders the game without a reload.

## 11. Open questions

None. The game shipped against this spec.

| # | Question | Proposed | Answer | Answered on |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |
