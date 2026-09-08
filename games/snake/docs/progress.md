# Neon Snake — Progress

| | |
| --- | --- |
| Status | **Not started** — blocked at Gate 0 |
| Tasks done | 0 / 0 (task breakdown is written at Gate 1) |
| Last updated | 2026-09-08 |

## 1. Tasks

Empty until `plan.md` §9 exists. Writing tasks against an unfrozen brief would
be inventing the game rather than planning it.

| ID | Task | Status | Evidence | Note |
| --- | --- | --- | --- | --- |
| — | — | — | — | Gate 1 not reached |

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
- [ ] No `localStorage`, no `fetch`, no direct IndexedDB anywhere in `src/`.
- [ ] No files changed outside `games/snake/`, `catalog.json` and the one
      `demoData.ts` deletion.
- [ ] `docs/testplan.md` §1 and §3 all `pass`; §2 run on a real phone, with the
      date and device recorded in its header.
- [ ] `docs/progress.md` is current.
- [ ] Deviations in §4, SDK gaps in §6.

## 3. Session log

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
- **Next:** Owner answers Q1–Q7 in `brief.md` §10, then the brief is frozen and
  Gate 1 starts. No code before that.
- **Blocked by:** Q1–Q7. Q1 (the `level` term in the score formula) is the hard
  blocker — it is in the pure core and every scoring test depends on it.

## 4. Deviations from brief / plan

| # | What the doc says | What was built | Why | Doc updated? |
| --- | --- | --- | --- | --- |
| — | nothing built yet | | | |

## 5. Open questions for the owner

Full text and proposed answers are in `brief.md` §10. Summarised:

| # | Question | Assumed for now | Answer | Status |
| --- | --- | --- | --- | --- |
| Q1 | `level` in `10 + floor(level)` is undefined | `floor((speed - 6) / 0.35)` | | **open** |
| Q2 | Revive when the snake died shorter than 5 | grow to 5 | | open |
| Q3 | Revive: old body cleared or moved | cleared | | open |
| Q4 | Revive: speed reset or kept | kept | | open |
| Q5 | Revive: food respawned | respawned | | open |
| Q6 | `revived` persisted, unlike 2048's run-local continue | keep persisted, but state it as a decision | | open |
| Q7 | `best` updated live or at game over | live | | open |

## 6. Platform gaps hit

| # | Gap | Worked around by | Reported? |
| --- | --- | --- | --- |
| — | none so far — the brief needs no SDK method that does not exist | | |
