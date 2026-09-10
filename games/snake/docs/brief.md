# Snake — Brief

Restructured from `docs/game-snake.md` (moved here unchanged in rules; see §11
for what that spec left undefined). §2, §3, §5, §6 and §10 carry the original
spec's rules. §4 (rendering), §8 (screens) and §9 (out of scope) were revised on
2026-09-09 when the owner set the visual direction to the classic green-field
Snake look, asked for a reactive snake face and a crash effect, and directed
that bitmap art be generated from an art spec (§4); the game was
retitled from "Neon Snake" to "Snake" in the same pass. Frozen 2026-09-09.
(2026-09-10: §4 only — art pipeline is a spec file, not a named skill; and the
grass field moved to canvas drawing (owner's call, the generated tile looked
wrong), leaving `apple` + `title` as the generated set. No gameplay rule
changed. Still Frozen.)

| | |
| --- | --- |
| Slug | `snake` |
| Route | `/g/snake/` |
| Dev port | `5175` |
| Genre | `arcade` |
| Milestone | v0.1 |
| Status | **Frozen** |
| Owner | shacyc |
| Frozen on | 2026-09-09 |

## 1. Why this game

The second title. Small (a few days), no engine, and the first **real-time**
game on the platform: it exercises `onPause`/`onResume` and the "restore a run
that was moving" problem, neither of which 2048 touches. If the platform is
wrong about pausing, this game finds it — see decision 12 in
`docs/sdk-decisions.md`.

## 2. Rules

- Square grid, **15 x 15**. Snake starts length 3 in the middle, heading right,
  not moving until the first input.
- One food (apple) on the board at a time, in a uniformly random empty cell —
  never under the snake.
- Each tick the snake advances one cell. Eating food grows it by one and spawns
  the next food.
- **Walls are fatal.** No wrap-around. Running into your own body is fatal.
  Moving into the cell the tail is about to vacate this tick is **legal**.
- Score per food: `10 + floor(level)`, where `level = floor((speed - 6) / 0.35)`
  — i.e. the count of food eaten so far, capped once speed caps (level 22, so
  the 23rd food onward is a flat `32`). Formula lives in the pure core so it is
  testable at the boundary (`level` = 0, 21, 22, 23).
- Speed: 6 cells/second at the start, `+0.35` for every food eaten, capped at
  14. Speed is a property of the run and is part of the save state.
- A win state does not exist. The run ends when the snake dies.

The pure core exposes, alongside the state, two cosmetic-only flags the renderer
reads (§4): `justAte` (true on the tick a food was eaten) and `dead` (true once
the run has ended). They change no rule and are not persisted.

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

Plain `<canvas>`, no engine. Classic **Google-Snake visual language**, matching
the owner's mockups. Same DPR / square-fit sizing approach as
`games/2048/src/canvas.ts` — read it, do not import it.

**Art assets are generated from `docs/art-assets.json`** (rule 13) by an image
agent, committed under `games/snake/public/art/` as `.webp` sized to draw
resolution, and precached by the service worker so the game plays offline. The
generated set: the **apple** and the start-card **snake illustration**.
The grass **field**, the snake **body** and the three **face** states are
canvas-drawn — the field is a plain two-green checkerboard (a generated tile
came out blocky and seamed), the body bends and interpolates every frame.
`public/icon.svg` and
the catalog `cover` stay hand-authored flat vector in the same palette. **No
generated image contains any text** — every word is a translated key (§7).
The exact file list and sizes are settled in `plan.md`.

- 60fps on a mid-range Android device. Board sized from the smaller viewport
  dimension, 320px wide up to desktop.
- **Field:** checkerboard of two greens, with a slightly darker green margin
  around the play area. A darker green top strip carries the score HUD (§8).
- **Snake:** one continuous rounded body in a single royal blue, rounded caps,
  width ≈ 0.8 of a cell, corners rounded where it turns — not a row of squares.
  The head is a rounded blob with two white eyes and dark pupils, and a small
  red forked tongue that flicks in and out. The last ~5 cells taper to a thin
  tip (a real snake's tail). Tongue + taper added 2026-09-10.
- **Apple:** red circle with a short green leaf and a small highlight. Pulses
  gently. A brief flash on the cell when eaten.
- **Reactive face — required:**
  - *Cruising:* neutral eyes, closed mouth.
  - *Eating:* on the tick `justAte` is true, the mouth opens into a wedge at the
    front of the head and the eyes squint ("happy") for ~150ms, then it snaps
    back. Purely time-driven off the flag; no gameplay effect.
  - *Dead:* when `dead` is true, the head swaps to a dizzy face (spiral / X
    eyes).
- **Crash effect — required (matches the last mockup):** on death the whole
  snake desaturates to a dark navy, the dead face shows, and the board does one
  quick shake plus a short white flash. The dead-tint and dead face are
  information and stay even under reduced motion; only the shake and flash are
  motion.
- **Interpolation:** the snake slides between cells,
  `previous + (next - previous) * t` where `t` is progress through the current
  tick. It must not jump a whole cell per tick.
- `prefers-reduced-motion`: interpolation drops to snapping, the apple stops
  pulsing, the crash shake/flash are removed. The game itself is unchanged.

## 5. Persistence

Saved through `sdk.save()` after every food eaten and on every pause. The host
debounces; the game adds no debounce and no `pagehide` flush.

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
the start card (§8) and wait.

Clear `run` to `null` on death, after `gameOver`.

**Deliberately not persisted:**
- `justAte` / `dead` — cosmetic, derived from the run each tick.
- The 3-2-1 resume countdown — a restored run always re-counts in.
- No language of its own: the player's locale lives on the user record
  (`watchLocale`), never in this save.

`revived` **is** persisted — see Q6. Killing the tab does not refund a revive.

## 6. Monetisation hooks

| Hook | Placement | Moment | On `false` / suppressed |
| --- | --- | --- | --- |
| Rewarded | `revive` | once per run, on death, before the game-over card is committed | fall through to the normal game-over card; no penalty, no toast, no lost score |
| Interstitial | `run_end` | player taps "New game" from the game-over card, after the score is shown | nothing; never on death itself, never mid-run |

On a successful revive: the snake **keeps its score and its speed**, its old
body is **cleared** and replaced with **5 fresh segments** at the centre facing
the most open direction (grown *up* to 5 if it died shorter), the food is
**respawned** in a random empty cell, and play resumes after a 3-2-1 countdown.
`revived` is set so a second death in the same run goes straight to game-over.

`sdk.gameStart()` on a new or restored run; `sdk.gameOver({ score })` exactly
once, after the revive has been used or declined.

Analytics via `sdk.track`: `run_start`, `run_end` (score, length, duration_ms),
`revive_offered`, `revive_taken`, `best_beaten`, `paused` (reason).

## 7. Copy and locales

Every word the player reads is a translated key — none of it in a `.ts` or
`.html` file.

| | |
| --- | --- |
| Locales | `en`, `vi` (`en` is the fallback and the authoring language) |
| Longest-string risk | the game-over card's two buttons side by side; the start card's buttons |

Strings this game needs: `play`, `settings`, `language`, `back_to_hub`,
`swipe_to_start`, `tap_to_resume`, `game_over`, `new_game`, `continue_with_ad`,
and the two interpolated ones — `score(n)` and `best(n)` — as functions, never
concatenation.

The 3-2-1 countdown is digits and needs no translation. Scores render through
`Intl.NumberFormat(locale)`, not `toLocaleString()` with no argument. Locale
names in the settings picker are self-named (`Tiếng Việt`) via `LOCALE_NAMES`,
not translated, and each row carries `lang`.

## 8. Screens

- **Score HUD** (top strip, every screen except settings): apple + current run
  score on the left; trophy + best on the right once best > 0. Best updates live
  during a run (Q7).
- **Board.**
- **Start card** (shown whenever `run` is null): apple + last score, trophy +
  best, a drawn snake illustration, and two buttons — **Play** (dismiss to the
  board, showing "Swipe to start") and **Settings**. No "Daily challenge" (§9).
- **Idle overlay:** "Swipe to start" (or press an arrow).
- **Paused overlay:** "Tap to resume", then a 3-2-1 countdown. Pausing freezes
  the tick clock. Never resume straight into motion.
- **Game-over card:** score, best, "Continue with ad" (only if not yet revived),
  "New game". "New game" → interstitial → back to the start card.
- **Settings screen** (its own screen, this game's style): a **Language** row
  listing `en` + `vi` self-named with the current one marked, and a **Back to
  the hub** row. Reachable from the start card and while the game-over card is
  up; closing it does not dismiss the game-over card. Acts only through
  `sdk.setLocale(tag)` and `sdk.exitToHub()`; re-renders on `onLocaleChange`.
  Works standalone (no shell above it) exactly as embedded.

The play-screen top-right chrome in the mockup (fullscreen, speaker, ✕) is not
copied wholesale: fullscreen is not an SDK capability, and a game-drawn global
mute toggle is forbidden by rule 3. The ✕ maps to `sdk.exitToHub()` and may sit
in the HUD in addition to the settings row.

## 9. Explicitly out of scope

- **No daily challenge / daily-seed mode.** The mockup's button is dropped; no
  deterministic-by-date run, no per-day best.
- No difficulty picker, no board-size options, no game-speed setting.
- No sound in v0 — the platform mute state is read (`watchMute`) and may be
  reflected as a non-interactive icon, but there is no audio and no in-game mute
  control.
- No on-screen d-pad, no tap-to-turn, no fullscreen toggle.
- No leaderboard, no accounts, no shop (milestone rule, `CLAUDE.md`).

## 10. Acceptance criteria

- Unit tests on a pure `step(state, input, rng)` with no DOM: growth on food;
  self-collision at the neck vs. the tail (moving into the cell the tail vacates
  this tick is **legal**); wall death on all four edges; food never spawning
  under the snake; a full board handled without an infinite loop; reversal
  rejected; queued turns consumed one per tick (max 2); the score formula at
  `level` = 0, 21, 22, 23; `justAte` true only on the eating tick; `dead`
  detected exactly once; revive produces a length-5 centred snake with score and
  speed kept and food respawned off the snake.
- Save round-trip `state → save shape → state` is lossless; a truncated, an
  empty and a wrong-`v` save each return `null`, not a crash.
- Killing the tab mid-run and reopening restores the exact board, **paused**.
- A rewarded ad during play does not advance the snake; a suppressed
  interstitial starts no countdown over a dead board.
- Exactly one `gameStart` and one `gameOver` per run.
- The reactive face shows the eating state on the eating tick and the dead face
  on death; `prefers-reduced-motion` keeps the dead-tint but removes the shake
  and flash.
- Playable one-handed in portrait at 320px width, hit targets ≥ 44px.
- Runs both standalone at `/g/snake/` and embedded in the hub; both locales
  render with no missing key and no clipped control at 320px, and switching
  language re-renders without a reload.
- Installs to the Android home screen with its own icon; plays offline.

## 11. Open questions

All resolved 2026-09-09 — the owner accepted every proposed answer. Left here as
the record of what was decided and why; each is a case a unit test pins.

| # | Question | Resolution | Answered on |
| --- | --- | --- | --- |
| Q1 | `10 + floor(level)` — `level` was never defined. | `level = floor((speed - 6) / 0.35)` — food eaten so far, capped where speed caps at 14 (level 22). The 23rd food onward is a flat `32`. | 2026-09-09 |
| Q2 | Revive shortens the snake to 5 segments. What if it died shorter than 5? | Grow it *to* exactly 5. The reward is never a shorter snake than the player had. | 2026-09-09 |
| Q3 | Revive repositions at the centre — is the old body cleared or moved? | Cleared. 5 fresh segments at the centre facing the most open direction. Moving a 40-segment body has no unambiguous meaning. | 2026-09-09 |
| Q4 | Does speed reset on revive, or keep the run's speed? | Keep it. Score is kept, so keeping the difficulty that earned it is consistent; resetting speed would make revive a difficulty cheat. | 2026-09-09 |
| Q5 | Is the food respawned on revive, or left where it was? | Respawned. The board is being cleared anyway and the old food may now sit under the new snake. | 2026-09-09 |
| Q6 | `revived` is saved, so killing the tab does not grant a second revive — unlike 2048's run-local continue. Intended? | Yes, keep it saved, as a stated decision. A revive is worth more than an undo and a reload-to-refresh loop would be a real exploit. | 2026-09-09 |
| Q7 | Is `best` updated live during a run, or only at game over? | Live. The HUD shows both; a run that beats the best shows it immediately. `best_beaten` fires once per run. | 2026-09-09 |
