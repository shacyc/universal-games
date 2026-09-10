# Snake — Technical plan

| | |
| --- | --- |
| Brief | [`brief.md`](./brief.md) — **Frozen 2026-09-09** |
| Status | **Approved** |
| Approved on | 2026-09-09 |

One thing here departs from the frozen brief's literal wording — the 180°
rule, §8 D6 — because the brief's stated wording does not achieve its stated
goal. Flagged for the owner at approval, not changed quietly.

## 1. Module map

Every file in `games/snake/src/`. Pure modules are unit-tested directly;
anything touching the DOM or canvas is verified by hand (testplan §2).

| File | Owns | Pure? |
| --- | --- | --- |
| `src/main.ts` | boot, the RAF loop + tick accumulator, SW registration, wiring input → core → render → ui, the pause/resume pair | no |
| `src/session.ts` | **every** `sdk.*` call; `createSaveSlot`; `watchLocale` / `watchMute` | no |
| `src/snake.ts` | game rules — `newRun`, `queueTurn`, `step`, `reviveRun`, scoring, speed | **yes** |
| `src/save.ts` | save shape (`SaveState`), `toSavedRun` / `fromSavedRun`, the `isSaveState` boundary validator | **yes** |
| `src/input.ts` | swipe + keyboard → a `Dir`, fed to `queueTurn` | no |
| `src/assets.ts` | loads the generated `.webp` art, decodes to `ImageBitmap`, exposes it ready-or-throwing | no |
| `src/render.ts` | canvas: field, snake body path, head-face sprite, apple, inter-tick interpolation, crash shake/flash | no |
| `src/ui.ts` | DOM chrome — HUD, start card, idle / paused / game-over overlays, 3-2-1 countdown, the settings screen | no |
| `src/i18n/en.ts` `vi.ts` `index.ts` | strings (factories), `SUPPORTED`, `LOCALE_NAMES` | — |
| `src/styles.css` | the look; imports `@platform/sdk/game.css` first | — |
| `src/sw.ts` | service worker scoped to `/g/snake/`, precaches this build only | no |

Config (`package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`,
`public/manifest.webmanifest`) is copied from `games/2048/` verbatim with the
slug and dev port (`5175`) swapped, **plus** `webp` added to the VitePWA
`injectManifest.globPatterns` so the art precaches.

## 2. The pure core

`src/snake.ts`. State in, state out. No DOM, no `Date.now()`, no
`Math.random()` — `rng: () => number` is injected so a test pins it.

```ts
export type Dir = 'up' | 'down' | 'left' | 'right';
export const GRID = 15;            // 15 x 15, brief §2
export const CELLS = GRID * GRID;

export interface Run {
  body: number[];        // cell indices, head first, length >= 3, no duplicates
  dir: Dir;              // the direction the head actually moved on the last tick
  food: number;          // cell index, never in body
  score: number;
  speed: number;         // cells/second, 6 .. 14
  revived: boolean;
  pendingTurns: Dir[];   // queued turns, max 2, one consumed per tick
  dead: boolean;         // set once, by step(), on a fatal tick
  justAte: boolean;      // true only on the tick a food was eaten — cosmetic (§4)
}

export function newRun(rng: () => number): Run;
// Validates against the last pending turn, or `dir` if the queue is empty
// (§8 D6). Drops a 180° reversal and anything past depth 2. Returns a new Run.
export function queueTurn(run: Run, dir: Dir): Run;
// One tick: consume up to one pending turn, advance the head, grow-or-move the
// tail, resolve collisions. A dead run is returned unchanged (§8 D4-adjacent).
export function step(run: Run, rng: () => number): Run;
// Revive per brief §6 / Q2–Q5: 5 fresh centred segments (grown *to* 5),
// score + speed kept, food respawned clear of the new body, revived = true.
export function reviveRun(run: Run, rng: () => number): Run;

// 10 + floor(level), level = floor((speed - 6) / 0.35), level capped at 22.
export function scoreFor(speed: number): number;
export function speedAfter(speed: number): number;   // min(14, speed + 0.35)
```

- `step` clears `justAte` to `false` at entry and sets it `true` only when the
  head lands on `food`.
- **Tail-chase is legal** (brief §2): the cell the tail vacates *this* tick is
  free to move into, so collision is checked against `body` minus the last
  segment, unless the snake just ate (then the tail does not move).
- Food spawn: uniform pick over empty cells. Implementation walks the free-cell
  list by `floor(rng() * freeCount)` — O(CELLS), no rejection loop, so a nearly
  full board cannot spin. A full board returns the run with `dead` untouched and
  no food (nothing can be placed); `step` then ends the run on the next move.

## 3. Save state and versioning

Shape is brief §5. `load()` returns `unknown`; validation is once, at the
boundary, in `createSaveSlot(sdk, isSaveState)`. `isSaveState` and the shape
live in `src/save.ts` (pure, no SDK import — progress.md §4 deviation 1);
`session.ts` imports it and wires the slot.

```ts
export interface SaveState {
  v: 1;
  best: number;
  run: {
    body: number[];
    dir: Dir;
    food: number;
    score: number;
    speed: number;
    revived: boolean;
  } | null;
}
```

- `isSaveState` returns `null` (→ start fresh, and the slot then stops writing)
  unless: `v === 1`; `best` is a finite number; `run` is `null` **or** an object
  where `body` is an int array, `length >= 3`, every index in `[0, CELLS)`, no
  duplicates; `dir` is one of the four; `food` is an int in `[0, CELLS)` and not
  in `body`; `score` and `speed` are finite numbers.
- **Not persisted, and why:**
  - `pendingTurns` — input-local. A restored run is paused and the player
    re-orients before the first tick; an empty queue cannot restore a
    self-reversing state (§8 D2).
  - `justAte`, `dead` — derived from the run each tick (§8 D4).
  - the 3-2-1 countdown — a restored run always re-counts in (brief §5).
  - the language — it lives on the user record, read via `watchLocale` (§8 D5).
- **When `save()` is called:** after every food eaten, on every `pause()`, and
  once on death right after `gameOver`. Called freely — the host debounces.
  No game-side debounce, no `pagehide` flush (decision 3 in `sdk-decisions.md`).
- `best` is top-level, not inside `run`, so it survives the run ending; it is
  updated in memory the moment it is beaten (Q7) and written on those same
  `save()` calls (§8 D5).

## 4. Loop and timing

Real-time. One RAF loop in `main.ts`.

- **Tick rate:** `tickMs = 1000 / run.speed`, recomputed after every `step`
  because `speed` rises on eating (brief §2).
- **Accumulator:** `acc += Math.min(dt, 250)` per frame (the clamp stops a
  long stall from firing a burst of ticks); `while (acc >= tickMs) { run =
  step(run); acc -= tickMs; if (run.dead) break; }`. Tick progress is `acc /
  tickMs`, passed to `render` for interpolation — never read from
  `performance.now()` directly, or paused time leaks in.
- **Start / resume prime:** when a run begins (first input) or a 3-2-1 countdown
  clears, `acc = tickMs` so the first `step` lands on the next frame instead of
  a full tick later — the snake never freezes on "GO". (testplan §4 #5)
- **Turn nudge:** an accepted turn pulls the next tick forward to within
  `TURN_LAT_MS` (55 ms), clamped so a tick never fires sooner than
  `tickMs − TURN_LAT_MS` after the last one (`lastStepAt`). A turn phase-shifts
  the clock; it is never a free step, so average speed is unchanged. (§4 #5)
- **Interpolation:** interior spine vertices stay *exactly* on cell centres so
  corners are clean right angles; within a tick only the head slides out of the
  neck and the tail retracts `prevTailCell → curTailCell` (identical on a growth
  tick, so it holds still — no lurch). `render.ts` `bodyPoints`. (§4 #6, #7)
- **Body shape:** `drawSnakeBody` **strokes** the full-width run (round
  `lineJoin`/`lineCap` → smooth corners, no shimmer) and fills a short ribbon
  for the taper only — half-width eases `0.41·cell → 0` over the last ≤5 cells.
  A disc hides the seam; the head blob is ~1.2× body width. `drawTongue` adds a
  cosmetic flicking forked tongue. (§4 #7, #8)
- `prefers-reduced-motion`: `render` ignores `t` (snaps per tick), stops the
  apple pulse, and drops the crash shake + flash — but keeps the dead-tint and
  the dead face, which are information (brief §4, §10).

## 5. Pause and resume

One `pause()` / `resume()` pair in `main.ts`, fed from every source:

| Source | Into | Notes |
| --- | --- | --- |
| `sdk.onPause` / `sdk.onResume` | `pause()` / `resume()` | the host brackets every ad call (`sdk-decisions.md` §12) |
| `document.visibilitychange` → `hidden` | `pause()` | the host cannot see a backgrounded tab |
| `pagehide` | `pause()` | which also `save()`s |

- `pause()`: stop accumulating, show the paused overlay, `track('paused', {
  reason })`, `save()`. Idempotent — a second call while already paused is a
  no-op.
- `resume()`: **only** if currently paused *and* `run` is alive *and* no
  game-over card / settings screen is up. It shows the 3-2-1 countdown, then
  resumes accumulation with `acc = 0`. On a dead board, or when nothing was
  paused, it is a no-op. This is the idempotent-resume contract: a suppressed
  interstitial and the revive offer both fire `resume` with nothing to restart.

## 6. SDK call inventory

Every platform call, all of it in `session.ts`.

| Call | Trigger | Failure / `false` behaviour |
| --- | --- | --- |
| `ready()` | boot | — |
| `load()` | boot | invalid save → fresh run (slot then stops writing) |
| `save(state)` | after each food, on `pause()`, once after death | fire-and-forget; host debounces |
| `gameStart()` | a new run, and a run restored from save on boot | host issues the run id |
| `gameOver({ score })` | exactly once per run, after the revive is spent or declined | host ignores a duplicate |
| `showRewarded('revive')` | on death, before the game-over card is committed | `false` → normal game-over card; no penalty, no toast, no lost score |
| `showInterstitial('run_end')` | player taps "New game" on the game-over card, after the score is shown | may be suppressed; `resume` stays idempotent |
| `track(event, props)` | `run_start`, `run_end` (score, length, duration_ms), `revive_offered`, `revive_taken`, `best_beaten`, `paused` (reason) | — |
| `setLocale(tag)` | the Language row in the settings screen | outcome arrives via `onLocaleChange`; never re-render from the click |
| `exitToHub()` | the Back-to-hub row, and the HUD ✕ | may return `UNKNOWN_METHOD` from a host with no hub — log it, do nothing else |
| `watchLocale(sdk, SUPPORTED, fn)` | boot + every change | resolves the platform tag to `en` / `vi`, falls back to `SUPPORTED[0]` |
| `watchMute(sdk, fn)` | boot + every change | reflected as a non-interactive icon only; no audio in v0, no in-game toggle |

Not used: `getUser()` — the anonymous id is not needed and the locale comes
from `watchLocale`. Nothing here is outside `docs/platform-sdk.md` §4.

## 7. Risks and SDK gaps

| # | Risk / gap | Impact | Mitigation |
| --- | --- | --- | --- |
| R1 | The 180° rule in brief §3 ("check against the direction actually moved last, not the last input") still allows right → queue up → queue down, which reverses the snake into itself on the second consumed turn. | A frozen-brief rule that kills the player. | §8 D6: validate each turn against the last *pending* turn (or `dir` if the queue is empty). Owner to confirm at approval. |
| R2 | The image agent's output may carry stray glyphs or an off palette. | Rule 13 violation; a word rule 11 can't translate. | Every `prompt` in `art-assets.json` ends "no text, no letters, no numbers", and `globalConstraints` repeats it; every asset reviewed before commit; regenerate on any drift. |
| R3 | `.webp` not precached → blank art offline. | Breaks the offline promise. | `webp` added to `injectManifest.globPatterns`; art referenced by absolute `/g/snake/` path; verified against `pnpm build` + static preview, not dev. |
| R4 | Sprite face rotated to `dir` at the interpolated head position could shimmer at turns. | Cosmetic jank. | Body is a canvas path (§8 D1); the face is a single small sprite drawn last, snapped to the head cell's interpolated centre and rotated in 90° steps only. |
| R5 | HUD + board + overlay at 320px portrait. | Clipped controls, unplayable. | Board = `min(viewport)` minus HUD and safe-area; every overlay tested at 320px in both locales (testplan M3, and §1 layout rows). |
| — | No SDK gap. | | The brief needs no method outside §4. |

## 8. Decisions

| # | Decision | Alternative rejected | Why | Date |
| --- | --- | --- | --- | --- |
| D1 | The snake **body** is a canvas-drawn rounded path; the generated bitmaps are just `apple` and the start illustration (`title`). The field and the three face states are canvas too — see `progress.md` §4. | A full sprite-sheet snake; a generated grass tile. | The body bends and interpolates every frame; a face sheet is huge and still not smooth; the generated grass tile came out blocky and seamed, a two-colour checker is cleaner. | 2026-09-09, field added 2026-09-10 |
| D2 | `pendingTurns` is not persisted. | Persisting the queue. | A restored run is paused and re-oriented by the player; an empty queue also can't restore a self-reversing state. | 2026-09-09 |
| D3 | The three faces (cruise / eat / dead) are one `.webp` sprite sheet. | Three files. | One decode, one precache entry, one load path. | 2026-09-09 |
| D4 | `step()` on a `dead` run returns it unchanged; `justAte` / `dead` are recomputed, never stored. | A separate "is the run over" flag owned by `main.ts`. | The core already knows; a second owner is a second source of truth. | 2026-09-09 |
| D5 | `best` is top-level in the save, updated in memory when beaten, written on the normal `save()` calls. | A dedicated `saveBest()` path. | It survives the run ending and needs no extra call; Q7 wants it live anyway. | 2026-09-09 |
| D6 | `queueTurn` validates a turn against the **last pending turn** (or `dir` when the queue is empty), not only against `dir`. | Brief §3's literal "check against the direction actually moved last". | The literal rule lets two fast queued turns reverse the snake into itself — the very thing brief §3 says the rule exists to prevent. **Owner to confirm at approval.** | 2026-09-09 |

## 9. Task breakdown

Each task is a few hours, has a verifiable "done when", and its ID is what
`progress.md` and commits reference. IDs are stable — do not renumber.

| ID | Task | Done when | Depends on |
| --- | --- | --- | --- |
| T1 | Scaffold from `games/2048/` — config, `index.html`, manifest, empty `src/`, `webp` in globPatterns | `pnpm --filter @game/snake dev` serves a blank board at `/g/snake/`; `typecheck` clean | — |
| T2 | `src/snake.ts` pure core + `test/snake.test.ts` | every case in `testplan.md` §1 is green | T1 |
| T3 | Write `docs/art-assets.json`; hand it to an image agent → `public/art/*.webp` (apple, start illustration); `src/assets.ts` loader | assets decode; no text in any image; files committed under `games/snake/public/art/` | T1 |
| T4 | `src/render.ts` — field, body path, apple, inter-tick interpolation | a run renders and moves smoothly at 60fps; no persistence yet | T2, T3 |
| T5 | Reactive face + crash effect in `render.ts` | eat-face on the `justAte` tick; dead tint + face + shake + flash on death; `prefers-reduced-motion` keeps the tint, drops shake/flash | T4 |
| T6 | `src/input.ts` — swipe (24px, larger axis) + arrows/WASD → `queueTurn` | turns queue to depth 2, 180° rejected, `touch-action: none` on the surface | T2 |
| T7 | `src/ui.ts` — HUD, start card, idle + paused overlays, 3-2-1 countdown | navigable; Play → board idle; resume always counts in, never straight to motion | T4 |
| T8 | `src/session.ts` — `save`/`load` via `createSaveSlot` | kill the tab mid-run, reopen: exact board returns, **paused** | T2 |
| T9 | Lifecycle — `gameStart` / `gameOver` | exactly one of each per run, verified in the console | T8 |
| T10 | Ads — `showRewarded('revive')` before `gameOver`, `showInterstitial('run_end')` on "New game"; wire `reviveRun` | declining the ad changes nothing; interstitial never on the game-over screen itself | T9 |
| T11 | Pause/resume — all three sources into one pair, idempotent `resume` | clock does not advance under an ad overlay or a hidden tab; a suppressed interstitial starts no countdown over a dead board | T8 |
| T12 | i18n `en` + `vi`; settings screen (Language + Back to the hub) | both locales render at 320px with no missing key; switching re-renders with no reload; settings reachable while the game-over card is up; works standalone | T7 |
| T13 | PWA — `manifest.webmanifest`, `public/icon.svg` (hand vector), `src/sw.ts` scoped to `/g/snake/` | `pnpm build` then a static preview: installs on Android, plays offline including the art | T3, T7 |
| T14 | Register — one `catalog.json` entry + delete the `snake` line in `apps/shell/src/demo/demoData.ts`; own commit, pull first | one hub card, no "COMING SOON" duplicate | T13 |
| T15 | Manual pass on a real phone | `testplan.md` §2 all green, date + device recorded | all |
