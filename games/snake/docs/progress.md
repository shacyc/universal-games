# Snake — Progress

| | |
| --- | --- |
| Status | **Gate 2** — plan approved 2026-09-09; implementing |
| Tasks done | 11 / 15 |
| Last updated | 2026-09-10 |

## 1. Tasks

From `plan.md` §9. A task is `done` only with a test name, a commit or a manual
case ID as evidence.

| ID | Task | Status | Evidence | Note |
| --- | --- | --- | --- | --- |
| T1 | Scaffold from `games/2048/` | done | dev server serves the board at `/g/snake/`; `pnpm --filter @game/snake typecheck` clean; verified at 375px + 320px, no console errors | field drawing in `main.ts` is throwaway, `render.ts` replaces it at T4 |
| T2 | Pure core `src/snake.ts` + unit tests | done | `test/snake.test.ts` — 39 cases across U1–U24, all pass; `typecheck` clean | save shape + validator went in `src/save.ts`, not `session.ts` (§4) |
| T3 | Generate art with `agy-image` → `public/art/*.webp` + `assets.ts` | partial | `src/assets.ts` done (chroma-key loader, graceful 404 → procedural fallback); `docs/art-assets.md` has the 3 prompts + commands | **art generation itself blocked on the image-model daily quota** (resets ~20:45 local); scope cut to 3 files (field, apple, title) — head/face is canvas, see §4 |
| T4 | `render.ts` — field, body path, apple, interpolation | done | `src/render.ts`; verified in-browser — movement, interpolation, eat (score/len/speed), wall death; 320px + desktop | procedural now; bitmaps slot in when the webp files land |
| T5 | Reactive face + crash effect | done | `src/render.ts` — chomp face (pink mouth, 150ms), dizzy dead face, dead-tint, shake + white flash; verified via `__snake.paintFace` + pixel sampling | reduced-motion keeps tint, drops shake/flash |
| T6 | `input.ts` — swipe + keyboard → `queueTurn` | done | `test/input.test.ts` — U25 swipe decode, U26 key decode; `typecheck` clean | `createInput` binds it; decode is two pure fns |
| T7 | `ui.ts` — HUD, start card, idle/paused overlays, countdown | done | `src/ui.ts` + `styles.css`; verified in-browser — start card, idle hint, paused overlay, 3-2-1 countdown, game-over card, settings sheet | |
| T8 | `session.ts` — save/load via `createSaveSlot` | done | verified end-to-end: run persists (restore-paused seen on reload), save/load round-trip via IndexedDB host | M5 crash-restore observed working |
| T9 | Lifecycle — `gameStart`/`gameOver` | done | `startRunNow` on new + restored run; `endRunOnce` guarded; verified: start→run, death→gameover, revive keeps one run | full M13 pass on device at T15 |
| T10 | Ads — rewarded revive + interstitial on New game | done | verified: revive button → stub `showRewarded` 3s modal → `reviveRun` (L5, score kept) → countdown → running; "New game" → `showInterstitial('run_end')` (suppressed first session, handled) | M7–M9 |
| T11 | Pause/resume — one pair, idempotent resume | done | `pause()`/`resume()` fed from `onPause`/`onResume` + `visibilitychange` + `pagehide`; both guarded (no-op unless running/paused); ad pause/resume were no-ops on the game-over board | M10–M12 |
| T12 | i18n `en`+`vi` + settings screen | done | `test/i18n.test.ts` (S11); settings sheet verified — language page (en/vi self-named + `lang` + radio), live re-render on switch with **no reload**, back-to-hub row | M18–M20 |
| T13 | PWA — manifest, icon, SW scoped to `/g/snake/` | partial | `pnpm --filter @game/snake build` OK; `dist/` has index/assets/icon/manifest/sw.js; sw.js = classic worker scoped `/g/snake/`, precache 7 entries all snake-only, `snake-` cache prefix; index links absolute; DEV `__snake` hook stripped from the prod bundle; registration fixed (direct call — `load` had already fired) | **SW runtime + offline + install → device pass (T15)**: the Browser pane blocks all Service Workers (a 1-line noop SW fails identically) |
| T14 | Register — `catalog.json` + `demoData.ts` deletion | todo | | own commit, pull first |
| T15 | Manual pass on device | todo | | testplan §2 |

## 2. Definition of done

From `docs/building-a-game.md` §10. Nothing is ticked; nothing has been built.

- [ ] Core rules covered by unit tests on a pure, DOM-free module, including the
      edge cases named in the brief.
- [x] `pnpm --filter @game/snake typecheck` and `test` both clean. *(57 tests, as of T6; re-check each task.)*
- [ ] `pnpm build` succeeds and `dist/g/snake/` contains the game.
- [ ] Playable one-handed, portrait, 320px, all hit targets >= 44px.
- [ ] 60fps on a mid-range phone; input during animation is queued, not dropped.
- [ ] Kill the tab mid-run, reopen: the run comes back exactly (paused, if
      real-time).
- [ ] Works embedded in the hub **and** standalone.
- [ ] Installs to the Android home screen with its own icon, opens full-screen
      at `/g/snake/`, and plays offline afterwards.
- [ ] Every rewarded call site: declining it changes nothing.
- [ ] If the game has a clock: it does not advance under an ad overlay or a
      backgrounded tab, and `resume` on a stopped game is a no-op.
- [ ] `gameStart` once per run, `gameOver` once per run, verified in the console.
- [ ] `prefers-reduced-motion` shortens animations to near-zero.
- [ ] Every locale in `SUPPORTED` renders with no missing key and no clipped
      control at 320px, and switching language in the shell re-renders the game
      without a reload.
- [ ] No `localStorage`, no `fetch`, no direct IndexedDB anywhere in `src/`.
- [ ] No files changed outside `games/snake/`, `catalog.json` and the one
      `demoData.ts` deletion.
- [ ] `docs/testplan.md` §1 and §3 all `pass`; §2 run on a real phone, with the
      date and device recorded in its header.
- [ ] `docs/progress.md` is current.
- [ ] Deviations in §4, SDK gaps in §6.

## 3. Session log

### 2026-09-10 — art run-list → JSON; T13 PWA build

- **Did:** Owner asked for the art run-list as machine-readable JSON for another
  agent to consume — `docs/art-assets.json` (per-image `prompt` / `path` /
  `file` / `command` / chroma-key / accept check + tool & constraints);
  `art-assets.md` trimmed to a pointer. T13: `pnpm --filter @game/snake build`
  clean; inspected `dist/` — index/assets/icon/manifest/sw.js all present, sw.js
  is a classic worker scoped to `/g/snake/` with a 7-entry snake-only precache
  and `snake-` cache prefix, index links absolute, and the DEV `__snake` hook is
  absent from the prod bundle (`import.meta.env.DEV` strips it). Fixed the SW
  registration: it was on `window`'s `load` event, which has already fired by
  the time the async `boot()` reaches it — now a direct call.
- **Could not verify:** SW *runtime* registration / offline / install. The
  Browser pane blocks all Service Workers — a 1-line noop SW fails to register
  with the same "unknown error when fetching the script". Deferred to the device
  pass (testplan M17, M21). Everything checkable from the build artifact is
  correct (S3, S6, S7 → pass).
- **Next:** T14 — `catalog.json` entry + delete `snake` from `demoData.ts`
  (own commit, pull first). Then T3 art on quota, T15 device pass.
- **Blocked by:** device for the SW runtime check; `agy-image` quota for art.

### 2026-09-10 — T7 UI + T9/T10/T11/T12 wired; game playable end to end

- **Did:** `src/ui.ts` — HUD (🍎/🏆 + gear), start card (stats + drawn mascot +
  Play/Settings), idle hint, tap-to-resume paused overlay, 3-2-1 countdown,
  game-over card (score/best + "Continue with ad" when `!revived` + "New game"),
  and the settings sheet (root + language pages, `LOCALE_NAMES` self-named,
  `lang` attrs, radio semantics, Escape steps back). `styles.css` rewritten for
  all of it. `src/main.ts` rewritten as the full phase machine
  (`start/idle/running/paused/gameover`) wiring `session.ts`: `startRunNow` on
  new **and restored** runs, `endRunOnce` guard, revive flow
  (`offerRevive` → `reviveRun` → countdown), `newGame` (`endRunOnce` →
  `interstitialBeforeNewGame` → start card), one `pause()`/`resume()` pair fed
  from `onPause`/`onResume` + `visibilitychange` + `pagehide` (both idempotent),
  `onLocaleChange` → `stringsFor` → `ui.setStrings` re-render, `onMuteChange`
  reflected to `data-muted`, boot restore-paused from `session.load()`.
- **Verified in-browser** (standalone, `en` + `vi`): start → Play → idle →
  first key → running (`gameStart`); eat/score/grow/speed; wall death →
  game-over card; **revive**: button → stub 3s ad → Continue → `reviveRun`
  (length 5, score kept) → 3-2-1 → running; "New game" → interstitial
  (suppressed first session, handled) → start card; settings sheet → language
  page → pick `vi` → **whole UI + start card re-render live, no reload**;
  `visibilitychange`→hidden pauses (fires a lot under the automated browser —
  correct behaviour, just noisy there). `typecheck` + 57 tests clean.
- **Fixes made while verifying:** revive now saves the revived run explicitly
  (`snapshot()` saw phase `gameover` and wrote `run: null`); idle hint moved
  below centre so it doesn't cover the resting snake.
- **Next:** T13 (PWA — `pnpm build`, static preview, SW scope, offline), T14
  (`catalog.json` entry + delete `snake` from `demoData.ts`), T3 art files when
  the `agy-image` quota is up, T15 device pass.
- **Blocked by:** nothing for T13/T14; `agy-image` quota for the 3 art files.

### 2026-09-09 — T4 + T5 render (procedural), T3 loader, dev hook

- **Did:** Owner said keep going without waiting for the image quota, and to
  record the art run-list for later. Wrote `docs/art-assets.md` — 3 assets
  (`field` / `apple` / `title`), exact prompts + `agy_image.py` commands,
  chroma-key notes. `src/assets.ts` — loads the 3 webp from `public/art/`,
  keys magenta → alpha, and **falls back to `null` on 404 so render draws
  procedurally**; the game is fully playable before any art exists. `src/render.ts`
  — square DPR fit, checker field (bitmap-or-drawn), apple (bitmap-or-drawn,
  pulsing), snake as a rounded interpolated path, chomp face (pink open mouth,
  150ms after `justAte`), dizzy dead face (spiral eyes), dead-tint, crash shake
  + white flash; `prefers-reduced-motion` keeps the tint, drops shake/flash.
  Rewrote `src/main.ts` as the loop: phase (idle/running/dead), tick
  accumulator, `tickMs = 1000/speed` recomputed each step, input → `queueTurn`,
  HUD (stopgap). Added a `DEV`-only `window.__snake` hook (§4 dev-tooling row).
- **Verified in-browser** (standalone `/g/snake/`): idle board; first key
  starts motion; snake advances with interpolation; eating → score +10,
  length +1, speed 6→6.35 (read via `__snake.state`); wall death → dead;
  dead body goes navy; `paintFace` + canvas pixel sampling confirm cruise vs
  chomp (pink mouth, 31px) vs dizzy differ, and the white flash covers the
  board at `deadAt≈now`. 320×560 and desktop both fine, no console errors.
  `typecheck` + `test` (57) clean.
- **Deviations (§4):** #3 the snake/face is fully canvas-drawn (not a generated
  sprite sheet) — the image model has no alpha; #4 the dev hook.
- **Next:** T7 — `src/ui.ts`: HUD (i18n), start card, idle/paused overlays,
  3-2-1 countdown, game-over card, settings screen. Then T9/T10/T11 wire
  `session.ts` (lifecycle, ads, pause/resume) into `main.ts`. T3 art whenever
  the quota is up — drop the 3 webp in and rebuild.
- **Blocked by:** nothing for T7; `agy-image` quota for the T3 art files only.

### 2026-09-09 — T8 session.ts written (verification deferred)

- **Did:** `src/session.ts` — the single SDK boundary. `createSession()` wires
  `createSaveSlot(sdk, isSaveState)` and exposes: `ready`/`load`/`save`,
  `startRun`/`endRun` (gameStart + run_start; gameOver + run_end once),
  `offerRevive` (`showRewarded('revive')`), `interstitialBeforeNewGame`
  (`showInterstitial('run_end')`), `track`, `onMuteChange`/`onLocaleChange`
  (via `watchMute`/`watchLocale`), `onPause`/`onResume`, `setLocale`/
  `exitToHub`. Mirrors `games/2048/src/session.ts`.
- **Verified:** `typecheck` clean; dev server still boots with no console
  errors. **Not** verified: M5 (crash-restore) and M13 (one gameStart/gameOver
  per run) need the game loop — deferred to after T4/T7. T8 is `partial` until
  then.
- **Next:** unchanged — T3 when the `agy-image` quota resets, then T4.
- **Blocked by:** `agy-image` daily quota for the T3→T4→T5→T7 chain.

### 2026-09-09 — T6 input + i18n strings pulled forward; T3 blocked on image quota

- **Did:** T6 — `src/input.ts`: `swipeDir` / `keyDir` pure decoders (24px
  threshold, larger axis wins, arrows + WASD either case) plus `createInput`
  binding pointer + keydown; `test/input.test.ts` (U25, U26). Pulled the i18n
  string modules forward from T12 because `session.ts` needs `SUPPORTED`:
  `src/i18n/en.ts` (keys from brief §7 + `back`, `number`), `vi.ts` typed
  against it (one non-literal entry noted — `best` = "Cao nhất"), `index.ts`
  (`SUPPORTED`, `LOCALE_NAMES`, `stringsFor`); `test/i18n.test.ts` (S11).
- **Why out of order:** T3 needs the `agy-image` model, which hit its daily
  quota on the first call (`429`, resets ~20:55 local). T4/T5 render that art,
  so the whole T3→T4→T5→T7 chain waits. T6 and the i18n strings are the
  art-free work that was ready.
- **Verified:** `pnpm --filter @game/snake test` → 57 pass (snake 39, input 7,
  i18n 11); `typecheck` clean.
- **Deviation (§4):** T12 split — i18n strings landed now, settings screen
  stays in T12 (needs the UI layer). Task table updated.
- **Next (when the quota resets):** T3 — generate `field.webp`, `apple.webp`,
  the head-face sheet and `title.webp` into `public/art/`, write `assets.ts`.
  Then T4. `session.ts` (T8) can also be written now — deferred only because it
  is verified against a running loop (M5), which needs T4/T7.
- **Blocked by:** `agy-image` daily quota for T3.

### 2026-09-09 — T2 pure core + unit tests

- **Did:** `src/snake.ts` — `newRun`, `queueTurn` (D6: validates against the
  last pending turn), `step` (one tick: consume a turn, advance, grow/move,
  wall + self collision; tail-chase legal; dead run returned reference-equal),
  `reviveRun` (exactly 5 centred segments, score + speed kept, food respawned
  clear), `scoreFor` (`10 + level`, `round` not `floor` for float safety,
  capped at level 22), `speedAfter` (`+0.35`, cap 14), `spawnFood` (walks the
  free list, `-1` on a full board). `src/save.ts` — `SaveState` / `SavedRun`
  shape, `toSavedRun` / `fromSavedRun`, `isSaveState` boundary validator.
  `test/snake.test.ts` — 39 cases covering testplan §1 U1–U24.
- **Verified:** `pnpm --filter @game/snake test` → 39 pass;
  `pnpm --filter @game/snake typecheck` clean (both tsconfigs). testplan §1
  all `pass`; §3 S1 + S2 `pass`.
- **Deviation (see §4):** the save shape + validator live in `src/save.ts`, not
  `session.ts` as plan §1 said, so the round-trip (U22/U23) is unit-tested
  without importing the SDK client. `session.ts` (T8) imports `isSaveState`
  from there. Plan §1 module map updated.
- **Next:** T3 — generate the art with `agy-image` (`public/art/` field tile,
  apple, face sheet, start illustration) + `src/assets.ts` loader.
- **Blocked by:** nothing.

### 2026-09-09 — T1 scaffold (Gate 2 open)

- **Did:** Plan approved (D6 confirmed by the owner). Scaffolded `games/snake/`
  from `games/2048/`: `package.json` (`@game/snake`), `vite.config.ts`
  (`base: /g/snake/`, port 5175, `webp` added to `injectManifest.globPatterns`),
  `tsconfig.json` + `tsconfig.sw.json`, `index.html` (absolute `/g/snake/`
  links, `theme-color #4a7a2c`), `public/manifest.webmanifest` (id/scope/
  start_url all `/g/snake/`), a hand-vector `public/icon.svg`, `src/sw.ts`
  (scoped to `/g/snake/`, `snake-` cache prefix), `src/sw-env.d.ts`,
  `src/styles.css` (imports `@platform/sdk/game.css` first, palette tokens,
  safe-area padding, square `.surface`), and a minimal `src/main.ts` that mounts
  the HUD + square canvas and paints the checkerboard field. Added a `snake`
  entry to `.claude/launch.json` (port 5175).
- **Verified:** `pnpm install` links the new workspace package;
  `pnpm --filter @game/snake typecheck` clean (both tsconfigs); dev server at
  `http://localhost:5175/g/snake/` renders the board + HUD with no console
  errors, at 375px and 320px portrait. `pnpm game:status snake` → G2.
- **Deviation:** none. The field-drawing code in `main.ts` is deliberately
  throwaway and moves into `render.ts` at T4 (noted in the task table).
- **Not committed** — waiting on the owner's word on commit cadence (CLAUDE.md
  says solo work lands on `main` directly; the harness asks for explicit
  go-ahead to commit).
- **Next:** T2 — `src/snake.ts` pure core + `test/snake.test.ts`, every case in
  `testplan.md` §1 (U1–U24).
- **Blocked by:** nothing.

### 2026-09-09 — Brief frozen; plan + test plan drafted (Gate 1)

- **Did:** Owner froze `brief.md` (header → `Frozen`, dated) and directed that
  bitmap art be generated with the `agy-image` skill — folded into brief §4:
  the grass field tile, the apple, a 3-frame face sheet (cruise/eat/dead) and
  the start-card snake illustration are generated `.webp` under
  `public/art/`; the moving body stays a canvas path; `icon.svg` and the
  catalog `cover` stay hand vector; no generated image carries text. Wrote
  `plan.md` (module map, pure-core interface, save shape + validation, loop +
  accumulator, one pause/resume pair, full SDK inventory, 6 decisions, T1–T15)
  and `testplan.md` §1 (U1–U24) + §2 (M1–M22) + §3 (S0–S10). Created the task
  table above.
- **One departure from the frozen brief, flagged for approval:** plan §8 D6.
  Brief §3 says the 180° check is "against the direction actually moved last,
  not the last input" — but that lets `right → queue up → queue down` reverse
  the snake into itself on the second consumed turn, which is exactly what the
  rule is supposed to prevent. D6 validates each turn against the last *pending*
  turn instead. Needs the owner's yes.
- **Verified:** `pnpm game:status snake` → G1, through G0. SDK inventory uses
  only `docs/platform-sdk.md` §4 methods (`showRewarded`, `showInterstitial`,
  `gameStart/Over`, `save/load`, `setLocale`, `exitToHub`, `track`,
  `watchLocale`, `watchMute`). No SDK gap.
- **Next:** Owner approves the plan (in particular D6 and that no T-task hides a
  week). Then Gate 2: T1 scaffold, T2 pure core + tests, in `plan.md` §9 order.
- **Blocked by:** plan approval.

### 2026-09-09 — Visual direction set, brief revised, Q1–Q7 resolved

- **Did:** No game code (Gate 0). Owner asked for the game to be built with the
  classic Google-Snake look from mockups they supplied, a reactive snake face
  (open "chomp" mouth on the eating tick, dizzy face on death) and a crash
  effect (snake desaturates + board shake/flash). Ran the brief interview.
  Decisions taken by the owner: (1) retitle "Neon Snake" → "Snake", rewrite §4
  to the green-field look, redo icon/cover/tagline to match; (2) drop the
  mockup's "Daily challenge" button — no daily-seed mode, added to §9; (3) keep
  the rewarded `revive` on death; (4) accept all seven proposed answers to
  Q1–Q7 as written. Rewrote `brief.md`: retitled, §4 rendering rewritten with
  the reactive-face and crash-effect requirements, §8 gains the start card and
  the now-mandatory settings screen (rule 12 — the old §9 "no settings screen"
  line was a pre-decision-18 relic and is deleted), §9 expanded to five
  entries, §11 all resolved with dates.
- **Also flagged to the owner:** the play-screen speaker icon in the mockup
  can't be a game-drawn mute toggle (rule 3); spec'd it as dropped / reflect
  only. Fullscreen icon dropped (not an SDK capability). The ✕ maps to
  `exitToHub`.
- **Verified:** brief needs no SDK method outside `docs/platform-sdk.md` §4 —
  `revive` uses `showRewarded`, `run_end` uses `showInterstitial`, settings
  uses `setLocale` + `exitToHub`, all present. `pnpm game:status snake` still
  reports G0 (header still says Draft — correct until the owner freezes).
- **Next:** Owner flips `brief.md` header to `Frozen` with a date. Then Gate 1:
  write `plan.md` (§1 module map, §2 pure-core interface, §6 SDK inventory, §9
  tasks) and `testplan.md` §1 cases, create the task table here, get the plan
  approved. Still no code.
- **Blocked by:** the owner's explicit freeze of `brief.md`.

### 2026-09-08 — Multi-language became a platform rule; brief gains §7

- **Did:** No game code. The owner added i18n as a v0.1 requirement, so it
  landed as a platform decision (`docs/sdk-decisions.md` §15) rather than in
  this game: the shell owns the language, the game owns its words. Filled the
  new `brief.md` §7 with the string keys this game needs. Brief sections after
  §6 renumbered, so §10 open questions is now §11.
- **Verified:** `pnpm --filter @platform/sdk test` — 58 pass, including the new
  `watchLocale` and `resolveLocale` cases. `pnpm typecheck` clean.
- **Next:** Unchanged — the owner answers Q1–Q7 and freezes the brief. §7 needs
  no answer from them; it follows from the platform rule.
- **Blocked by:** Q1–Q7, same as before.

### 2026-09-08 — Docs set up; brief blocked on seven undefined cases

- **Did:** Ran `docs/building-a-game.md` §0. Step 2 gave **Case A** (no
  `games/snake/docs/`), with the older-game rule applying: `docs/game-snake.md`
  existed as a pre-process spec. Moved it to `games/snake/docs/brief.md` with
  `git mv` (history preserved) and restructured it into the brief template —
  **no rule was changed**. Copied `plan.md` and `testplan.md` as empty
  templates; they belong to Gate 1.
- **Verified:** Read `CLAUDE.md`, `docs/platform-sdk.md`,
  `docs/sdk-decisions.md` §12 (the pause bracketing this game exists to test),
  `games/2048/src/session.ts`. Confirmed the brief needs no SDK method that does
  not exist. Confirmed `snake` is in `apps/shell/src/demo/demoData.ts:45` and in
  `SPOTLIGHT`, so the placeholder deletion is required at registration. Port
  5175 is free in `catalog.json`.
- **Next:** Owner answers Q1–Q7 in `brief.md` §11, then the brief is frozen and
  Gate 1 starts. No code before that.
- **Blocked by:** Q1–Q7. Q1 (the `level` term in the score formula) is the hard
  blocker — it is in the pure core and every scoring test depends on it.

## 4. Deviations from brief / plan

| # | What the doc says | What was built | Why | Doc updated? |
| --- | --- | --- | --- | --- |
| 1 | plan §1: save shape + `isSaveState` live in `session.ts` | they live in `src/save.ts`; `session.ts` will import them | pure functions with no SDK import, so `test/snake.test.ts` covers the round-trip (U22/U23) without pulling in the client | yes — plan §1 module map adds `save.ts` |
| 2 | plan §9: T12 is "i18n + settings screen" | the i18n string modules (`en`/`vi`/`index`) were built during the T6 session | `session.ts` needs `SUPPORTED`, and the strings are art-free work that was ready while T3 was quota-blocked | yes — T12 marked `partial`, task note updated |
| 3 | brief §4 / plan §1: the snake's three **face states** are a generated sprite sheet | the whole snake — body, head, all three faces, crash tint — is **canvas-drawn**; only field / apple / title are bitmaps (3 files, not 4 + a sheet) | the `agy-image` model paints a background, not alpha; a magenta-keyed head sprite over the canvas-blue body fringes and cannot rotate to 4 dirs crisply or switch state in one frame. Canvas gives sharp palette-exact faces. Documented in `docs/art-assets.md`. | yes — `art-assets.md`, brief §4 note pending owner ack |
| 4 | none (tooling) | `main.ts` has a `import.meta.env.DEV`-only `window.__snake` hook (`state`, `feedAhead`, `paintFace`) for verifying sub-150ms render states from a still screenshot | screenshot latency exceeds the chomp/flash windows; stripped from any production build | n/a — dev-only |

## 5. Open questions for the owner

Full text and proposed answers are in `brief.md` §11. Summarised:

| # | Question | Resolution | Status |
| --- | --- | --- | --- |
| Q1 | `level` in `10 + floor(level)` is undefined | `level = floor((speed - 6) / 0.35)`, capped at 22 | **resolved 2026-09-09** |
| Q2 | Revive when the snake died shorter than 5 | grow *to* 5 | resolved 2026-09-09 |
| Q3 | Revive: old body cleared or moved | cleared, 5 fresh centred segments | resolved 2026-09-09 |
| Q4 | Revive: speed reset or kept | kept | resolved 2026-09-09 |
| Q5 | Revive: food respawned | respawned | resolved 2026-09-09 |
| Q6 | `revived` persisted, unlike 2048's run-local continue | keep persisted, stated as a decision | resolved 2026-09-09 |
| Q7 | `best` updated live or at game over | live | resolved 2026-09-09 |

New this session:

| # | Question | Resolution | Status |
| --- | --- | --- | --- |
| Q8 | Visual identity vs. the "Neon Snake" name | retitle to "Snake", classic green-field look | resolved 2026-09-09 |
| Q9 | Mockup's "Daily challenge" button | dropped, added to brief §9 | resolved 2026-09-09 |
| Q10 | Mockup's speaker icon vs. rule 3 | no game-drawn mute toggle; dropped / reflect-only | resolved 2026-09-09 |
| Q11 | Art pipeline | owner: generate bitmap art with the `agy-image` skill (brief §4) | resolved 2026-09-09 |
| Q12 | 180° rule (plan §8 D6) — brief §3's literal wording lets a queued pair self-reverse | validate against the last *pending* turn | resolved 2026-09-09 — owner confirmed D6 at plan approval |

## 6. Platform gaps hit

| # | Gap | Worked around by | Reported? |
| --- | --- | --- | --- |
| — | none so far — the brief needs no SDK method that does not exist | | |
