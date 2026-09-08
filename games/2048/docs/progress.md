# 2048 — Progress

| | |
| --- | --- |
| Status | **Shipped** — with an unrecorded device pass, see §5 |
| Tasks done | 9 / 9 |
| Last updated | 2026-09-08 |

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
| T9 | i18n | done | `src/i18n/`, `test/i18n.test.ts` (8 cases), M8 | M9–M11 blocked or unrecorded |

## 2. Definition of done

Ticked only where something actually evidences it. The unticked boxes are not
work that is missing — they are work that was never written down, which for a
shipped game is the honest state and the reason this file now exists.

- [x] Core rules covered by unit tests on a pure, DOM-free module, including the
      edge cases named in the brief.
- [x] `pnpm --filter @game/2048 typecheck` and `test` both clean.
- [x] `pnpm build` succeeds and `dist/g/2048/` contains the game.
- [ ] Playable one-handed, portrait, 320px, all hit targets >= 44px. — M3
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
- [ ] Every locale in `SUPPORTED` renders with no missing key and no clipped
      control at 320px, and switching language re-renders without a reload.
      — M9, M10, M11

## 3. Session log

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

## 5. Open questions for the owner

| # | Question | Assumed for now | Answer | Status |
| --- | --- | --- | --- | --- |
| Q1 | Eight boxes in §2 are unticked because the checks were never recorded, not because they failed. Worth a device pass on 2048 to close them, or leave the game as-is and hold the standard for new games only? | Leave it; the game is live and behaving | | **open** |

## 6. Platform gaps hit

| # | Gap | Worked around by | Reported? |
| --- | --- | --- | --- |
| 1 | The PWA manifest is single-language, so the home-screen name cannot be translated | Accepted — `name` is the numeral `2048`, which needs no translation. A game with a word for a name would feel this | yes — `docs/sdk-decisions.md` §15 |
| 2 | No language picker in the shell, so a language change cannot be exercised end to end | Covered by SDK unit tests instead | yes — M9/M10 in `testplan.md` |
