# 2048 — Test plan

| | |
| --- | --- |
| Brief | [`brief.md`](./brief.md) |
| Automated | `pnpm --filter @game/2048 test` — 32 cases |
| Last full manual pass | **never recorded** — see `progress.md` §5 |

## 1. Unit cases — the pure core

Automated, in `test/board.test.ts` and `test/i18n.test.ts`. No DOM, injected
`rng`. `Test` is the exact `it(...)` name.

| ID | Area | Setup / input | Expected | Test | Status |
| --- | --- | --- | --- | --- | --- |
| U1 | Merge | `[2,2,2,2]` | `[4,4]` — a merged tile cannot merge again | `[2,2,2,2] -> [4,4] — a merged tile cannot merge again` | pass |
| U2 | Merge | `[4,4,2,2]` | `[8,4]` | `[4,4,2,2] -> [8,4]` | pass |
| U3 | Merge | `[2,2,4,null]` | `[4,4]` | `[2,2,4,null] -> [4,4]` | pass |
| U4 | Merge | `[2,null,2,4]` | `[4,4]` — a gap does not stop a merge | `[2,null,2,4] -> [4,4] — a gap does not stop a merge` | pass |
| U5 | Merge order | four equal tiles | resolves from the leading edge inward | `resolves from the leading edge inward, not the far end` | pass |
| U6 | Scoring | a merge | score gains the value of the tile created | `scores the value of each tile created by a merge` | pass |
| U7 | Animation data | any move | reports which cells fed each slot | `reports which cells fed each slot, so movement can be animated` | pass |
| U8 | Move legality | a tile already at the far edge | not a move: no spawn, no score, no undo | `a single tile at the far edge does not move towards that edge` | pass |
| U9 | Move legality | full board, no equal neighbours | not a move in any direction | `a full board with no equal neighbours is not a move in any direction` | pass |
| U10 | Randomness | `spawn` with pinned `rng` | 2 ninety percent of the time, 4 otherwise | `places a 2 ninety percent of the time and a 4 otherwise` | pass |
| U11 | Randomness | `spawn` on a partly full board | only ever lands in an empty cell | `only ever lands in an empty cell` | pass |
| U12 | Exhaustion | `spawn` on a full board | returns `null`, no loop | `returns null when the board is full` | pass |
| U13 | End of run | empty cell remains | not game over | `is false while an empty cell remains` | pass |
| U14 | End of run | full board, equal neighbour | not game over | `is false on a full board with an equal neighbour` | pass |
| U15 | End of run | full board, no equal neighbour | game over | `is true on a full board with no equal neighbours` | pass |
| U16 | Continue | `clearLowest(grid, 4)` | removes exactly the four lowest, rest untouched | `removes the four lowest tiles and leaves the rest untouched` | pass |
| U17 | i18n | `SUPPORTED` | the fallback is first | `ships the fallback first` | pass |
| U18 | i18n | every locale | no key is an empty string | `has no empty string` (per locale) | pass |
| U19 | i18n | `final_score`, `boot_error` | interpolate their values | `interpolates rather than concatenating` (per locale) | pass |
| U20 | i18n | `number(1024)` | `1,024` in `en`, `1.024` in `vi` | `formats numbers for the locale it was asked for` | pass |
| U21 | i18n | `stringsFor('de')` | falls back to `en` | `falls back to the authoring language for a locale it does not ship` | pass |
| U22 | i18n | `vi` vs `en` | key phrases actually differ | `actually translates — vi is not a copy of en` | pass |

The remaining eight automated cases cover grid setup, direction ordering, and
`highestTile`; they are not tied to a line of the brief and are listed by name
in the test file rather than duplicated here.

## 2. Manual cases — device and integration

| ID | Case | Steps | Expected | Status |
| --- | --- | --- | --- | --- |
| M1 | Standalone | open `http://localhost:5174/g/2048/` | plays fully; no shell needed | pass |
| M2 | Embedded | open `http://localhost:5173/play/2048` | identical behaviour to M1 | pass |
| M3 | Narrow portrait | 320px wide viewport | playable one-handed; nothing clipped; controls >= 44px | pass — 2026-09-09, measured in a 320x640 viewport in both locales: no element's `scrollWidth` exceeds its box, no horizontal page overflow, every button >= 44x44. The shell's settings button overlaps `.foot` but no control inside it |
| M4 | Safe area | notched phone, portrait | no control under the notch or home indicator | **not recorded** |
| M5 | Crash restore | kill the tab mid-run, reopen | exact board returns, no prompt | **not recorded** |
| M6 | Fresh boot | no save present | two tiles, no error | pass |
| M7 | Rewarded declined | dismiss the undo ad | nothing changes: no penalty, no toast | **not recorded** |
| M8 | Locale at boot | load the game | `<html lang>` is the resolved locale; every label is translated | pass — `lang="en"` from a host reporting `en-US`, so resolution ran |
| M9 | Locale switch mid-run | open settings, Language, pick the other one | every label re-renders, scores re-format, **no reload**, board untouched | pass — 2026-09-09. `ĐIỂM 1.024 / CAO NHẤT 2.048` → `SCORE 1,024 / BEST 2,048`. A property set on the iframe's `contentWindow` before the switch was still there after it, so the document was never replaced; the loaded board and both scores were unchanged |
| M10 | Locale switch with an overlay open | change language from settings while the game-over card is up | the card re-renders in the new language | pass — 2026-09-09, on the *no moves left* card: title, note and both buttons switched in place, the card stayed open, and the undo badge went `AD` → `QC` (the B1 regression, still fixed) |
| M11 | Vietnamese layout | run in `vi` at 320px | `CAO NHẤT` and the two-button card do not clip | pass — 2026-09-09, with the *Hết nước đi* card open at 320px: `CAO NHẤT 2.048` intact, both card buttons on their own lines, nothing clipped, no horizontal overflow |
| M12 | Interstitial timing | game over → "New game" | interstitial fires there, never on the game-over card itself | **not recorded** |
| M13 | Run lifecycle | play a full run with the console open | exactly one `gameStart` and one `gameOver` | **not recorded** |
| M14 | Reduced motion | OS "reduce motion" on | animations near-zero; still playable | **not recorded** |
| M15 | Install | Android, add to home screen | own icon, own window, opens at `/g/2048/` | **not recorded** |
| M16 | Offline | installed, airplane mode | boots and plays | **not recorded** |

M9 and M10 were blocked on the shell's language picker; it exists as of
2026-09-09 and both now pass, through the settings sheet that replaced the
floating toggle. M3 and M11 were measured the same day. Everything still marked
*not recorded* was very likely done during the original build; it was never
written down, which is exactly the gap this process exists to close.

## 3. Static checks

| ID | Check | Command / how | Status |
| --- | --- | --- | --- |
| S0 | Gates and invariants | `pnpm game:check 2048` | pass |
| S1 | Types | `pnpm --filter @game/2048 typecheck` | pass |
| S2 | Unit tests | `pnpm --filter @game/2048 test` | pass |
| S3 | Build output | `pnpm build`, then `dist/g/2048/` exists | pass |
| S4 | No forbidden platform access | enforced by `.githooks/pre-commit` | auto |
| S5 | Only `session.ts` imports the SDK client | enforced by `.githooks/pre-commit` | auto |
| S6 | SW scope | `src/sw.ts` returns early outside `/g/2048/` | pass |
| S7 | Absolute paths | `index.html` links are `/g/2048/...` | pass |
| S8 | Blast radius | each commit touches only `games/2048/`, `catalog.json`, one `demoData.ts` line | pass |
| S9 | Dev port | 5174, unique in `catalog.json` | pass |
| S10 | No hardcoded user-facing string | read `ui.ts` and `main.ts`: every word comes from `src/i18n/` | pass |

S10 is a read, not a command. Every heuristic tried for detecting a hardcoded
string produced false positives on class names and canvas fill styles, so it
stays a review item — see `docs/game-gates.json`.

## 4. Bugs found

| # | Symptom | Cause | Fixed in | Test added |
| --- | --- | --- | --- | --- |
| B1 | The undo button's label would delete the "AD" badge when relabelled | The label was a bare text node inside the button, beside the badge span; `textContent` replaces both | `ui.ts` — the label is its own span | Covered by M8; verified live |
