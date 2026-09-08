# 2048 — Technical plan

Written after the fact, from the shipped code, when the game was migrated into
the documented process. It describes what `src/` actually does — where that
differs from what a plan written up front would have said, the difference is
noted rather than smoothed over.

| | |
| --- | --- |
| Brief | [`brief.md`](./brief.md) — frozen 2026-09-08 |
| Status | **Implemented** |
| Approved on | — (predates the process) |

## 1. Module map

| File | Owns | Pure? |
| --- | --- | --- |
| `src/main.ts` | boot, run state, the frame loop, SW registration | no |
| `src/session.ts` | **every** `sdk.*` call, and the save shape's validation | no |
| `src/board.ts` | the rules: slide, merge, spawn, game-over, clearLowest | **yes** |
| `src/render.ts` | drawing a frame from grid + animation phase | no |
| `src/anim.ts` | animation durations, and `prefers-reduced-motion` | no |
| `src/canvas.ts` | DPR handling and square-fit sizing | no |
| `src/input.ts` | swipe and keyboard to a `Direction` | no |
| `src/ui.ts` | the DOM chrome and overlays; holds no text of its own | no |
| `src/i18n/en.ts` | the fallback strings, and the `Strings` type | **yes** |
| `src/i18n/vi.ts` | Vietnamese, typed against `en` | **yes** |
| `src/i18n/index.ts` | `SUPPORTED` and `stringsFor(locale)` | **yes** |
| `src/sw.ts` | the service worker, scoped to `/g/2048/` | no |

`board.ts` and `src/i18n/` are what the tests hit directly. Everything else is
DOM or canvas and is verified by hand — see `testplan.md` §2.

## 2. The pure core

```ts
export function move(grid: Grid, direction: Direction): {
  grid: Grid; moved: boolean; gained: number; movements: Movement[];
};
export function spawn(grid: Grid, rng: () => number): { index: number; value: number } | null;
export function isGameOver(grid: Grid): boolean;
export function clearLowest(grid: Grid, count: number): Grid;
export function highestTile(grid: Grid): number;
```

`rng` is injected so a test can pin the 90/10 spawn. `move` returns
`movements` as well as the new grid, which is what lets the renderer animate
from where each tile came rather than snapping.

## 3. Save state and versioning

The shape in `brief.md` §5, validated in `session.ts` by `isSaveState` and
wired through `createSaveSlot`.

- `validate` rejects: a non-object, `v !== 1`, a board that is not 16 cells of
  number-or-null, a non-numeric score or best, a non-boolean `wonShown`, or an
  `undo` whose board fails the same test.
- Not persisted, deliberately: `freeUndoUsed`, `continueUsed`, `moves`, `over`.
  A reload therefore grants a fresh free undo and a fresh continue.
- `save()` is called on every move, on win, on continue and on undo. No
  game-side debounce — the host coalesces.

## 4. Loop and timing

Not a clock game, but it does animate. `requestAnimationFrame` runs
continuously; a `Phase` holds the current animation and `phaseDone` retires it.
Input during a phase is pushed onto `queued` (max 12) and consumed one per
completed phase, so fast swiping never loses a move.

## 5. Pause and resume

**N/A — turn-based, no clock.** An ad overlay costs this game nothing: the
board does not advance on its own. `onPause`/`onResume` are deliberately not
handled. See `docs/sdk-decisions.md` §12.

## 6. SDK call inventory

Every platform call, all of them inside `session.ts`.

| Call | Session method | Trigger | Failure / `false` behaviour |
| --- | --- | --- | --- |
| `ready()` | `ready` | boot | boot fails visibly via `boot_error` |
| `load()` | `load` | boot | invalid save → start fresh, and the slot stops writing |
| `save(state)` | `save` | every move, win, undo, continue | fire-and-forget |
| `gameStart()` | `startRun` | new run, and a restored run | — |
| `gameOver({score})` | `endRun` | board locked, after continue used or declined | host ignores duplicates |
| `showRewarded('undo')` | `rewardedUndo` | second undo onward | change nothing, say nothing |
| `showRewarded('continue')` | `rewardedContinue` | locked board, once per run | fall through to game over |
| `showInterstitial('run_end')` | `interstitialBeforeNewGame` | "New game" tapped after game over | may be suppressed |
| `track(...)` | `track` | the seven events in `brief.md` §6 | — |
| `onMuteChange` | `onMuteChange` | boot | sets `data-muted`; no sounds ship yet |
| `onLocaleChange` | `onLocaleChange` | boot, and every language change | re-labels the UI and re-formats scores |

## 7. Risks and SDK gaps

| # | Risk / gap | Impact | Mitigation |
| --- | --- | --- | --- |
| R1 | The PWA manifest is single-language | The home-screen name is English for every player | Accepted, platform-wide — `docs/sdk-decisions.md` §15 |
| R2 | `ui.ts` is untested by machine | A relabelling regression would only show on screen | Manual cases M8–M10 in `testplan.md`; no jsdom dependency added for one file |

## 8. Decisions

| # | Decision | Alternative rejected | Why | Date |
| --- | --- | --- | --- | --- |
| D1 | Free undo and continue are run-local | Persisting them | The saved shape is fixed by the brief; a reload granting a fresh one is generous, not exploitable — there is no score submission | pre-process |
| D2 | `movements` returned from `move` | Diffing two grids in the renderer | Diffing cannot tell which of two equal tiles moved where, so merges animate wrongly | pre-process |
| D3 | Strings are a factory taking `Intl.NumberFormat` | A plain object plus formatting at the call site | Keeps the whole sentence in one entry, which is the rule that makes it translatable | 2026-09-08 |
| D4 | `ui.setStrings` relabels in place | Tearing down and rebuilding the DOM | The board canvas lives inside the chrome; rebuilding would drop the rendering context mid-run | 2026-09-08 |

## 9. Task breakdown

Reconstructed. All done — the game shipped before this file existed.

| ID | Task | Done when | Depends on |
| --- | --- | --- | --- |
| T1 | Scaffold, Vite, PWA config | serves at `/g/2048/` | — |
| T2 | `board.ts` + unit tests | every merge case green | T1 |
| T3 | Canvas render + input | playable | T2 |
| T4 | `session.ts`: save/load | kill the tab, state returns | T3 |
| T5 | Lifecycle: `gameStart`/`gameOver` | once per run | T4 |
| T6 | Ads: undo, continue, interstitial | declining changes nothing | T5 |
| T7 | PWA: manifest, icon, scoped SW | installs on Android | T3 |
| T8 | Register in `catalog.json` | one card in the hub | T7 |
| T9 | i18n: `src/i18n/`, `watchLocale`, `ui.setStrings` | both locales render, switching needs no reload | T3 |
