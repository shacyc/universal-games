# Snake — Test plan

| | |
| --- | --- |
| Brief | [`brief.md`](./brief.md) — Frozen 2026-09-09 |
| Plan | [`plan.md`](./plan.md) |
| Automated | `pnpm --filter @game/snake test` |
| Last full manual pass | — |

## 1. Unit cases — the pure core

Automated. `test/snake.test.ts` covers U1–U24 (39 concrete cases, some
`it.each`); `test/input.test.ts` covers U25–U26; `test/i18n.test.ts` is S11.
No DOM, injected `rng`, no real clock. `Test` is the exact `it(...)` name so a
failing run points straight back here.

| ID | Area | Setup / input | Expected | Test | Status |
| --- | --- | --- | --- | --- | --- |
| U1 | Scoring | `scoreFor(6)` (level 0) | `10` | `scoreFor: first food is worth 10` | pass |
| U2 | Scoring | `scoreFor(6 + 21*0.35)` (level 21) | `31` | `scoreFor: level 21 is worth 31` | pass |
| U3 | Scoring | `scoreFor(6 + 22*0.35)` (level 22) | `32` | `scoreFor: level 22 is worth 32` | pass |
| U4 | Scoring boundary | `scoreFor(14)` (speed capped, level would be 22+) | `32` — never more | `scoreFor: capped speed stays at 32` | pass |
| U5 | Speed | `speedAfter(6)`, `speedAfter(13.8)` | `6.35`, `14` (clamped, not 14.15) | `speedAfter: rises by 0.35 and caps at 14` | pass |
| U6 | Growth | head steps onto `food` | `body.length + 1`, new `food` spawned off the body, `score += scoreFor`, `justAte === true` | `step: eating grows the snake and spawns new food` | pass |
| U7 | justAte | any tick where the head does not land on food | `justAte === false` | `step: justAte is false on a non-eating tick` | pass |
| U8 | Move legality — tail chase | head moves into the cell the tail vacates this tick (snake did not just eat) | not `dead`; move succeeds | `step: moving into the vacating tail cell is legal` | pass |
| U9 | Self-collision | head moves into an occupied body cell that is not the vacating tail | `dead === true` | `step: running into the body ends the run` | pass |
| U10 | Wall death | from the edge, step off the top / bottom / left / right (parametrised) | `dead === true` for each; no wrap | `step: leaving the <edge> edge ends the run` (it.each, 4) | pass |
| U11 | Randomness | spawn food 500 times against a near-full board with a stubbed `rng` sweep | food index is never in `body`, always in `[0, CELLS)` | `step: new food never lands on the snake` | pass |
| U12 | Exhaustion | snake body fills every cell | `step` returns, run ends, no infinite loop (test has a hard iteration cap) | `step: a full board ends the run without hanging` | pass |
| U13 | Reversal rejected | `dir = 'right'`, `queueTurn(run, 'left')` | queue unchanged; after `step`, `dir` is still `'right'` | `queueTurn: a direct 180 is dropped` | pass |
| U14 | Reversal vs queued turn (D6) | `dir='right'`, `queueTurn('up')` then `queueTurn('down')` | `'down'` dropped — it reverses the pending `'up'`; queue is `['up']` | `queueTurn: a turn that reverses the last pending turn is dropped` | pass |
| U15 | Queue depth | three distinct legal turns queued before a tick | only the first two are kept | `queueTurn: the queue never exceeds two` | pass |
| U16 | Queue consumption | two legal turns queued, then two `step`s | one turn applied per tick, in order | `step: queued turns are consumed one per tick` | pass |
| U17 | Revive — shape | `reviveRun` on a length-20 dead run | `body.length === 5`, centred, `score` and `speed` unchanged, `revived === true`, not `dead` | `reviveRun: 5 centred segments, score and speed kept` | pass |
| U18 | Revive — short snake | `reviveRun` on a length-3 dead run | `body.length === 5` (grown up, never shorter) | `reviveRun: a short snake is grown to 5` | pass |
| U19 | Revive — food | old `food` sits where the new centred body will be | `food` is respawned to a cell clear of the new body | `reviveRun: food is respawned clear of the new snake` | pass |
| U20 | Dead run is frozen | `step` a dead run | returned run is equivalent — no movement, no score change, still `dead` | `step: a dead run does not advance` | pass |
| U21 | End detected once | step a live run into a wall, then step again | first step sets `dead`; second step does not re-run end logic (e.g. `track` hook called once — asserted via a spy in the harness, or by state equality) | `step: the end of a run is detected exactly once` | pass |
| U22 | Save round-trip | `run → toSave(run) → isSaveState → run'` | `run'` equals `run` minus the non-persisted fields (`pendingTurns` empty, `justAte`/`dead` false) | `save: a run survives a save/load round-trip` | pass |
| U23 | Save validation | `isSaveState` on `{}`, `{ v: 1 }`, `{ v: 2, best: 0, run: null }`, a run with duplicate body indices, a run with `food` inside `body` | `null` for every one — never a throw | `save: a malformed save returns null — <case>` (it.each, 12) + `save: a valid state parses` | pass |
| U24 | Fresh run | `newRun(rng)` | length 3, centred, `dir === 'right'`, not moving semantics captured by `pendingTurns === []`, `food` off the body, `speed === 6`, `score === 0`, `revived === false` | `newRun: a fresh run matches the brief` | pass |
| U25 | Swipe decode | `swipeDir(dx, dy)` — under threshold, each axis, a diagonal, a tie | `null` under 24px; larger axis wins; a tie goes horizontal; never a diagonal result | `swipeDir: *` (4 cases) | pass |
| U26 | Key decode | `keyDir(key)` — arrows, WASD either case, anything else | arrows + WASD map to the four dirs; everything else is `null` | `keyDir: *` (3 cases) | pass |

Coverage map against `docs/building-a-game.md` §10 / the template's "must
cover": scoring at a boundary — U2–U4; a non-move is not a move — U13/U20;
new content never on an occupied cell — U11/U19; exhaustion terminates —
U12; end-of-run detected once — U21; input queued not dropped, illegal
rejected — U13–U16; save round-trip lossless — U22; malformed save → `null` —
U23.

## 2. Manual cases — device and integration

Not automatable. Run the whole table before calling the game done, on a real
phone at least once. Record the date and device above.

| ID | Case | Steps | Expected | Status |
| --- | --- | --- | --- | --- |
| M1 | Standalone | open `http://localhost:5175/g/snake/` | plays fully; no shell needed | todo |
| M2 | Embedded | open `http://localhost:5173/play/snake` | identical behaviour to M1 | todo |
| M3 | Narrow portrait | 320px wide viewport, both locales | fully playable one-handed; nothing clipped; hit targets >= 44px | todo |
| M4 | Safe area | notched phone, portrait | no control or HUD under the notch or the home indicator | todo |
| M5 | Crash restore | kill the tab mid-run, reopen | exact board returns, **paused**, with the resume overlay | todo |
| M6 | Fresh boot | no save present | the start card, no error, no "continue?" prompt | todo |
| M7 | Rewarded accepted | die, take the revive ad to completion | snake resumes: 5 centred segments, score + speed kept, food respawned, 3-2-1 countdown; `gameOver` has **not** fired yet | todo |
| M8 | Rewarded declined | die, dismiss the revive ad | straight to the game-over card; no penalty, no toast; score intact; `gameOver` fires once | todo |
| M9 | Interstitial timing | game over → "New game" | interstitial fires there, after the score was shown; never on the game-over card itself, never mid-run | todo |
| M10 | Clock under an ad | open the revive ad mid-death and a rewarded flow | the tick clock does not advance under the overlay | todo |
| M11 | Hidden tab | switch apps mid-run, come back | paused on leave; explicit resume with a countdown; nothing advanced while away | todo |
| M12 | Idempotent resume | trigger a **suppressed** interstitial (two "New game"s inside 90s), then an ad from the game-over card | no countdown over a dead board; no loop restarted that was not running | todo |
| M13 | Run lifecycle | play a full run with the console open | exactly one `gameStart` and one `gameOver` per run, including a revived run | todo |
| M14 | Reduced motion | OS "reduce motion" on | interpolation snaps, apple stops pulsing, crash shake + flash gone — the dead-tint and dead face **remain**; the game still plays | todo |
| M15 | Mute | toggle mute in the shell | the game reflects it (icon state); the game renders no interactive mute control of its own | todo |
| M16 | Reactive face | eat an apple; then die | chomp/open-mouth face on the eating tick, snapping back ~150ms later; dizzy dead face on death | todo |
| M17 | Generated art offline | installed, airplane mode | field, apple, faces and the start-card illustration all render (precached); no blank rectangles | todo |
| M18 | Settings — language | open settings, switch `en` ⇄ `vi` | the whole game re-renders with no reload; the settings screen itself re-renders; each language is named in itself with `lang` set | todo |
| M19 | Settings — exit | open settings, tap "Back to the hub" (embedded and standalone) | embedded: shell takes over; standalone: browser navigates; a save happened before the call | todo |
| M20 | Settings reachable over game-over | die, open settings from the game-over card | settings opens; closing it leaves the game-over card exactly as it was | todo |
| M21 | Install | Android, "add to home screen" | own icon, own window, opens at `/g/snake/` full-screen | todo |
| M22 | Hub card | after the catalog entry lands | exactly one card, correct art, no "COMING SOON" duplicate | todo |

## 3. Static checks

| ID | Check | Command / how | Status |
| --- | --- | --- | --- |
| S0 | Gates and invariants | `pnpm game:check snake` | todo |
| S1 | Types | `pnpm --filter @game/snake typecheck` (both tsconfigs) | pass |
| S2 | Unit tests | `pnpm --filter @game/snake test` | pass |
| S3 | Build output | `pnpm build`, then `dist/g/snake/` exists with the art | todo |
| S4 | No forbidden platform access | `.githooks/pre-commit`; `pnpm game:status` reports it too | auto |
| S5 | Only `session.ts` imports the SDK client | `.githooks/pre-commit` | auto |
| S6 | SW scope | `src/sw.ts` returns early outside `/g/snake/`; registration is scoped | todo |
| S7 | Absolute paths | no relative `manifest.webmanifest` / icon / art links in `index.html` | todo |
| S8 | Blast radius | each commit touches only `games/snake/`, `catalog.json`, one `demoData.ts` line | todo |
| S9 | Dev port | `5175` is not used by another `catalog.json` entry | todo |
| S10 | No text in generated art | eyeball every `public/art/*.webp`; a word there is a string rule 11 can't reach | todo |
| S11 | i18n integrity | `test/i18n.test.ts` — fallback first, no empty string, `vi` not a copy of `en`, numbers via `Intl`, `LOCALE_NAMES` self-named | pass |

## 4. Bugs found

Every bug gets a row; a bug in the pure core gets a **new unit case** in §1
before it is fixed.

| # | Symptom | Cause | Fixed in | Test added |
| --- | --- | --- | --- | --- |
