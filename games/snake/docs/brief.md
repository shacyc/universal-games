# Neon Snake — Brief

Restructured from `docs/game-snake.md` (moved here unchanged in rules; see §10
for what that spec left undefined). Nothing in §2–§9 is new — it is the same
spec in the shape `docs/templates/game-docs/brief.md` asks for.

| | |
| --- | --- |
| Slug | `snake` |
| Route | `/g/snake/` |
| Dev port | `5175` |
| Genre | Arcade |
| Milestone | v0.1 |
| Status | **Draft** — blocked by §10 |
| Owner | shacyc |
| Frozen on | — |

## 1. Why this game

The second title. Small (a few days), no art pipeline, and the first
**real-time** game on the platform: it exercises `onPause`/`onResume` and the
"restore a run that was moving" problem, neither of which 2048 touches. If the
platform is wrong about pausing, this game finds it — see decision 12 in
`docs/sdk-decisions.md`.

## 2. Rules

- Square grid, **15 x 15**. Snake starts length 3 in the middle, heading right,
  not moving until the first input.
- One food on the board at a time, in a uniformly random empty cell — never
  under the snake.
- Each tick the snake advances one cell. Eating food grows it by one and spawns
  the next food.
- **Walls are fatal.** No wrap-around. Running into your own body is fatal.
- Score: 10 per food, plus a small speed bonus — `10 + floor(level)`. **`level`
  is undefined in the original spec — see Q1.** Keep the formula in the pure
  core so it is testable.
- Speed: 6 cells/second at the start, +0.35 for every food eaten, capped at 14.
  Speed is a property of the run, so it must be part of the save state.
- A win state does not exist. The run ends when the snake dies.

## 3. Input

- Touch: swipe anywhere on the play surface, threshold 24px, larger axis wins.
  The surface carries `touch-action: none`.
- Keyboard: arrows and WASD.
- **A 180° reversal is rejected**, checked against the direction the snake
  actually moved last, not against the last input — otherwise two fast swipes
  turn the snake into itself.
- Turns are queued, maximum 2 deep, one consumed per tick. A player who swipes
  down-then-right faster than one tick must get both turns.
- No on-screen d-pad. No tap-to-turn.

## 4. Rendering

Plain `<canvas>`, no engine. Same sizing approach as 2048 (`games/2048/src/canvas.ts`
is a good reference for the DPR and square-fit problem — read it, do not import it).

- 60fps on a mid-range Android device.
- The snake interpolates between cells; it must not jump a whole cell per tick.
  Render position is `previous + (next - previous) * t` where `t` is progress
  through the current tick.
- Food pulses gently. A brief flash on eating. Nothing else animated.
- `prefers-reduced-motion`: drop the interpolation to snapping and remove the
  pulse. Do not remove the game.
- Board sized from the smaller viewport dimension, 320px wide up to desktop.

## 5. Persistence

Saved through `sdk.save()` after every food eaten and on every pause.

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

**Deliberately not persisted:** nothing yet. Note that `revived` *is* persisted,
which is the opposite of 2048's choice to make its continue run-local — see Q6.

## 6. Monetisation hooks

| Hook | Placement | Moment | On `false` / suppressed |
| --- | --- | --- | --- |
| Rewarded | `revive` | once per run, on death | fall through to the normal game-over screen; no penalty, no toast |
| Interstitial | `run_end` | player taps "New game" from the game-over screen, after the score is shown | nothing; never on death itself |

On a successful revive the snake keeps its score, is shortened to 5 segments, is
repositioned at the centre facing the nearest open direction, and resumes after
a 3-2-1 countdown. **See Q2–Q5: the original spec leaves four cases of this
undefined.**

`sdk.gameStart()` on a new or restored run; `sdk.gameOver({ score })` exactly
once, after the revive has been used or declined.

Analytics via `sdk.track`: `run_start`, `run_end` (score, length, duration_ms),
`revive_offered`, `revive_taken`, `best_beaten`, `paused` (reason).

## 7. Screens

- Header: score, best.
- Board.
- Footer: nothing. The board is the game.
- Idle overlay: "Swipe to start".
- Paused overlay: "Tap to resume", then a countdown.
- Game-over overlay: score, best, "Continue with ad" (once), "New game".

Pausing freezes the tick clock and shows the paused overlay; resuming runs a
3-2-1 countdown. Never resume straight into motion.

## 8. Explicitly out of scope

- No settings screen, no tutorial, no difficulty picker.
- No sound in v0 — but the mute state is read and reflected, ready for when
  sounds land.
- No on-screen d-pad, no tap-to-turn.
- No leaderboard, no accounts, no shop (milestone rule, `CLAUDE.md`).

## 9. Acceptance criteria

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

## 10. Open questions

These block freezing the brief. Each one is a case the pure core has to decide
and a unit test has to pin, so guessing is not free.

| # | Question | Proposed | Answer | Answered on |
| --- | --- | --- | --- | --- |
| Q1 | `10 + floor(level)` — `level` is never defined. Is it food eaten, or derived from speed? | `level = floor((speed - 6) / 0.35)`, i.e. food eaten so far, capped where speed caps at 14 (level 22). Makes the 23rd food onward worth a flat 32. | | |
| Q2 | Revive shortens the snake to 5 segments. What if it died shorter than 5 (length 3 or 4)? | Grow it to exactly 5 — the reward should never be a shorter snake than the player had. | | |
| Q3 | Revive repositions at the centre. What happens to the old body — cleared, or kept and moved? | Cleared. Place 5 fresh segments at the centre facing the most open direction. Keeping a 40-segment body and moving it has no unambiguous meaning. | | |
| Q4 | Does speed reset on revive, or keep the run's speed? | Keep it. Score is kept, so keeping the difficulty that earned it is consistent — and resetting speed makes revive a difficulty cheat. | | |
| Q5 | Is the food respawned on revive, or left where it was? | Respawned, since the board is being cleared anyway and the old food may now sit under the new snake. | | |
| Q6 | `revived` is inside the saved run, so killing the tab does **not** grant a second revive. 2048 deliberately went the other way (its continue is run-local, a reload grants a fresh one). Is the difference intended? | Keep it saved. A revive is worth more than an undo, and a reload-to-refresh loop is a real exploit here. But it should be a stated decision, not an accident of the save shape. | | |
| Q7 | Is `best` updated live during a run, or only at game over? | Live. The header shows both, and a run that beats the best should show it immediately; `best_beaten` fires once per run. | | |
