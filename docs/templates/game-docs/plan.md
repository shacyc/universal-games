# <Title> — Technical plan

> Template. Copy to `games/<slug>/docs/plan.md`. Written by the agent **after
> the brief is frozen and before the first line of game code**, then approved by
> the owner. It answers **how**; the brief answers what.
>
> If implementation forces a change here, edit this file and record it in §8 —
> do not let the code and the plan drift apart silently.

| | |
| --- | --- |
| Brief | [`brief.md`](./brief.md) — frozen on TODO |
| Status | **Draft** \| Approved \| Implemented |
| Approved on | — |

## 1. Module map

Every file in `games/<slug>/src/`, what it owns, and whether it is pure. The
pure modules are the ones `testplan.md` tests directly; anything touching the
DOM is verified by hand.

| File | Owns | Pure? |
| --- | --- | --- |
| `src/main.ts` | boot, loop, SW registration | no |
| `src/session.ts` | **every** `sdk.*` call | no |
| `src/<core>.ts` | game rules | **yes** |
| `src/render.ts` | canvas drawing | no |
| `src/styles.css` | look | — |

## 2. The pure core

The interface the tests hit. State in, state out, no DOM, no `Date.now()`, no
`Math.random()` — randomness is injected so a test can pin it.

```ts
// TODO(agent): types and signatures only, no bodies
export type GameState = { /* ... */ };
export function step(state: GameState, input: Input, rng: () => number): GameState;
```

## 3. Save state and versioning

The shape from the brief, plus how a save from an older build is handled.
`load()` returns `unknown`; validation happens once, at the boundary, in
`createSaveSlot`.

```ts
type SaveState = { v: 1; /* ... */ };
```

- `validate` rejects (returns `null`) when: TODO.
- What is deliberately **not** persisted, and why: TODO.
- When `save()` is called: TODO. (Call it freely — the host debounces. Never
  add a game-side debounce or a `pagehide` flush.)

## 4. Loop and timing

Real-time games only; a turn-based game writes "N/A — turn-based, no clock" and
moves on.

- Tick rate and how it changes during a run.
- How elapsed time is accumulated (explicitly — never derive tick progress from
  `performance.now()` alone, or paused time leaks into the run).
- Interpolation between ticks, and what `prefers-reduced-motion` drops.

## 5. Pause and resume

One `pause()` / `resume()` pair, fed from every source:

| Source | Handled by | Notes |
| --- | --- | --- |
| `sdk.onPause` / `sdk.onResume` | | host brackets every ad |
| `document.visibilitychange` → hidden | | the host cannot see a backgrounded tab |
| `pagehide` | | |

`resume()` must be idempotent: it fires after ads that were suppressed and after
the revive offer on a dead board. State exactly what it restarts and under what
condition it is a no-op.

## 6. SDK call inventory

Every platform call the game makes, in one table, so the monetisation and
lifecycle rules are reviewable at a glance. All of these live in `session.ts`.

| Call | Site | Trigger | Failure / `false` behaviour |
| --- | --- | --- | --- |
| `ready()` | `session.ts` | boot | |
| `load()` | | boot | invalid save → start fresh |
| `save(state)` | | | fire-and-forget |
| `gameStart()` | | | |
| `gameOver({ score })` | | exactly once per run | |
| `showRewarded('<p>')` | | | changes nothing |
| `showInterstitial('run_end')` | | | may be suppressed |
| `track(...)` | | | |

Anything the game needs that is **not** in this list is an SDK gap: record it in
§7, work around it, and report it. Never add a method to `packages/sdk`.

## 7. Risks and SDK gaps

| # | Risk / gap | Impact | Mitigation or workaround |
| --- | --- | --- | --- |
| R1 | | | |

## 8. Decisions

Every choice with a real alternative, so the next person does not re-litigate
it. Append; never delete a row.

| # | Decision | Alternative rejected | Why | Date |
| --- | --- | --- | --- | --- |
| D1 | | | | |

## 9. Task breakdown

The unit of progress. Each task is a few hours at most, has a **verifiable**
"done when", and its ID is what `progress.md` and commit messages reference.
Keep the IDs stable — renumbering breaks the log.

| ID | Task | Done when | Depends on |
| --- | --- | --- | --- |
| T1 | Scaffold from `games/2048/` | `pnpm --filter @game/<slug> dev` serves a blank board at `/g/<slug>/` | — |
| T2 | Pure core + unit tests | every case in `testplan.md` §1 is green | T1 |
| T3 | Render + input | playable, no persistence | T2 |
| T4 | `session.ts`: save/load | kill the tab mid-run, state comes back | T3 |
| T5 | Lifecycle: `gameStart`/`gameOver` | once per run, verified in the console | T4 |
| T6 | Ads: rewarded + interstitial | declining changes nothing | T5 |
| T7 | Pause/resume | clock does not advance under an ad or a hidden tab | T4 |
| T8 | PWA: manifest, icon, SW at `/g/<slug>/` | installs on Android, plays offline | T3 |
| T9 | Register: `catalog.json` + `demoData.ts` deletion | one card in the hub, not two | T8 |
| T10 | Manual pass on device | `testplan.md` §2 all green | all |
