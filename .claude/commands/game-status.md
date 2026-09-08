---
description: Report where every game actually stands, from its progress doc.
argument-hint: [slug]
---

Report the real state of game development. With `$1`, report only that game;
with no argument, report every game. Read-only: no builds, no tests, no deploy.

## Gather

- `catalog.json` — what is published.
- `games/*/docs/progress.md` — the header, task table, §2 checklist, the newest
  §3 entry, and §4/§5/§6.
- `apps/shell/src/demo/demoData.ts` — placeholders still shipping as
  "COMING SOON".
- `docs/game-*.md` — specs for games that predate `docs/game-process.md` and
  have no `games/<slug>/docs/` yet.
- `git log --oneline -15 -- games/<slug>/` — for each game with a folder.

## Verify rather than repeat

`progress.md` is a claim, not a fact. Spot-check it and report the difference:

- A task marked `done` with no evidence column filled.
- `Last updated` older than the newest commit under `games/<slug>/` — the log
  was not updated after work landed.
- A game with source files but no `docs/` directory — it is being built outside
  the process.
- A ticked box in §2 that the repo contradicts (`grep` for `localStorage` or
  `fetch(` under `games/<slug>/src/`; check `catalog.json` and the `demoData.ts`
  deletion for the registration box).

## Report

One table across all games, using the gate letters from
`docs/building-a-game.md` §0 Step 2:

| Game | Gate | Tasks | Last updated | Next action |

Then, per game, only what is worth acting on:

- Open questions waiting on the owner (§5) — these are the ones that block.
- Deviations from the brief (§4).
- Platform / SDK gaps collected across all games (§6) — group them, because a
  gap two games hit is the strongest signal for the next platform milestone.
- Any discrepancy found in the verification step above, stated plainly.

End with the single most useful next action, and say which game it belongs to.
