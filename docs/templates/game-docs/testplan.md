# <Title> — Test plan

> Template. Copy to `games/<slug>/docs/testplan.md`. Written **alongside the
> plan, before the code** — a test case written after the implementation tends
> to describe what the code does rather than what the brief asked for.
>
> Every line of `brief.md` §9 must appear here as at least one case ID.

| | |
| --- | --- |
| Brief | [`brief.md`](./brief.md) |
| Automated | `pnpm --filter @game/<slug> test` |
| Last full manual pass | YYYY-MM-DD on <device> |

## 1. Unit cases — the pure core

Automated, in `test/<core>.test.ts`. No DOM, injected `rng`, injected clock.
`Test` is the exact `it(...)` name, so a failing run points straight back here.

| ID | Area | Setup / input | Expected | Test | Status |
| --- | --- | --- | --- | --- | --- |
| U1 | | | | | todo |
| U2 | | | | | todo |

Cover, at minimum — delete a row only if the brief genuinely makes it
meaningless for this game, and say so:

| ID | Area | Must cover |
| --- | --- | --- |
| U-a | Scoring | the formula at a boundary, not just a happy value |
| U-b | Move legality | a move that changes nothing is not a move: no spawn, no score, no undo entry |
| U-c | Randomness | new content never lands on an occupied cell |
| U-d | Exhaustion | a full board / no legal move terminates, no infinite loop |
| U-e | End of run | the exact condition that ends a run, and that it is detected once |
| U-f | Input queue | fast input is queued, not dropped; illegal input is rejected |
| U-g | Save round-trip | `state → save shape → state` is lossless |
| U-h | Save validation | a truncated, an empty, and a wrong-`v` save all return `null`, not a crash |

## 2. Manual cases — device and integration

Not automatable. Run the whole table before calling the game done, on a real
phone at least once. Record the date and device above.

| ID | Case | Steps | Expected | Status |
| --- | --- | --- | --- | --- |
| M1 | Standalone | open `http://localhost:<devPort>/g/<slug>/` | plays fully; no shell needed | todo |
| M2 | Embedded | open `http://localhost:5173/play/<slug>` | identical behaviour to M1 | todo |
| M3 | Narrow portrait | 320px wide viewport | fully playable one-handed; nothing clipped; controls >= 44px | todo |
| M4 | Safe area | notched phone, portrait | no control under the notch or the home indicator | todo |
| M5 | Crash restore | kill the tab mid-run, reopen | exact state returns; real-time games return **paused** | todo |
| M6 | Fresh boot | no save present | idle state, no error, no "continue?" prompt | todo |
| M7 | Rewarded accepted | take the ad to completion | the reward is granted exactly once | todo |
| M8 | Rewarded declined | dismiss the ad | **nothing changes**: no penalty, no toast, no lost turn | todo |
| M9 | Interstitial timing | game over → "New game" | interstitial fires there, never on the game-over screen itself, never mid-run | todo |
| M10 | Clock under an ad | open a rewarded ad mid-run | the clock does not advance; N/A for turn-based | todo |
| M11 | Hidden tab | switch apps mid-run, come back | paused, then an explicit resume; nothing advanced | todo |
| M12 | Idempotent resume | trigger a **suppressed** interstitial, and an ad from the game-over screen | no countdown over a dead board; no loop restarted that was not running | todo |
| M13 | Run lifecycle | play a full run with the console open | exactly one `gameStart` and one `gameOver` per run | todo |
| M14 | Reduced motion | OS "reduce motion" on | animations near-zero; the game still plays | todo |
| M15 | Mute | toggle mute in the shell | the game reflects it; the game renders no global mute toggle of its own | todo |
| M16 | Install | Android, "add to home screen" | own icon, own window, opens at `/g/<slug>/` full-screen | todo |
| M17 | Offline | installed, airplane mode | boots and plays | todo |
| M18 | Hub card | after the catalog entry lands | exactly one card, correct art, no "COMING SOON" duplicate | todo |

## 3. Static checks

Cheap, and they catch the mistakes in `docs/building-a-game.md` §12.

| ID | Check | Command / how | Status |
| --- | --- | --- | --- |
| S1 | Types | `pnpm --filter @game/<slug> typecheck` | todo |
| S2 | Unit tests | `pnpm --filter @game/<slug> test` | todo |
| S3 | Build output | `pnpm build`, then `dist/g/<slug>/` exists | todo |
| S4 | No forbidden platform access | script below: no hits | todo |
| S5 | Only `session.ts` imports the SDK client | script below: exactly one file | todo |
| S6 | SW scope | `src/sw.ts` returns early outside `/g/<slug>/`; registration is scoped | todo |
| S7 | Absolute paths | no relative `manifest.webmanifest` or icon links in `index.html` | todo |
| S8 | Blast radius | `git diff --stat main` touches only `games/<slug>/`, `catalog.json`, one `demoData.ts` line | todo |
| S9 | Dev port | the port is not used by another entry in `catalog.json` | todo |

```bash
grep -rnE "localStorage|sessionStorage|indexedDB|fetch\(" games/<slug>/src/ ; grep -rln "@platform/sdk/client" games/<slug>/src/
```

## 4. Bugs found

Every bug gets a row, and a bug in the pure core gets a **new unit case** in §1
before it is fixed. That is how the table above grows over the life of the game.

| # | Symptom | Cause | Fixed in | Test added |
| --- | --- | --- | --- | --- |
