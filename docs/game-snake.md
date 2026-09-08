# Game 02 — Neon Snake

The second title. Chosen because it is small (a few days), needs no art
pipeline, and is the first **real-time** game on the platform: it exercises
`onPause`/`onResume` and the "restore a run that was moving" problem, neither of
which 2048 touches. If the platform is wrong about pausing, this game finds it.

Slug: `snake`. Builds to `/g/snake/`. Dev port `5175`. Genre `Arcade`.

Read `docs/building-a-game.md` first — it is the contract. This file is only
what is specific to this game.

## Rules

- Square grid, **15 x 15**. Snake starts length 3 in the middle, heading right,
  not moving until the first input.
- One food on the board at a time, in a uniformly random empty cell — never
  under the snake.
- Each tick the snake advances one cell. Eating food grows it by one and spawns
  the next food.
- **Walls are fatal.** No wrap-around. Running into your own body is fatal.
- Score: 10 per food, plus a small speed bonus — `10 + floor(level)`, where
  level rises with speed. Keep the formula in the pure core so it is testable.
- Speed: 6 cells/second at the start, +0.35 for every food eaten, capped at 14.
  Speed is a property of the run, so it must be part of the save state.
- A win state does not exist. The run ends when the snake dies.

## Input

- Touch: swipe anywhere on the play surface, threshold 24px, larger axis wins.
  The surface carries `touch-action: none`.
- Keyboard: arrows and WASD.
- **A 180° reversal is rejected**, checked against the direction the snake
  actually moved last, not against the last input — otherwise two fast swipes
  turn the snake into itself.
- Turns are queued, maximum 2 deep, one consumed per tick. A player who swipes
  down-then-right faster than one tick must get both turns.
- No on-screen d-pad. No tap-to-turn.

## Rendering

Plain `<canvas>`, no engine. Same sizing approach as 2048 (`src/canvas.ts` there
is a good reference for the DPR and square-fit problem — read it, do not import
it).

- 60fps on a mid-range Android device.
- The snake interpolates between cells; it must not jump a whole cell per tick.
  Render position is `previous + (next - previous) * t` where `t` is progress
  through the current tick.
- Food pulses gently. A brief flash on eating. Nothing else animated.
- `prefers-reduced-motion`: drop the interpolation to snapping and remove the
  pulse. Do not remove the game.
- Board sized from the smaller viewport dimension, 320px wide up to desktop.

## Pause

This is the part the platform cares about.

One `pause()` / `resume()` pair, fed from two sources — read the
`onPause`/`onResume` section of `docs/building-a-game.md` first.

- `sdk.onPause` / `sdk.onResume`. The host emits these around every ad, so the
  snake stops while a rewarded ad is open. **Test this explicitly**: it is the
  single most likely bug in this game, and the reason the host does the
  bracketing at all.
- `document.visibilitychange` to hidden, plus `pagehide` — the host cannot see
  a backgrounded tab.

Pausing freezes the tick clock and shows the paused overlay; resuming runs a
3-2-1 countdown. Never resume straight into motion.

`resume()` must be idempotent: it fires after *every* ad, including the revive
offer taken from the game-over screen, when there is no loop to restart. Restart
only what `pause()` actually stopped, or the player gets a 3-2-1 countdown over
a dead snake.

Time spent paused must not advance the tick. Accumulate elapsed time explicitly;
do not derive tick progress from `performance.now()` alone.

## Persistence

Saved through `sdk.save()` after every food eaten and on every pause. Shape:

```ts
type SaveState = {
  v: 1;
  best: number;
  run: {
    body: number[];        // cell indices, head first, length >= 3
    dir: 'up' | 'down' | 'left' | 'right';
    food: number;          // cell index
    score: number;
    speed: number;         // cells per second
    revived: boolean;
  } | null;                // null = no run in progress
};
```

On boot: if `run` is present, restore it **paused**, with the resume overlay
showing — never drop the player into a moving board. Then call
`sdk.gameStart()`, or the run's `gameOver` is ignored. If `run` is null, show
the idle board and wait for the first input.

Clear `run` to `null` on death, after `gameOver`.

## Monetisation hooks

- **Revive.** Once per run, on death: offer `sdk.showRewarded('revive')`. On
  `true`, the snake keeps its score, is shortened to 5 segments, is repositioned
  at the centre facing the nearest open direction, and resumes after a 3-2-1
  countdown. On `false`, fall through to the normal game-over screen — no
  penalty, no toast.
- **Interstitial.** `sdk.showInterstitial('run_end')` only when the player taps
  "New game" from the game-over screen, after the score has been shown. Never on
  death itself.
- `sdk.gameStart()` on a new or restored run; `sdk.gameOver({ score })` exactly
  once, after the revive has been used or declined.

Analytics via `sdk.track`: `run_start`, `run_end` (score, length, duration_ms),
`revive_offered`, `revive_taken`, `best_beaten`, `paused` (reason).

## UI

- Header: score, best.
- Board.
- Footer: nothing. The board is the game.
- Idle overlay: "Swipe to start".
- Paused overlay: "Tap to resume", then a countdown.
- Game-over overlay: score, best, "Continue with ad" (once), "New game".
- No settings screen, no tutorial, no difficulty picker. Sound is off in v0 but
  the mute state is read and reflected, ready for when sounds land.

## Acceptance criteria

- Unit tests on a pure `step(state, rng)` with no DOM: growth on food,
  self-collision at the neck vs the tail (moving into the cell the tail is about
  to vacate is **legal**), wall death on all four edges, food never spawning
  under the snake, a full board handled without an infinite loop, reversal
  rejected, queued turns consumed one per tick.
- Killing the tab mid-run and reopening restores the exact board, paused.
- A rewarded ad during play does not advance the snake.
- Playable one-handed in portrait at 320px width.
- Runs both standalone at `/g/snake/` and embedded in the hub.
- Installs to the Android home screen with its own icon; plays offline.
