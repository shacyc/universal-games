# <Title> — Brief

> Template. Copy to `games/<slug>/docs/brief.md` and fill it in **with the owner
> before any code is written**. Delete every `TODO` line as you answer it; a
> `TODO` left in a frozen brief is a bug in the process, not a note.
>
> This file answers **what and why**. It never contains file names, function
> signatures or task lists — those live in `plan.md`.

| | |
| --- | --- |
| Slug | `<slug>` |
| Route | `/g/<slug>/` |
| Dev port | `51xx` (next free, see `docs/building-a-game.md` §7) |
| Genre | Puzzle \| Arcade \| Cards \| Word \| Casual |
| Milestone | v0.x |
| Status | **Draft** \| Frozen \| Superseded |
| Owner | <who signs this off> |
| Frozen on | — |

## 1. Why this game

Two or three sentences. Not "it is fun" — what does it cost, and **what does it
prove about the platform that no shipped game proves yet**? (2048 proved the
pipeline; Snake proved `onPause`. What is this one for?)

TODO(owner): why this game, why now.

## 2. Rules

The complete rules of play, precise enough that two people cannot read them
differently. Board size, starting state, what a move is, scoring formula,
what ends a run, what a win is (or that there is none).

Anything with a formula gets the formula, not a description of it.

TODO(owner)

## 3. Input

- Touch: gesture, threshold in px, which axis wins, what the play surface does
  with `touch-action`.
- Keyboard: which keys.
- What is explicitly **rejected** (a 180° reversal, a move that changes nothing)
  and what is **queued** rather than dropped.
- No hover-only affordances. Every control >= 44px.

TODO(owner)

## 4. Rendering

Canvas or DOM. What animates, for how long, and what `prefers-reduced-motion`
turns off. Board sizing rule. 60fps target on a mid-range Android phone.

TODO(owner)

## 5. Persistence

What survives a killed tab, and what deliberately does not — with the reason,
because "not saved" is a design decision that gets questioned later.

```ts
type SaveState = {
  v: 1;
  // TODO(owner): the shape, JSON-serialisable, under ~1KB
};
```

Boot behaviour: restore silently (turn-based) or restore **paused** with an
explicit resume tap (real-time). Say which and why.

## 6. Monetisation hooks

Every one of these is optional value. Declining a rewarded ad must change
nothing — no penalty, no toast, no lost state.

| Hook | Placement string | Moment | On `false` / suppressed |
| --- | --- | --- | --- |
| Rewarded | `<placement>` | | |
| Interstitial | `run_end` | player taps "New game", after the score is shown | nothing |

`gameStart()` fires on: TODO. `gameOver({ score })` fires exactly once, after:
TODO.

Analytics via `sdk.track`: TODO — event names and their props.

## 7. Copy and locales

Every word the player reads is a translated key — none of it is written into a
`.ts` file. List what this game ships:

| | |
| --- | --- |
| Locales | `en`, `vi` (`en` is the fallback and the authoring language) |
| Longest-string risk | which control is tightest at 320px |

Sentences that interpolate a value are **one entry each**, as a function — never
built by concatenation. Name them here if the game has any beyond a score.

## 8. Screens

One line per screen or overlay, and what is on it. Include the idle state, the
paused state (if any), and game over.

TODO(owner)

## 9. Explicitly out of scope

List what this game will **not** have, so it does not creep in during
implementation: tutorial, settings screen, difficulty picker, sound, a second
mode, etc.

TODO(owner)

## 10. Acceptance criteria

The behaviours that decide whether the game is finished. Each one must be
testable — `testplan.md` turns every line here into at least one test case ID,
so write them as observable outcomes, not intentions.

Name the **edge cases** explicitly. This is the section agents get wrong when it
is vague.

- TODO(owner)

## 11. Open questions

Anything unresolved when the brief was drafted. A question here blocks freezing
the brief; move it to a decision in `plan.md` once it is answered.

| # | Question | Answer | Answered on |
| --- | --- | --- | --- |
| Q1 | | | |
