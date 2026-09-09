# 2048 — Progress

| | |
| --- | --- |
| Status | **Shipped** — with an unrecorded device pass, see §5 |
| Tasks done | 11 / 11 |
| Last updated | 2026-09-09 |

## 1. Tasks

IDs from `plan.md` §9, reconstructed from the shipped code.

| ID | Task | Status | Evidence | Note |
| --- | --- | --- | --- | --- |
| T1 | Scaffold, Vite, PWA config | done | `games/2048/vite.config.ts`, builds to `dist/g/2048/` | |
| T2 | `board.ts` + unit tests | done | `test/board.test.ts`, 24 cases, U1–U16 | |
| T3 | Canvas render + input | done | M1, M2 | |
| T4 | `session.ts`: save/load | done | `isSaveState` + `createSaveSlot` | M5 never recorded |
| T5 | Lifecycle | done | `startRun` / `endRun` in `session.ts` | M13 never recorded |
| T6 | Ads: undo, continue, interstitial | done | three call sites in `session.ts` | M7, M12 never recorded |
| T7 | PWA: manifest, icon, scoped SW | done | `public/manifest.webmanifest`, `src/sw.ts` | M15, M16 never recorded |
| T8 | Register in `catalog.json` | done | one entry, no `demoData.ts` placeholder | |
| T9 | i18n | done | `src/i18n/`, `test/i18n.test.ts` (11 cases), M8–M11 | |
| T10 | Settings screen (platform rule 7) | done | `src/ui.ts` menu, `session.ts` `setLocale`/`exitToHub`, M17–M19 | added after the brief was frozen; see §4 |
| T11 | The language belongs to the player (platform rule 6) | done | M20 | platform-side only; no change in `games/2048/src/` |

## 2. Definition of done

Ticked only where something actually evidences it. The unticked boxes are not
work that is missing — they are work that was never written down, which for a
shipped game is the honest state and the reason this file now exists.

- [x] Core rules covered by unit tests on a pure, DOM-free module, including the
      edge cases named in the brief.
- [x] `pnpm --filter @game/2048 typecheck` and `test` both clean.
- [x] `pnpm build` succeeds and `dist/g/2048/` contains the game.
- [x] Playable one-handed, portrait, 320px, all hit targets >= 44px. — M3,
      measured 2026-09-09
- [ ] 60fps on a mid-range phone; input during animation is queued, not dropped.
- [ ] Kill the tab mid-run, reopen: the run comes back exactly. — M5
- [x] Works embedded in the hub **and** standalone. — M1, M2
- [ ] Installs to the Android home screen with its own icon, opens full-screen
      at `/g/2048/`, and plays offline afterwards. — M15, M16
- [ ] Every rewarded call site: declining it changes nothing. — M7
- [x] If the game has a clock: N/A, turn-based. `plan.md` §5.
- [ ] `gameStart` once per run, `gameOver` once per run, verified in the console. — M13
- [ ] `prefers-reduced-motion` shortens animations to near-zero. — M14
- [x] No `localStorage`, no `fetch`, no direct IndexedDB anywhere in `src/`.
      — enforced by `.githooks/pre-commit`
- [x] No files changed outside `games/2048/`, `catalog.json` and the one
      `demoData.ts` deletion.
- [ ] `docs/testplan.md` §1 and §3 all `pass`; §2 run on a real phone.
- [x] `docs/progress.md` is current.
- [x] Deviations in §4, SDK gaps in §6.
- [x] Every locale in `SUPPORTED` renders with no missing key and no clipped
      control at 320px, and switching language re-renders without a reload.
      — M9, M10, M11, all measured 2026-09-09

## 3. Session log

### 2026-09-09 (e) — The language moved onto the user record

- **Owner's call:** no device storage — the language comes back with the user
  when the page loads. It is now a field on the user record (`getUser()` returns
  `{ id, isAnonymous, locale }`), and `arcade:locale` in `localStorage` is gone.
  Nothing in `games/2048/src/` changed for it.
- **Why it is better than what it replaced:** the device key was a second source
  of truth that had to be kept in step with everything else about the player.
  `getUser()` already existed and every surface already calls it. When the API
  lands, the record comes from the server and the language arrives with it, with
  nothing in the shell or in any game to change — where a device key would have
  needed a migration and a rule for which device wins.
- **One writer:** `adoptLocale` in `createHost` records it, whichever host is
  running and whoever asked. A write that fails is logged; the change still
  stands for the session and it is the next boot that has forgotten it.
- **Read before first paint:** the shell awaits it in `boot()` and the
  standalone host awaits it before it exists, so neither renders one language
  and swaps. Measured on the standalone game: first contentful paint at 132ms
  with `<html lang>` already correct.
- **A real loss, recorded not hidden:** cross-tab changes are no longer live.
  That was the `storage` event, and IndexedDB has no equivalent. A second tab
  picks the language up on its next load. M20 was rewritten to test what is now
  true, and M21 records the next-load behaviour as unverified rather than
  leaving a `pass` on a capability that no longer exists.
- **Still open:** the same six device checks. Q1 unchanged.

### 2026-09-09 (d) — One choice, every surface

- **Requirement, from the owner:** the language follows the player — set once,
  everywhere follows. Audited against it and found two places where it did not.
- **The hub was narrowing the choice before storing it.** It resolved the tag
  against the *shell's* locale list on the way into `localStorage`, which made
  the hub's translation status a silent ceiling on the platform: a game shipping
  a language the hub lacks would have been overwritten with English, with
  nothing logged. The stored value is now the player's tag verbatim, and each
  surface resolves at render. Nothing in `games/2048/src/` changed for it.
- **A second tab did not follow.** `localStorage` was written and never watched.
  Both hosts now watch it. Verified as M20 with a hub tab and a standalone
  `/g/2048/` tab: both directions propagate live, and the receiving tab's
  navigation count stayed at 1, so nothing reloaded.
- **Tests:** a shell test that fails on the old behaviour (checked by reverting
  it), plus cross-tab cases in the SDK.
- **Still open:** the same six device checks. Q1 unchanged.

### 2026-09-09 (c) — Settings moved into the game, as the platform now requires

- **Rule change, by the owner:** every game ships its own settings screen, in
  its own style, holding at least the language and the way back to the hub
  (CLAUDE.md rule 7, decision 18). This reverses the shell-side sheet from
  earlier today. The SDK gained `setLocale` and `exitToHub` to make it possible
  — the milestone's only new methods, and the reason the rule is followable at
  all rather than aspirational.
- **Built:** a gear button in this game's own footer beside Undo, and a sheet in
  2048's palette with a root page (Language → , Back to home) and a language
  page listing each locale in its own name with the current one ticked.
  Navigation rather than a switch, so a third language costs nothing. It is its
  own layer, not the board overlay — M19 is the case that pins that.
- **Closed the gap decision 17 could not:** M18. Standalone — an installed game
  with no shell above it — had no way to change language and no way out. It has
  both now, verified at `/g/2048/` with `window.parent === window`: the language
  switched, persisted to `arcade:locale`, and "Về trang chủ" landed on the hub,
  which came up in Vietnamese.
- **Deviation from the frozen brief:** §9 said "No settings screen" and "No
  language picker inside the game". Both were true when it was frozen and are
  now overruled by a platform rule. Recorded in §4 and struck through in the
  brief with a dated note rather than silently rewritten.
- **Still open:** the same six device checks. Q1 unchanged.

### 2026-09-09 (b) — Settings sheet replaces the floating chrome; M3 and M11 close

- **Did:** Again nothing in `games/2048/src/` changed. The shell's chrome over a
  running game collapsed from three floating controls (back, language toggle,
  install) to one settings button holding all three — see decision 17 in
  `docs/sdk-decisions.md`. It wears this game's colours, declared as `chrome` in
  its `catalog.json` entry, so it reads as part of 2048 rather than as a browser
  panel.
- **Found, and fixed in the platform:** the corner. With the button top-right it
  landed exactly on this game's **New** button at 320px — a shell control
  stealing a tap the game believed was its own. The HUD cannot give up 52px at
  that width without reflowing, so the platform moved instead of the game:
  bottom-right is now reserved for every game, stated as `--platform-chrome` in
  `@platform/sdk/game.css`. 2048 needs no change for it, because its `.foot`
  centres the undo button — measured, the button overlaps `.foot` but no control
  inside it.
- **Closed two definition-of-done boxes with real measurements**, not with
  assumptions: M3 and M11. At 320x640 in both locales, with the *Hết nước đi*
  card open, nothing clips, the page never scrolls sideways, and every button is
  at least 44x44. M9 and M10 were re-run through the new path and still pass.
- **Still open:** seven boxes in §2 — six real checks (60fps, crash restore,
  install + offline, the rewarded-decline case, the run-lifecycle count,
  reduced motion) plus the one that only closes when the rest do. All need a
  device or a console session, which is Q1.

### 2026-09-09 — M9 and M10 unblocked by the shell's language picker

- **Did:** Nothing in `games/2048/src/` changed. The shell gained the language
  picker this game's testplan was waiting on (topbar, and again over a running
  game), so M9 and M10 could finally be run against the code as shipped.
- **Result:** both pass. Mid-run switch: `ĐIỂM 1.024 / CAO NHẤT 2.048` became
  `SCORE 1,024 / BEST 2,048`, with the board and both scores untouched. A
  property planted on the iframe's `contentWindow` before the switch survived
  it, which is the proof that the document was never reloaded — the `locale`
  event did the work, not a remount. With the *no moves left* card open, the
  card re-rendered in place and the undo badge went `AD` → `QC`, so the B1
  regression from the `ui.ts` rewrite is still fixed under a live relabel.
- **Also:** the platform now stores the language under `arcade:locale`, which
  `createStandaloneHost` reads. Opening `/g/2048/` directly, with no shell, came
  up in Vietnamese from a browser reporting `en-US` — the installed-icon path
  inherits the choice made in the hub.
- **Still open:** M11. The board and the two-button card at 320px in Vietnamese
  are unverified: the harness renders the iframe with no layout, so the canvas
  sized itself to 1x1 and nothing on the board could be measured. The shell
  around it measured clean at 320px in both languages, and the game-frame
  buttons are 44x44. This needs a real phone or a visible browser, and it joins
  Q1's list rather than being claimed.
- **Next:** Q1 in §5 is still the decision that gates the eight unticked boxes.

### 2026-09-08 — Shipped — handover, and multi-language retrofitted

- **Did:** Migrated this game into the documented process: `docs/game-2048.md`
  moved here as `brief.md` with `git mv`, no rule changed, and `plan.md`,
  `testplan.md` and this file reconstructed from the shipped code. Then
  implemented T9, multi-language: `src/i18n/{en,vi,index}.ts`, `watchLocale`
  wired through `session.ts`, and `ui.ts` rewritten to hold no text of its own
  and to relabel in place via `setStrings`.
- **Verified:** `pnpm typecheck` clean. `pnpm test` — 90 cases, including 8 new
  i18n cases here and 9 new `watchLocale` cases in the SDK. Live in the browser
  at both `/g/2048/` and `/play/2048`: `<html lang>` came back `en` from a host
  reporting `en-US`, which proves the whole chain ran — host → SDK event →
  `watchLocale` resolution → the handler in `main.ts` → `ui.setStrings` — and
  the chrome still renders `SCORE`, `BEST`, `New`, `Undo` with the badge intact
  after `setStrings` had run.
- **Next:** Nothing blocking. A device pass would close eight boxes in §2.
- **Blocked by:** M9 and M10 need the shell's language picker, which does not
  exist yet. Nothing else.

**Handover.** The game is complete against its brief. Two things the next
person should know. First, the free undo and the continue are deliberately
run-local (`plan.md` D1) — a reload grants a fresh one of each, and that is a
choice, not a bug. Second, `ui.ts` holds no text and must stay that way: it
takes a `Strings` object and relabels in place rather than rebuilding, because
the board canvas lives inside the chrome and a rebuild would drop the rendering
context mid-run (D4). The SDK gap worth watching is R1, the single-language PWA
manifest — platform-wide, recorded in `docs/sdk-decisions.md` §15.

## 4. Deviations from brief / plan

| # | What the doc says | What was built | Why | Doc updated? |
| --- | --- | --- | --- | --- |
| 1 | The original spec said "runs standalone against the mock SDK host" | There is no mock host; standalone runs the real `HostCore` in-process | `docs/sdk-decisions.md` §1 — one host, two transports, so the modes cannot drift | yes, `brief.md` §10 now says "runs standalone at `/g/2048/`" |
| 2 | The original spec had no i18n | Every string moved to `src/i18n/` | Multi-language became a v0.1 platform requirement after this game shipped | yes, `brief.md` §7 is new |
| 3 | `brief.md` §9: "No settings screen", "No language picker inside the game — the shell owns it" | A settings sheet in the footer, with a language page and "back to home" | CLAUDE.md rule 7 — every game ships one, and standalone it is the only way to change language or leave | yes, `brief.md` §9 struck through with a dated amendment |

## 5. Open questions for the owner

| # | Question | Assumed for now | Answer | Status |
| --- | --- | --- | --- | --- |
| Q1 | Seven boxes in §2 are unticked because the checks were never recorded, not because they failed. Worth a device pass on 2048 to close them, or leave the game as-is and hold the standard for new games only? | Leave it; the game is live and behaving | | **open** |

## 6. Platform gaps hit

| # | Gap | Worked around by | Reported? |
| --- | --- | --- | --- |
| 1 | The PWA manifest is single-language, so the home-screen name cannot be translated | Accepted — `name` is the numeral `2048`, which needs no translation. A game with a word for a name would feel this | yes — `docs/sdk-decisions.md` §15 |
| 2 | No language picker in the shell, so a language change cannot be exercised end to end | ~~Covered by SDK unit tests instead~~ | **closed 2026-09-09** — the shell ships one, in the topbar and over a running game. M9 and M10 pass |
