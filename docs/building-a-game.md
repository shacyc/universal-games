# Building a game for this platform

Read this before writing a single line. It is the contract between one game and
everything else in the repo. If you follow it, your game drops in with no shell
changes, no SDK changes, and no merge conflicts with the other games being
written in parallel.

This file is the **entry point**. It assumes no tooling, no slash commands and
no memory of a previous session: everything an agent needs to start, continue or
finish a game is either here or linked from §0. Start every session by reading
it, whichever assistant you are.

---

## 0. Start here — the session bootstrap

You have been handed one instruction, roughly:

> **Read `docs/building-a-game.md` and build game `<slug>`.**

That instruction alone is enough. This section is the entire procedure. Do not
skip to §1 and start coding — where you begin depends on what already exists,
and Step 3 is what tells you.

### Step 1 — ask the repo where things stand

```bash
pnpm game:status
```

It reads `docs/game-gates.json` and computes each game's gate from the
artifacts on disk. Start here rather than with the documents: `progress.md` is
a *claim*, and the two disagreeing is itself a finding — it means a session
ended without updating the log.

If you cannot run commands, read `games/<slug>/docs/progress.md` and work Step 3
out by hand. The gates are the same either way; the script is a convenience,
never the authority.

### Step 2 — read, in this order

| # | File | What you get from it | Skip if |
| --- | --- | --- | --- |
| 1 | this file, all of it | the rules that fail a review | never |
| 2 | `CLAUDE.md` | the current milestone, and what is out of scope | never |
| 3 | `docs/platform-sdk.md` | the complete SDK surface — nothing outside it exists | never |
| 4 | `docs/sdk-decisions.md` | why the SDK is shaped the way it is | you have read it this session |
| 5 | `games/<slug>/docs/` — `progress.md`, then `brief.md`, `plan.md`, `testplan.md` | where this game actually is | the directory does not exist — that is Case A below |
| 6 | `games/2048/src/` | the reference implementation: copy its shape, not its rules. `session.ts` for the SDK boundary, `i18n/` for strings, `ui.ts` for chrome that holds no text of its own | you have read it this session |
| 7 | `docs/game-process.md` | the reasoning behind the four documents and the gates | you accept §0 as given |

State out loud which files you read and which case in Step 3 you landed in,
before you do anything else. It takes one line and it is how the owner catches a
session that started from the wrong place.

### Step 3 — find out where the game is

`pnpm game:status <slug>` names the gate directly. To reach the same answer by
hand, look at `games/<slug>/docs/`; exactly one of these is true:

| | You see | You are at | Go to |
| --- | --- | --- | --- |
| **A** | no `games/<slug>/docs/` directory | Gate 0 | Step 4A — draft the documents. **No code.** |
| **B** | `brief.md` with `Status: Draft`, or any `TODO` or unanswered §11 question left in it | Gate 0 | Step 4A, resuming the interview from what is missing |
| **C** | `brief.md` `Frozen`, `plan.md` `Draft` | Gate 1 | Step 4B — write the plan and the test plan. **No code.** |
| **D** | `plan.md` `Approved` | Gate 2 | Step 4C — implement |
| **E** | `progress.md` says `Shipped` | done | ask the owner what they actually want; do not reopen a shipped game on your own |

If the game has source files under `games/<slug>/src/` but no `docs/`, say so
plainly — it was built outside the process. Reconstruct `brief.md` from the code
and have the owner correct it before you change anything.

Older games are a special case. `2048` and `snake` have been migrated; only
`sudoku` still has its brief at `docs/game-sudoku.md`, from before this process
existed.
Treat that file as the brief, and your first commit moves it — `git mv`, so the
history follows — to `games/<slug>/docs/brief.md`, restructured into the
template shape but with **no rule changed**, plus the other three templates.
Restructuring is not rewriting: anything the old spec left undefined becomes an
open question in its §11, never a decision you made quietly.

That move can break a path in a file you are not allowed to edit. Run
`grep -rn "docs/game-<slug>.md" --include='*.md' --include='*.ts' .` afterwards
and **report** the hits — do not fix them in `CLAUDE.md` or another game's
files. The owner owns those.

### Step 4A — Gate 0: draft the documents with the owner

Copy the four templates from `docs/templates/game-docs/` into
`games/<slug>/docs/`, then fill `brief.md` **by interviewing the owner**. How to
run that interview, because it is the part that decides whether the game goes
well:

- **Propose, do not interrogate.** For every section, draft an answer from the
  genre, the existing specs and what the SDK supports, then ask the owner to
  correct it. A concrete wrong proposal gets a far better answer than an open
  question.
- **Batch the questions.** Not one message per section.
- **Push hardest on the four sections agents habitually leave vague**, because a
  vague answer here becomes a bug three days later:
  - brief §2 Rules — every scoring rule written as a formula, not a description.
  - brief §5 Persistence — what is deliberately *not* saved, and why.
  - brief §6 Monetisation — the exact moment of each ad, and explicit confirmation
    that declining a rewarded ad changes nothing.
  - brief §10 Acceptance criteria — the edge cases, named. If the owner cannot name
    them, propose the ones the genre always has.
- **Force brief §9 Out of scope to have at least three entries.** That section is what
  stops scope creep during implementation.
- If the owner asks for something the SDK cannot do, say so immediately, quote
  the surface from `docs/platform-sdk.md`, and offer the nearest thing that
  exists. Never design around a method that does not exist, and never propose
  adding one.
- If the game does not fit the milestone in `CLAUDE.md`, say so before the
  interview, not after.

Only the owner freezes the brief. You may not delete a `TODO(owner)` on their
behalf; you may replace it with a proposal clearly marked as one.

When the brief is frozen, continue into Step 4B in the same session if the owner
wants — but stop before any code either way.

### Step 4B — Gate 1: plan and test plan

Fill `plan.md` yourself: module map, the pure-core interface, the save shape and
its validation, the loop and pause model, the **SDK call inventory** (§6 — one
table listing every platform call the game will make), risks, and a task
breakdown of tasks small enough to finish in a few hours each.

Fill `testplan.md` at the same time: one case ID for every acceptance criterion
in the brief, plus the standard rows the template already carries. Everything
`todo`. Writing the cases before the code is the point — a test written
afterwards describes what the code does, not what was asked for.

Then create `progress.md` with every task listed as `todo`, and ask the owner to
approve the plan. Two things they are really checking: that the SDK inventory
contains no method that does not exist, and that no task is big enough to hide a
week inside it.

### Step 4C — Gate 2: implementing

Work one task at a time, in the order of `plan.md` §9. At the start of the
session, say which task ID you are picking up and confirm nothing in
`progress.md` §5 blocks it. Then §1–§9 of this file are the rules you build
under, and §10 is what "finished" means.

Two mechanical checks run whether you remember them or not. `pnpm game:check
<slug>` gives a verdict on the gate you are trying to leave, and a `pre-commit`
hook refuses a commit that puts `localStorage`, `fetch` or an SDK-client import
somewhere §3 forbids. Neither replaces reading §3 — they catch the cases that
are cheap to catch, and that is all.

### Step 5 — before you stop. Not optional.

Every session ends by updating `games/<slug>/docs/progress.md`, **while you
still have the context**, not "next time":

1. Task table: status and evidence. A task is `done` only with a test name, a
   commit or a manual case ID next to it. "Works" is not evidence.
2. Append one dated entry to §3 — Did / Verified / Next / Blocked by. Newest at
   the top, **append-only**: never edit or delete an old entry.
3. Record any deviation from the brief or plan in §4, any new question for the
   owner in §5, any SDK gap you had to work around in §6.
4. Tick anything in §2 you actually observed this session.
5. Update the header: task count, `Last updated`.
6. Run `pnpm game:status <slug>` once more. If it still disagrees with what you
   just wrote, the doc is wrong — fix it now, not next session.

A session that produced no code still gets an entry. "Spent the session finding
out the pause bug is in the host, not the game" is exactly what the next session
needs to know.

A diff that touches `games/<slug>/src/` and not `games/<slug>/docs/progress.md`
is incomplete, and is the single most common way this process fails.

---

## 1. What you own, and what you must not touch

You own exactly one directory: `games/<slug>/`.

You additionally make **two small edits** outside it, described in §7:
one entry in `catalog.json`, and the removal of your slug's placeholder from
`apps/shell/src/demo/demoData.ts`.

**Do not edit, for any reason:**

| Path | Why |
| --- | --- |
| `packages/sdk/**` | The wire protocol is cached by every game's service worker. One game changing it breaks the others. |
| `apps/shell/**` (except the one `demoData.ts` deletion) | Adding a game must never require shell code. If it does, the design is wrong. |
| `games/<other-slug>/**` | Another agent is in there right now. |
| `workers/**`, `scripts/**`, `tsconfig.base.json`, `pnpm-workspace.yaml` | Platform-wide. |
| `.env`, `.dev.vars`, anything under `.wrangler/` | Deploy credentials. Do not read them, print them, or run a deploy. Shipping the site is not part of writing a game. |

If you believe you need something the SDK does not offer — a new method, a new
host event, a change to `game.css` — **stop and report it**. Do not work around
it locally, and do not add the method yourself. A missing SDK method is a
platform decision, not a game decision. Record it in §6 of your
`docs/progress.md`, note it in your handover, and ship the game without it.

Never add a dependency to the root `package.json`. Your game's dependencies live
in `games/<slug>/package.json` and should be close to zero — see §8.

---

## 2. The architecture in ninety seconds

```
/                    the hub (apps/shell)  — React, owns install, ads, storage
/g/<slug>/           your game             — its own build, its own SW, its own manifest
```

Two ways your game runs, and it must work identically in both:

1. **Embedded** — the shell mounts `/g/<slug>/` in a same-origin iframe and
   hands your game a private `MessagePort`. The shell is the host.
2. **Top-level** — the player installed your game to their home screen, or
   opened `/g/<slug>/` directly, or you are running `pnpm dev` in your game
   folder. There is no shell above you, so the SDK loads the *same* host
   in-process via dynamic `import()`.

You do not choose. `createClient({ slug })` detects it. Both paths run the same
`HostCore` with the same adapters, so behaviour cannot drift. This is why there
is no "mock SDK" to remember — standalone dev is the real host.

Consequences you must respect:

- Your game never imports shell code and the shell never imports yours.
- Your game never imports another game's code.
- Your only import from the platform is `@platform/sdk/client`,
  `@platform/sdk/game` and `@platform/sdk/game.css`.

---

## 3. Hard rules

These are non-negotiable. A review that finds any of them fails the game.

1. **Everything platform-shaped goes through the SDK.** No `fetch`, no
   `localStorage`/`sessionStorage`/`IndexedDB`, no ad network, no analytics
   endpoint, no cookies. Storage that is not `sdk.save()` is not durable: iOS
   Safari evicts script-writable storage after ~7 days for uninstalled sites.
   (The single exception the platform allows itself is a per-device *display*
   preference in the shell; a game has none.)
2. **The host owns debouncing.** Call `sdk.save()` as often as you like — every
   move is fine. Never write your own debounce, throttle, or `pagehide` flush.
3. **The host owns mute.** Read it via `watchMute(sdk, ...)`. Never store your
   own mute flag, never render your own global mute toggle.
4. **The host owns ad frequency.** Call `showInterstitial` at every legal
   moment; the host suppresses what it must. Never add your own cooldown.
5. **`showRewarded` never punishes.** It resolves `false` on decline, failure,
   or no fill, and never rejects. `false` must change nothing: no penalty, no
   error toast, no lost state. Your game must be completable without ever
   watching one.
6. **`gameOver` fires exactly once per run**, after any continue/revive has been
   spent or declined. The host issues a run id on `gameStart` and ignores
   duplicates, but do not rely on that to hide a bug.
7. **Portrait-first, thumb-first.** Fully playable one-handed in portrait at
   320px wide on a mid-range Android phone. Interactive controls >= 44px. No
   hover-only affordances. Honour `env(safe-area-inset-*)` and
   `prefers-reduced-motion`. The whole screen is yours: the shell draws nothing
   over a running game.
8. **Your service worker is scoped to `/g/<slug>/` and caches only your build.**
   Never register at root scope. Never cache another game's URLs.
9. **The slug is assigned by the shell, not by you.** You pass yours to
   `createClient` for the standalone case; when embedded, the host's mapping
   wins. Never read a slug out of a message or the URL to pick a save.
10. **`load()` returns `unknown`.** Validate at the boundary through
    `createSaveSlot`. A save written by an older build of your game is a case to
    handle, not a crash.
11. **No user-facing string is written in a `.ts` or `.html` file.** Every word
    the player reads comes from `src/i18n/`, keyed. The platform owns the
    language and the game owns its words — read it with `watchLocale`, never
    `navigator.language`. A hardcoded `'Game over'` is the one that survives to
    launch, because it looks finished.
12. **Every game ships a settings screen, and it holds at least the language
    and the way back to the hub.** Both are required, in every game, however
    small. You build it yourself, in your own style — the shell draws nothing
    over a running game — and you act on it with `sdk.setLocale(tag)` and
    `sdk.exitToHub()`. Neither is a decision you make: the platform owns which
    language exists and where the hub is; your screen asks. See §5, *Settings*.
13. **Image files are generated with the `agy-image` skill, never sourced from
    the web.** A texture, a background, a sprite sheet, an illustration on the
    title card: generate it and commit it under `games/<slug>/public/`. Never
    download art, hotlink a CDN, or ship a `TODO: art` placeholder — an
    installed game plays offline, so anything the build does not contain is a
    blank rectangle on a phone in a tunnel, and the licence on a downloaded
    asset is nobody's job to untangle a year later. Two things stay
    hand-authored, because a generator is the wrong tool for them:
    `public/icon.svg` and the catalog `cover`, which are flat vector shapes that
    have to read at 42px. And **no generated image may contain words** — a word
    baked into a PNG is a user-facing string rule 11 cannot reach and no
    translator can change. See §8, *Art*.

---

## 4. The SDK surface

The complete set of methods a host answers. Nothing else exists; do not call
anything else.

```ts
import { createClient } from '@platform/sdk/client';
import { createSaveSlot, watchMute, watchLocale } from '@platform/sdk/game';

const sdk = createClient({ slug: '<slug>' });

await sdk.ready();                  // → GameContext { slug, locale, isInstalled, isMuted }

await sdk.getUser();                // → { id, isAnonymous, locale } — read the language with watchLocale, not this
await sdk.load();                   // → unknown (validate it!)
await sdk.save(state);              // JSON-serialisable, keep it under ~1KB

await sdk.showRewarded('placement');      // → boolean, never rejects
await sdk.showInterstitial('placement');  // → void, never rejects, may be suppressed

sdk.gameStart();                    // opens a run
sdk.gameOver({ score });            // closes it, once
sdk.track('event', { ... });        // strings, numbers, booleans only

sdk.setLocale('vi');                // from your settings screen; answer arrives via onLocaleChange
sdk.exitToHub();                    // from your settings screen; this document is leaving

sdk.onMuteChange(fn); sdk.onLocaleChange(fn);              // each returns an unsubscribe
sdk.onPause(fn); sdk.onResume(fn);
```

Reserved for later milestones and **not implemented** — do not call, do not
stub, do not design around: `currency.*`, `inventory.*`, `submitScore`,
`getLeaderboard`, `hasPass`, `notify`. No leaderboards, no accounts, no shop.

### `onPause` / `onResume`

The host tells your game when *it* has covered it. Today that means the ad
overlay: `showRewarded` and `showInterstitial` are both bracketed with a `pause`
before and a `resume` after, so a real-time game does not keep ticking under an
ad the player chose to watch. You do not wrap ad calls yourself.

**Any game with a clock or a game loop must handle both**, and two rules come
with them:

1. **`resume` must be idempotent.** It fires even when nothing was shown — the
   frequency cap suppressed the interstitial, or (at v1) the network had no
   fill. Restart only a loop that `pause` actually stopped. A `resume` handler
   that unconditionally starts a countdown will flash one on your game-over
   screen.
2. **The host cannot see everything.** A backgrounded tab, a locked phone and
   the browser's own UI never reach it. Handle `document.visibilitychange` to
   hidden yourself, and route it into the *same* `pause()` function.

A turn-based game with no clock may ignore all of this. See decision 12 in
`docs/sdk-decisions.md` for why it works this way.

### Ad placements

`placement` is a short lowercase string naming the *moment*, not the reward:
`'undo'`, `'revive'`, `'hint'`, `'run_end'`. Keep it stable — it becomes an
analytics key.

Legal interstitial moments: **between sessions only**, after the score has been
shown, on the player's own action ("New game", "Next puzzle"). Never on the
game-over screen itself, never mid-run, never mid-input.

---

## 5. Files your game must contain

```
games/<slug>/
  docs/brief.md                 what and why — owner-owned, frozen before code
  docs/plan.md                  how — module map, SDK inventory, task breakdown
  docs/testplan.md              the cases, unit + manual + static
  docs/progress.md              where the work is — read first, updated last
  package.json                  name: @game/<slug>
  vite.config.ts                base: /g/<slug>/, VitePWA injectManifest
  tsconfig.json                 extends ../../tsconfig.base.json, excludes src/sw.ts
  tsconfig.sw.json              WebWorker lib, includes only src/sw.ts
  index.html                    absolute /g/<slug>/ links
  public/manifest.webmanifest   id/scope/start_url all /g/<slug>/
  public/icon.svg               512x512 viewBox, rounded square, no external refs
  src/main.ts                   boot, loop, SW registration
  src/session.ts                every SDK call in this file — nothing else touches sdk
  src/sw.ts                     scoped to /g/<slug>/
  src/i18n/en.ts                the fallback strings — the language you author in
  src/i18n/<locale>.ts          one per additional locale, typed against en.ts
  src/i18n/index.ts             SUPPORTED + the lookup + LOCALE_NAMES
  src/styles.css                your look; imports nothing from the shell
  src/<core>.ts                 pure game rules, no DOM — this is what you unit-test
  test/<core>.test.ts           vitest
```

Copy the config files from `games/2048/` verbatim and replace the slug and the
dev port. Three details that break silently if you get them wrong:

- `vite.config.ts` needs `base: '/g/<slug>/'` **and** `VitePWA({ scope, base })`
  set to the same, with `injectRegister: false` and `manifest: false`.
- `index.html` links must be absolute (`/g/<slug>/manifest.webmanifest`), not
  relative — the game is also served under the shell's iframe.
- `src/sw.ts` must return early for anything outside `/g/<slug>/`.

### Strings

Every word the player reads lives in `src/i18n/`, one module per locale. Each
locale is a **factory** that takes the number formatter for that locale, so a
sentence containing a score is still a single entry:

```ts
// src/i18n/en.ts — the fallback, and the language you author in.
export function en(n: Intl.NumberFormat) {
  return {
    game_over: 'Game over',
    new_game: 'New game',
    watch_ad: 'Watch ad',
    final_score: (score: number) => `Score ${n.format(score)}`,
  };
}

// Every other locale is typed against this, so a key nobody translated is a
// build error rather than a blank on someone's screen.
export type Strings = ReturnType<typeof en>;
```

```ts
// src/i18n/index.ts
import { en, type Strings } from './en.js';
import { vi } from './vi.js';

export const SUPPORTED = ['en', 'vi'] as const;   // first entry is the fallback

const FACTORIES: Record<string, (n: Intl.NumberFormat) => Strings> = { en, vi };

export function stringsFor(locale: string): Strings {
  return (FACTORIES[locale] ?? en)(new Intl.NumberFormat(locale));
}
```

`games/2048/src/i18n/` is the worked example — read it. `vi.ts` there is typed
as `Strings`, and the two entries that are not literal translations carry a
comment saying why.

Wire it up once, in `session.ts`, with `watchLocale(sdk, SUPPORTED, ...)` — it
delivers the current locale first and then every change, already resolved from
`en-US` or `vi-VN` down to what you ship. Re-render on change; **do not require
a reload**, and do not rebuild the DOM either if a canvas lives inside it —
2048's `ui.ts` relabels in place for exactly that reason.

**You ship the language picker.** It lives in your own settings screen (§5,
*Settings*), in your own style. You do not own the *language* — you call
`sdk.setLocale(tag)` and the answer comes back through `onLocaleChange` like any
other change, which is what you re-render from.

**The language belongs to the player** (CLAUDE.md rule 6), so it lives on their
user record rather than on the device, and every surface reads it when it loads.
They set it once — in your settings screen or in the hub — and it follows them.
Three things follow from that, and all three are easy to get wrong:

- **Never keep your own copy of "the current language" as the source of truth.**
  The platform's is. It can change while your game is open, from the hub or from
  another tab, and a game that updated a local variable in its click handler
  will be a language behind with nothing erroring.
- **The tag you are handed may be one you do not ship.** That is normal — the
  platform records the player's choice verbatim and each surface resolves it
  against its own list. `watchLocale` does that for you and falls back to
  `SUPPORTED[0]`. Do not treat it as an error, and do not write a corrected tag
  back.
- **Do not persist a language yourself.** It is a field on the player's user
  record and the host writes it there; a copy in your save state is a second
  source of truth that will disagree the first time they change it elsewhere.

Four rules that are easy to get wrong:

- **No concatenation.** `'Score: ' + n` cannot be translated into a language
  that orders it differently. Make the whole sentence one entry, as a function:

  ```ts
  final_score: (n: number) => `Score ${fmt.format(n)}`,   // vi.ts: `Điểm ${...}`
  ```

- **Format numbers with `Intl.NumberFormat(locale)`**, not `toLocaleString()`
  with no argument — the latter follows the device, not the platform's locale,
  so a score reads one way and the UI around it another. `1,024` and `1.024` are
  the same number; showing the wrong one is showing the wrong number.
- **Layout must survive a longer word.** Vietnamese runs 20–30% longer than
  English here. Check at 320px in every locale you ship, and fix the *layout* —
  abbreviating the translation to fit a box tuned for English is the wrong end
  to fix it from.
- **Check the font actually has the glyphs.** A display face can be
  Latin-only, in which case the browser silently falls back per character and
  the heading renders half in one font and half in another. Nothing throws.
  Measure it (`canvas.measureText` of a glyph in your face versus in a font that
  does not exist) rather than trusting the screenshot on a machine that happens
  to have a good fallback — the shell's vintage theme had exactly this bug.

### Settings — required, and yours to design

Every game has a settings screen. It is not optional and not a nice-to-have for
later: two of the things in it are the only way a player reaches the platform
from inside your game, and if you do not draw them nobody does.

**The two that are required:**

| Row | What it does | How |
| --- | --- | --- |
| Language | lists the locales *this game* ships, marks the current one | `sdk.setLocale(tag)` |
| Back to the hub | leaves the game | `sdk.exitToHub()` |

Anything else your game needs — sound, difficulty, a rules reminder — goes in
the same screen and is entirely yours.

**Neither is a decision you make.** `setLocale` does not change your strings; it
asks the platform, and the change arrives back through `onLocaleChange`, which
is what re-renders you. That single path is what keeps a language picked in your
settings, one picked in the hub, and one restored from a previous visit from
ever disagreeing. `exitToHub` navigates: the shell takes over when you are
embedded, the browser when you are installed and there is no shell. Both are
fire-and-forget, and `exitToHub` is the end of your document — save before you
call it, never after.

**Rules that are easy to get wrong:**

- **Name each language in itself.** `Tiếng Việt`, not `Vietnamese`. A player
  looking for their language cannot read the one currently on screen — that is
  precisely why they are in this screen. These names are never translated and
  never live in a locale file; `LOCALE_NAMES` in `src/i18n/index.ts` is where
  they go.
- **Mark the rows with `lang`.** Otherwise a screen reader set to English
  pronounces `Tiếng Việt` as English.
- **Re-render the screen on a language change.** It is almost certainly what
  the player just used, so it is the one thing that must not be left in the old
  language. `games/2048/src/ui.ts` redraws it from `setStrings`.
- **The settings screen is not the board overlay.** It has to be reachable
  while a game-over card is up, and closing it must not dismiss that card.
- **It must work standalone.** It ships with your game, so it is on screen with
  or without a shell above it. That is the point of it being yours: an installed
  game had no way to change language or leave until each game drew its own.

`games/2048/src/ui.ts` is the worked example — a gear button in the footer, a
sheet with a root page and a language page, in that game's own palette. Copy the
shape, not the look.

### `session.ts` is mandatory

Every `sdk.*` call lives in one module that exports a small game-specific
interface. No other file in your game imports `@platform/sdk/client`. This is
the pattern in `games/2048/src/session.ts` and it is what makes the
monetisation rules reviewable in one place. It also means a future SDK change
touches one file per game.

### CSS

`import '@platform/sdk/game.css'` first, then your own stylesheet. `game.css`
gives you safe-area insets (`.game-safe`), the play-surface rules
(`.game-surface` — `touch-action: none` is what stops a swipe scrolling the
page), 44px minimum controls and reduced-motion. It carries no colours and no
fonts on purpose: bring your own look, including for your settings screen.
Everything in it is `:where()`-wrapped, so any plain selector of yours overrides
it.

---

## 6. Save state

- Versioned: `{ v: 1, ... }`, always.
- JSON-serialisable, small. No class instances, no `Map`, no `undefined`.
- Validated at the boundary with `createSaveSlot(sdk, validate)`. `validate`
  returns `null` for anything it does not recognise; the slot turns a failed
  read into "start fresh" and — importantly — stops writing after a failed read,
  so a boot-fresh does not overwrite a run the player still had.
- Decide deliberately what is *not* persisted, and write the reason in a
  comment. In 2048, the free-undo and the continue are run-local, so a reload
  grants a fresh one; that was a choice, not an oversight.
- On boot, restore silently. No "continue?" prompt for a turn-based game. A
  real-time game restores into a **paused** state with an explicit resume tap —
  never drop the player into a moving board.
- A restored run still needs `sdk.gameStart()`, or its `gameOver` is ignored and
  the run never reports.

---

## 7. Registering the game

Two edits outside your folder. Both are small and both are conflict-prone
because every agent touches the same two files — make them **last**, in their
own commit. Work lands on `main` directly; if another agent is running at the
same time, pull before you make these two edits rather than after.

**a) `catalog.json`** — append one object to `games`. This is the source of
truth; the home page, the dev proxy and `scripts/assemble.ts` all read it.

```jsonc
{
  "slug": "<slug>",
  "title": "<Title>",                 // a proper noun. Never translated.
  "tagline": {                        // one entry per locale in i18n/index.ts
    "en": "<six words max>",
    "vi": "<six words max>"
  },
  "genre": "puzzle | arcade | cards | word | casual",  // a KEY, lowercase
  "themeColor": "#......",       // matches index.html <meta name="theme-color">
  "backgroundColor": "#......",  // matches the manifest
  "devPort": 51xx,               // see the table below
  "cover": { "bg": "#......", "shapes": [ /* 4–10 positioned rects */ ] }
}
```

`tagline` is an object because rule 3 and rule 6 have to hold at once: adding a
game is one catalog entry with no shell code to touch, *and* nothing a player
reads exists in only one language. Ship every locale in
`apps/shell/src/i18n/index.ts` — a missing one falls back to English silently,
and `apps/shell/test/i18n.test.ts` is what fails instead.

`genre` is a **key**, not a label: the shell holds the words for it, one per
locale, and the filter chips compare keys. A label there would empty the grid
the moment the player switched language. The five keys above are the whole set;
needing a sixth is a platform decision — report it, do not invent it.

`cover` is data-driven art: a background plus positioned rectangles, each with
`x/y/w/h` as percentages, `r` a border radius and `c` a colour. It has to read
at 42px (a phone home-screen icon) and at ~320px (the console screen), so:
few shapes, high contrast, no text. The existing entries in `demoData.ts` are
good references. Your `public/icon.svg` should be the same artwork.

**b) `apps/shell/src/demo/demoData.ts`** — if your slug appears in
`DEMO_GAMES`, **delete that entry**. Real games come from the catalog and
placeholders are appended after them, so leaving it in ships a duplicate card
that renders "COMING SOON".

Leave `SPOTLIGHT`, `STATS`, `BOARDS`, `YOU` and `SAVED` alone, and leave
`copy.en.ts` / `copy.vi.ts` alone too. They are keyed by slug and `gameBySlug`
resolves your slug from the catalog once it is there, so the spotlight keeps
working and your game picks up placeholder stats and a placeholder blurb —
which is the intent until the API lands. Your tagline stops being read from the
placeholder file the moment your catalog entry exists, because a real game
carries its own; deleting the line as well would only widen your blast radius
for no gain.

The only thing that would break is a `SPOTLIGHT` slug that exists in neither the
catalog nor `DEMO_GAMES`; that is why you delete the placeholder in the same
commit as the catalog entry, never before.

**Dev port allocation** — one per game, never reused, or two dev servers fight:

| Port | Owner |
| --- | --- |
| 5173 | shell |
| 5174 | 2048 |
| 5175 | snake |
| 5176 | sudoku |
| 5177+ | next game, in catalog order |

---

## 8. Stack constraints

- **TypeScript, strict.** The base config also sets `noUncheckedIndexedAccess`
  and `exactOptionalPropertyTypes` — index access is `T | undefined` and you
  must handle it. No `any` without a comment saying why.
- **No engine.** Plain `<canvas>` or plain DOM. Do not add Phaser, Pixi,
  matter.js, React, or a tween library. Add a dependency only if the game
  genuinely cannot exist without it, and say so in the handover before you do.
- **No UI kit, no Tailwind.** Vanilla CSS with custom properties.
- **No shared game code.** If you notice your game repeating something 2048
  does, that is expected — abstract on the third occurrence, and only the
  platform owner does that. Do not create `packages/ui` or a `games/_shared`.
- Boring, readable code. This repo is picked up and dropped over months.
- Comments explain *why*, not what. If a line looks wrong but is deliberate,
  say why — that is the house style, see any file in `games/2048/src/`.

### Art

Rule 13: bitmap art is generated locally, with the `agy-image` skill. Invoke the
skill by name if your assistant has it; it drives one script, so this works
anywhere:

```bash
python3 ~/.claude/skills/agy-image/scripts/agy_image.py \
  --prompt "<subject, then style, palette, lighting, framing — no text in the image>" \
  --aspect 9:16 \
  --out games/<slug>/public/art/<name>.png
```

Write the prompt in English and be concrete about the art direction; it reaches
the model verbatim. Keep the assets few and small — every one of them is in your
service worker's precache and is downloaded before the game is playable offline,
so resize to the size you actually draw at (`--resize`) and prefer `.webp`, which
carries alpha too; `.png` only for a sprite sheet that must stay lossless. If the game needs no bitmap at all, which is
the normal case for a puzzle or a board game, generate nothing: CSS and canvas
drawing are smaller, sharper and translatable.

---

## 9. Running and verifying

```bash
pnpm install                                    # after adding your package
pnpm --filter @game/<slug> dev                  # standalone, real host in-process
pnpm dev                                        # everything; hub at :5173 proxies /g/<slug>/
pnpm --filter @game/<slug> test
pnpm --filter @game/<slug> typecheck
pnpm build                                      # -r build + assemble into dist/
```

You must verify **both** modes before calling the game done: standalone at
`http://localhost:<devPort>/g/<slug>/` (installed-PWA path) and embedded via the
hub at `http://localhost:5173/play/<slug>` (iframe + MessagePort path). Bugs
live in exactly one of the two.

Two console errors in dev are expected and not yours: `Failed to register a
ServiceWorker` from both the shell and the game. `vite-plugin-pwa` does not emit
`sw.js` under `vite dev`, only in a build. Check the service worker against
`pnpm build` and a static preview, not the dev server.

Verify on a phone-sized viewport, portrait, 320px minimum. The dev servers bind
to every interface, so a real phone on the same network works too — do that at
least once.

---

## 10. Definition of done

- [ ] Core rules covered by unit tests on a pure, DOM-free module, including the
      edge cases named in your game's spec doc.
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
      control at 320px, and switching language re-renders the game without a
      reload — whether it was switched in your settings screen or in the hub.
- [ ] The settings screen exists, is reachable while an end-of-run card is up,
      offers every locale in `SUPPORTED` named in its own language, and leaves
      to the hub. Verified **standalone as well as embedded** — that is the mode
      it is the only affordance in.
- [ ] No `localStorage`, no `fetch`, no direct IndexedDB anywhere in `src/`.
- [ ] No files changed outside `games/<slug>/`, `catalog.json` and the one
      `demoData.ts` deletion.
- [ ] `docs/testplan.md` §1 and §3 all `pass`; §2 run on a real phone, with the
      date and device recorded in its header.
- [ ] `docs/progress.md` is current: every task `done` with evidence, §2 fully
      ticked, and a final session-log entry.
- [ ] Anything built differently from the brief is in `docs/progress.md` §4,
      and every SDK gap you hit is in §6.

## 11. Handover note

Finish with a closing session-log entry in `games/<slug>/docs/progress.md` §3,
headlined `Shipped — handover`, covering: what you built, anything in the brief
you deliberately did not do and why, any SDK gap you hit and worked around, and
anything the next agent should know. Repeat it in the body of the shipping
commit. Do not put it in a new file.

It is a **summary of** §4 and §6 of that same file, not a replacement for them.
If writing it turns up something those sections do not already say, the progress
doc was not kept current — fix it there first.

---

## 12. Mistakes that have to be caught in review

Each of these looks fine locally and breaks the platform:

- Writing progress to `localStorage` "just as a cache". It becomes the source of
  truth the first time a save fails, and iOS deletes it.
- Debouncing `save` in the game. The host already coalesces; a game-side
  `pagehide` flush is the write most likely to vanish.
- Treating `showRewarded` resolving `false` as an error — a toast, a lost turn,
  a disabled button.
- Calling `showInterstitial` on the game-over screen instead of on "New game".
- Registering the service worker at `/` instead of `/g/<slug>/`. It breaks
  per-game installability for *every* game.
- Relative paths in `index.html` or the manifest.
- A game loop with no `onPause` handler at all — the host emits the event, but
  nothing acts on it, and the player loses a life while watching a rewarded ad.
- A `resume` handler that is not idempotent, so a suppressed interstitial
  restarts a loop that was never running.
- Shipping without a settings screen, because the shell "probably has one".
  It does not: over a running game the shell draws nothing at all, and an
  installed game has no shell above it. A player with no settings screen cannot
  change language and cannot leave.
- Keeping your own `currentLocale` as the source of truth and updating it in the
  click handler instead of re-rendering from `onLocaleChange`. It works until
  the language is changed from the hub, and then the game is a language behind
  with no error anywhere.
- Calling `sdk.exitToHub()` and then saving. The document is already leaving.
- Leaving the placeholder entry in `demoData.ts`, shipping two cards.
- Pulling a texture off the web because it was faster than generating one. It
  is an unlicensed asset in a commercial app, and if it was hotlinked it is also
  a blank rectangle the first time the game is opened offline.
- Reusing another game's `devPort`.
- Adding a method to the SDK to make one game easier.
- One `'Game over'` left in a `.ts` file. It looks finished, so it ships, and it
  is the string a player in another language sees at the most memorable moment
  of the run.
- Building a sentence by concatenation, which cannot be reordered by a
  translator.
- Writing code before the brief is frozen, then treating the code as the spec.
- Finishing a session without a `progress.md` entry. The next session — or the
  next agent — starts by guessing, and guesses wrong.
