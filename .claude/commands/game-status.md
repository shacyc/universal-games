---
description: Report where every game actually stands, from its progress doc.
argument-hint: [slug]
---

Report the real state of game development. With `$1`, report only that game;
with no argument, report every game. Read-only: no builds, no tests, no deploy.

## Start with the script

```bash
pnpm game:status
```

It already computes each game's gate from `docs/game-gates.json`, flags broken
platform rules, and reports where `progress.md` disagrees with the repo. Your
job is to read what it prints and turn it into advice — not to redo it by hand.

## Then add what the script cannot see

- `catalog.json` — what is published.
- `games/*/docs/progress.md` — the header, task table, §2 checklist, the newest
  §3 entry, and §4/§5/§6.
- `apps/shell/src/demo/demoData.ts` — placeholders still shipping as
  "COMING SOON".
- `docs/game-*.md` — specs for games that predate `docs/game-process.md` and
  have no `games/<slug>/docs/` yet.
- `git log --oneline -15 -- games/<slug>/` — for each game with a folder.

## Verify rather than repeat

The script checks artifacts; it cannot read prose. These are yours:

- A task marked `done` with no evidence column filled.
- A session-log entry that says "verified" without naming what was run.
- An open question in §5 that has quietly been answered in the code instead.
- A deviation visible in the diff but missing from §4.

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
