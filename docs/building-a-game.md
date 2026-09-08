# Building a game for this platform

Read this before writing a single line. It is the contract between one game and
everything else in the repo. If you follow it, your game drops in with no shell
changes, no SDK changes, and no merge conflicts with the other games being
written in parallel.

Order to read: this file, then `CLAUDE.md`, then `docs/platform-sdk.md` and
`docs/sdk-decisions.md`, then the spec for your game (`docs/game-<slug>.md`).
`games/2048/` is the reference implementation — copy its shape, not its rules.

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
platform decision, not a game decision. Note it in your handover and ship the
game without it.

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
   `prefers-reduced-motion`.
8. **Your service worker is scoped to `/g/<slug>/` and caches only your build.**
   Never register at root scope. Never cache another game's URLs.
9. **The slug is assigned by the shell, not by you.** You pass yours to
   `createClient` for the standalone case; when embedded, the host's mapping
   wins. Never read a slug out of a message or the URL to pick a save.
10. **`load()` returns `unknown`.** Validate at the boundary through
    `createSaveSlot`. A save written by an older build of your game is a case to
    handle, not a crash.

---

## 4. The SDK surface

The complete set of methods a v0 host answers. Nothing else exists; do not call
anything else.

```ts
import { createClient } from '@platform/sdk/client';
import { createSaveSlot, watchMute } from '@platform/sdk/game';

const sdk = createClient({ slug: '<slug>' });

await sdk.ready();                  // → GameContext { slug, locale, isInstalled, isMuted }

await sdk.getUser();                // → { id, isAnonymous }
await sdk.load();                   // → unknown (validate it!)
await sdk.save(state);              // JSON-serialisable, keep it under ~1KB

await sdk.showRewarded('placement');      // → boolean, never rejects
await sdk.showInterstitial('placement');  // → void, never rejects, may be suppressed

sdk.gameStart();                    // opens a run
sdk.gameOver({ score });            // closes it, once
sdk.track('event', { ... });        // strings, numbers, booleans only

sdk.onMuteChange(fn); sdk.onPause(fn); sdk.onResume(fn);   // each returns an unsubscribe
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
fonts on purpose: bring your own look. Everything in it is `:where()`-wrapped,
so any plain selector of yours overrides it.

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
own commit, and rebase rather than merge if someone beat you to it.

**a) `catalog.json`** — append one object to `games`. This is the source of
truth; the home page, the dev proxy and `scripts/assemble.ts` all read it.

```jsonc
{
  "slug": "<slug>",
  "title": "<Title>",
  "tagline": "<six words max>",
  "genre": "Puzzle | Arcade | Cards | Word | Casual",   // must be one of these
  "themeColor": "#......",       // matches index.html <meta name="theme-color">
  "backgroundColor": "#......",  // matches the manifest
  "devPort": 51xx,               // see the table below
  "cover": { "bg": "#......", "shapes": [ /* 4–10 positioned rects */ ] }
}
```

`cover` is data-driven art: a background plus positioned rectangles, each with
`x/y/w/h` as percentages, `r` a border radius and `c` a colour. It has to read
at 42px (a phone home-screen icon) and at ~320px (the console screen), so:
few shapes, high contrast, no text. The existing entries in `demoData.ts` are
good references. Your `public/icon.svg` should be the same artwork.

**b) `apps/shell/src/demo/demoData.ts`** — if your slug appears in
`DEMO_GAMES`, **delete that entry**. Real games come from the catalog and
placeholders are appended after them, so leaving it in ships a duplicate card
that renders "COMING SOON".

Leave `SPOTLIGHT`, `STATS`, `BOARDS`, `YOU` and `SAVED` alone. They are keyed by
slug and `gameBySlug` resolves your slug from the catalog once it is there, so
the spotlight keeps working and your game picks up placeholder stats — which is
the intent until the API lands. The only thing that would break is a `SPOTLIGHT`
slug that exists in neither the catalog nor `DEMO_GAMES`; that is why you delete
the placeholder in the same commit as the catalog entry, never before.

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
- [ ] No `localStorage`, no `fetch`, no direct IndexedDB anywhere in `src/`.
- [ ] No files changed outside `games/<slug>/`, `catalog.json` and the one
      `demoData.ts` deletion.

## 11. Handover note

Finish with a short `## Handover` section in your PR description covering:
what you built, anything in the spec you deliberately did not do and why, any
SDK gap you hit and worked around, and anything the next agent should know.
Do not put it in a new file.

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
- Leaving the placeholder entry in `demoData.ts`, shipping two cards.
- Reusing another game's `devPort`.
- Adding a method to the SDK to make one game easier.
