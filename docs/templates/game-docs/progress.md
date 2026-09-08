# <Title> — Progress

> Template. Copy to `games/<slug>/docs/progress.md` **when the plan is
> approved**, with every task from `plan.md` §9 already listed as Todo.
>
> This is the file an agent **reads first** and **writes last**, every session.
> It is the only place that says what is actually true about the game right now.
> If it disagrees with the code, the code wins and this file was not updated —
> which is the failure this file exists to prevent.

| | |
| --- | --- |
| Status | **Not started** \| In progress \| In review \| Shipped \| Paused |
| Tasks done | 0 / 10 |
| Last updated | YYYY-MM-DD |

## 1. Tasks

IDs come from `plan.md` §9 and never change. Status is one of `todo`, `wip`,
`done`, `blocked`, `dropped`. Evidence is what proves it: a test name, a commit,
or the manual case ID from `testplan.md`. A task is not `done` without evidence.

| ID | Task | Status | Evidence | Note |
| --- | --- | --- | --- | --- |
| T1 | | todo | | |
| T2 | | todo | | |

## 2. Definition of done

Copied from `docs/building-a-game.md` §10. Do not tick a box you have not
actually observed — "should work" is not a tick.

- [ ] Core rules covered by unit tests on a pure, DOM-free module, including the
      edge cases named in the brief.
- [ ] `pnpm --filter @game/<slug> typecheck` and `test` both clean.
- [ ] `pnpm build` succeeds and `dist/g/<slug>/` contains the game.
- [ ] Playable one-handed, portrait, 320px, all hit targets >= 44px.
- [ ] 60fps on a mid-range phone; input during animation is queued, not dropped.
- [ ] Kill the tab mid-run, reopen: the run comes back exactly (paused, if
      real-time).
- [ ] Works embedded in the hub **and** standalone.
- [ ] Installs to the Android home screen with its own icon, opens full-screen
      at `/g/<slug>/`, and plays offline afterwards.
- [ ] Every rewarded call site: declining it changes nothing.
- [ ] If the game has a clock: it does not advance under an ad overlay or a
      backgrounded tab, and `resume` on a stopped game is a no-op.
- [ ] `gameStart` once per run, `gameOver` once per run, verified in the console.
- [ ] `prefers-reduced-motion` shortens animations to near-zero.
- [ ] Every locale in `SUPPORTED` renders with no missing key and no clipped
      control at 320px, and switching language in the shell re-renders the game
      without a reload.
- [ ] No `localStorage`, no `fetch`, no direct IndexedDB anywhere in `src/`.
- [ ] No files changed outside `games/<slug>/`, `catalog.json` and the one
      `demoData.ts` deletion.

## 3. Session log

**Append-only.** Newest entry at the top. Never edit or delete an old entry —
a wrong turn that got reverted is the most useful thing in this file. One entry
per working session, written *before* the session ends, even if the session
achieved nothing.

### YYYY-MM-DD — <one-line headline>

- **Did:** what changed, by task ID. `T3 done`, `T4 wip`.
- **Verified:** what was actually run or observed. Test names, both run modes,
  the viewport. Not "tested it".
- **Next:** the single next action, concrete enough to start cold.
- **Blocked by:** an open question ID, or "nothing".

## 4. Deviations from brief / plan

Anything built differently from what was written down, and why. An empty table
here at the end of a game is suspicious, not impressive.

| # | What the doc says | What was built | Why | Doc updated? |
| --- | --- | --- | --- | --- |

## 5. Open questions for the owner

Blocking questions live here until answered. Do not guess and carry on: state
the assumption you are proceeding under so the answer can correct it cheaply.

| # | Question | Assumed for now | Answer | Status |
| --- | --- | --- | --- | --- |

## 6. Platform gaps hit

Anything missing from the SDK, `game.css`, or the shell that this game had to
work around. This is the input to the next platform milestone — it is the whole
reason a game is not allowed to fix these itself.

| # | Gap | Worked around by | Reported? |
| --- | --- | --- | --- |
