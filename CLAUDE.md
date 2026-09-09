# CLAUDE.md

Context for Claude Code. Read this file plus `docs/platform-sdk.md` and
`docs/sdk-decisions.md` before writing code.

**Writing a game? `docs/building-a-game.md` is the contract — read it first.**
It says which files you own, which you must not touch, and what "done" means.
`docs/game-process.md` is the process around it: which documents must exist
before code, and what you update when you stop. Shipping the site is
`docs/deploy.md`.

## What this project is

A web-based game platform: one hub ("arcade") that hosts a growing collection of
small games, built by a solo developer over time. Each game is individually
installable to the phone home screen as its own PWA, with its own icon and
its own full-screen window.

Business goals: ad revenue (rewarded + interstitial) and in-game purchases
(shared currency, a cross-game "Pass"). Primary audience is international
(English-first UI), so copy defaults to English.

## Non-negotiable architecture rules

1. **Games are isolated.** Each game lives at `/g/<slug>/` as a separate build,
   embedded in the shell as a **same-origin iframe**. A game never imports shell
   code and the shell never imports game code.
2. **Games only talk to the platform through the SDK.** A game must never call
   an ad network, a database, `fetch` to the API, or `localStorage` directly.
   Everything goes through `@platform/sdk` (see `docs/platform-sdk.md`).
   This is what makes it possible to swap ad networks or storage backends in
   one place across all future games.
3. **`catalog.json` is the source of truth** for which games exist. Adding a
   game means adding a folder under `games/` plus one entry in the catalog.
   No shell code changes.
4. **Per-game PWA scope.** Every game serves its own
   `/g/<slug>/manifest.webmanifest` with `scope` and `start_url` set to
   `/g/<slug>/`, plus its own service worker registered at that scope. The hub
   at `/` has its own manifest and SW. Do not register a single SW at root
   scope; it breaks per-game installability.
5. **No game state in `localStorage` as the source of truth.** iOS Safari
   evicts script-writable storage after ~7 days without use for uninstalled
   sites. `sdk.save()` writes local-first then syncs to the server.
6. **Multi-language from the start.** The platform owns the language, each game
   owns its words. The choice reaches games as `GameContext.locale` plus
   `onLocaleChange`; a game ships `src/i18n/<locale>.ts` and reads it through
   `watchLocale`. No user-facing string is written into a `.ts` or `.html` file,
   in the shell or in a game: words live in a locale module, and catalog copy
   (`tagline`) is a per-locale object inside `catalog.json`, so adding a game is
   still one entry. `genre` is a key, never a label. Translation never crosses
   the SDK wire — see decisions 15, 16 and 18 in `docs/sdk-decisions.md`.
   Shipping `en` + `vi`; adding a locale is one file per package. LTR only for
   now, and the PWA manifest stays English.
7. **Every game ships its own settings screen**, in its own style, holding at
   least the **language** and **back to the hub**. The shell draws nothing over
   a running game — it has a picker in the hub's topbar and that is all — so a
   game without a settings screen is a game the player cannot change language in
   and cannot leave; standalone it is the only affordance there is. Both rows act
   through `sdk.setLocale()` and `sdk.exitToHub()`: the game asks, the platform
   decides. `games/2048/src/ui.ts` is the worked example.
8. **Portrait-first, thumb-first.** Every game must be fully playable one-handed
   in portrait on a mid-range Android phone. Hit targets >= 44px. No hover-only
   interactions. Respect `env(safe-area-inset-*)`.

## Stack

- **Language:** TypeScript, strict mode. No `any` without a comment explaining why.
- **Shell:** Vite + React 18.
- **Games:** whatever fits. The first game (2048) is plain `<canvas>` + TS, no
  engine. Do not add Phaser/Pixi until a game actually needs physics or sprites.
- **Styling:** CSS Modules or vanilla CSS with custom properties. No Tailwind,
  no UI kit — bundle size matters more than developer convenience here.
- **Hosting:** one Cloudflare Worker. It serves the assembled static tree
  (hub + games) through its `ASSETS` binding and handles `/api/*` in the same
  script — one deploy, one origin. Config is `wrangler.jsonc`; see `docs/deploy.md`.
- **Data:** Cloudflare D1 for saves/scores, KV for the catalog cache.
  Not needed for v0. Add the bindings to `wrangler.jsonc` when a feature uses
  them, not before.
- **Package manager:** pnpm workspaces.

## Repo layout

```
apps/
  shell/                 # hub: game list, profile, install prompts
games/
  2048/                  # first game, builds to /g/2048/
    docs/                # brief, plan, testplan, progress — one set per game
packages/
  sdk/                   # @platform/sdk — client (in game) + host (in shell)
  ui/                    # shared primitives, only once 2+ consumers exist
workers/
  api/                   # the platform Worker: serves the static tree + /api/*
catalog.json             # game registry
docs/
  templates/game-docs/   # the four per-game documents, copied into games/<slug>/docs/
wrangler.jsonc           # Worker + static-assets config, one deploy
```

Build output: shell to `/`, each game to `/g/<slug>/`, assembled into `dist/`
and served by the Worker. One origin, so games are same-origin with the shell
and the API.

## Current milestone: v0

Goal is to prove the whole pipeline end to end with one real game. Ship this
before adding anything else.

In scope:
- Shell with a game grid rendered from `catalog.json`, one entry.
- 2048 fully playable (brief: `games/2048/docs/brief.md`).
- SDK implemented with real `save`/`load`/`getUser` (local + anonymous id) and
  **stubbed** `showRewarded`/`showInterstitial` that resolve after a fake 3s
  modal. The call sites must be real; only the ad network is fake.
- Per-game PWA install working on Android (custom prompt) and iOS (instructions
  overlay).
- Deployed as one Cloudflare Worker (`docs/deploy.md`).

Explicitly out of scope for v0: accounts, login, real ads, payments, shop, gems,
leaderboards, a second game, a design system. Do not build these. Do not
scaffold empty folders for them.

## Next milestone: v0.1 — the catalogue is more than one game

Runs in parallel with the v0 deploy. The point is to prove the platform holds
when several games are written independently, by different people, at the same
time: one folder plus one catalog entry, no shell change, no SDK change.

In scope: **Neon Snake**, **Sudoku Daily**, and **multi-language** across the
shell and every game (`en` + `vi`; rule 6 above, decision 15 in
`docs/sdk-decisions.md`). i18n is in this milestone because it is cheapest
before the two games are written — retrofitting strings into a shipped game is
the expensive order.

Each game is written by one agent,
touching only `games/<slug>/`, `catalog.json` and one deletion in
`apps/shell/src/demo/demoData.ts`. `docs/building-a-game.md` is the entry point;
each game's own brief is in `games/<slug>/docs/` once it has been set up
(`docs/game-process.md`).

This is a solo project and work lands **directly on `main`** — no feature
branch, no PR, unless two agents are genuinely running at the same time, which
is the one case a branch per game is worth the ceremony. The blast-radius rule
is what keeps parallel work safe, not the branch.

Still out of scope, unchanged from v0: accounts, real ads, payments, shop,
gems, leaderboards and a design system. Also **any new SDK method** — an agent
that needs one reports it instead of adding it; growing the SDK surface is a
platform decision and it is made here, not in a game. Two were added in this
milestone, `setLocale` and `exitToHub`, so that rule 7 could be obeyed at all
(decision 18). That is the bar: a method exists because every game needs it, not
because one game would be easier with it.

## How a game gets built

Full detail in `docs/game-process.md`. The parts that are not negotiable:

- Every game owns four documents in `games/<slug>/docs/`: `brief.md` (what and
  why, owner-owned, frozen before code), `plan.md` (how, agent-written,
  owner-approved), `testplan.md` (the cases, written before the code) and
  `progress.md` (where the work actually is).
- **No game code exists before `brief.md` is frozen and `plan.md` is approved.**
  Asked to build a game whose documents are missing, an agent drafts them with
  the owner first — `/new-game <slug>` runs that interview. That is the required
  first step, not initiative.
- **Every working session reads `progress.md` first and updates it last**, with
  a dated, append-only session-log entry. A commit that changes
  `games/<slug>/src/` without touching `games/<slug>/docs/progress.md` is
  incomplete.
- Templates are in `docs/templates/game-docs/`. `pnpm game:status` computes where
  every game really is, from `docs/game-gates.json` rather than from what the
  docs claim; `pnpm game:check <slug>` gives a verdict before advancing a gate.
- A `pre-commit` hook (installed by `pnpm install`) refuses a commit that breaks
  a §3 rule mechanically, and warns when `progress.md` was not updated. Blocking
  is reserved for code that is objectively wrong — see `docs/game-process.md`.

**Starting a game session, in any assistant:**

> Read `docs/building-a-game.md` and build game `<slug>`.

That one line is the whole entry point. `docs/building-a-game.md` §0 is written
to be self-sufficient — no slash commands, no plugins, no memory of a previous
session — so it works the same in Claude Code, in another editor's assistant, or
pasted into a chat window. `/new-game` and `/game-status` are shortcuts to the
same procedure, never a second copy of it.

## Working style

- Prefer boring, readable code over clever abstractions. This is a project that
  will be picked up and dropped repeatedly over months.
- Abstract on the third occurrence, not the first.
- When a decision has a real trade-off, state the options and ask rather than
  picking silently.
- Keep the SDK surface small. Every method added is a method that must be
  supported by every future game.
