# Neon Snake — Progress

| | |
| --- | --- |
| Status | **Gate 2** — plan approved 2026-09-09; implementing |
| Tasks done | 1 / 15 |
| Last updated | 2026-09-09 |

## 1. Tasks

Empty until `plan.md` §9 exists. Writing tasks against an unfrozen brief would
be inventing the game rather than planning it.

From `plan.md` §9. A task is `done` only with a test name, a commit or a manual
case ID as evidence.

| ID | Task | Status | Evidence | Note |
| --- | --- | --- | --- | --- |
| T1 | Scaffold from `games/2048/` | done | dev server serves the board at `/g/snake/`; `pnpm --filter @game/snake typecheck` clean; verified at 375px + 320px, no console errors | field drawing in `main.ts` is throwaway, `render.ts` replaces it at T4 |
| T2 | Pure core `src/snake.ts` + unit tests | todo | | testplan §1 U1–U24 |
| T3 | Generate art with `agy-image` → `public/art/*.webp` + `assets.ts` | todo | | field, apple, face sheet, start illustration |
| T4 | `render.ts` — field, body path, apple, interpolation | todo | | |
| T5 | Reactive face + crash effect | todo | | M14, M16 |
| T6 | `input.ts` — swipe + keyboard → `queueTurn` | todo | | |
| T7 | `ui.ts` — HUD, start card, idle/paused overlays, countdown | todo | | |
| T8 | `session.ts` — save/load via `createSaveSlot` | todo | | M5 |
| T9 | Lifecycle — `gameStart`/`gameOver` | todo | | M13 |
| T10 | Ads — rewarded revive + interstitial on New game | todo | | M7–M9 |
| T11 | Pause/resume — one pair, idempotent resume | todo | | M10–M12 |
| T12 | i18n `en`+`vi` + settings screen | todo | | M18–M20 |
| T13 | PWA — manifest, icon, SW scoped to `/g/snake/` | todo | | M17, M21 |
| T14 | Register — `catalog.json` + `demoData.ts` deletion | todo | | own commit, pull first |
| T15 | Manual pass on device | todo | | testplan §2 |

## 2. Definition of done

From `docs/building-a-game.md` §10. Nothing is ticked; nothing has been built.

- [ ] Core rules covered by unit tests on a pure, DOM-free module, including the
      edge cases named in the brief.
- [ ] `pnpm --filter @game/snake typecheck` and `test` both clean.
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
| — | nothing built yet | | | |

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
