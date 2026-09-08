---
description: Draft the four required docs for a new game with the owner. No code.
argument-hint: <slug>
---

Start a documentation session for game `$1`.

Read `docs/building-a-game.md` and follow **§0 Start here**, beginning at Step 1.

That section is the single source of truth for this procedure — this command is
only a shortcut to it, and it works identically when typed by hand as:

> Read `docs/building-a-game.md` and build game `$1`.

Two constraints specific to this command:

- Stop at Gate 0 or Gate 1. Produce documents only. Do not create
  `games/$1/src/`, do not touch `catalog.json`, do not write game code — even if
  the owner freezes the brief in this session.
- If Step 2 puts you in case D or E (the plan is already approved, or the game
  is shipped), say so and stop rather than re-running the interview.
