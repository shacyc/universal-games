# CLAUDE.md

Context for Claude Code. Read this file plus `docs/platform-sdk.md` and
`docs/sdk-decisions.md` before writing code.

**Writing a game? `docs/building-a-game.md` is the contract — read it first.**
It says which files you own, which you must not touch, and what "done" means.

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
6. **Portrait-first, thumb-first.** Every game must be fully playable one-handed
   in portrait on a mid-range Android phone. Hit targets >= 44px. No hover-only
   interactions. Respect `env(safe-area-inset-*)`.

## Stack

- **Language:** TypeScript, strict mode. No `any` without a comment explaining why.
- **Shell:** Vite + React 18.
- **Games:** whatever fits. The first game (2048) is plain `<canvas>` + TS, no
  engine. Do not add Phaser/Pixi until a game actually needs physics or sprites.
- **Styling:** CSS Modules or vanilla CSS with custom properties. No Tailwind,
  no UI kit — bundle size matters more than developer convenience here.
- **Hosting:** Cloudflare Pages (static) + Cloudflare Workers (API).
- **Data:** Cloudflare D1 for saves/scores, KV for the catalog cache.
  Not needed for v0.
- **Package manager:** pnpm workspaces.

## Repo layout

```
apps/
  shell/                 # hub: game list, profile, install prompts
games/
  2048/                  # first game, builds to /g/2048/
packages/
  sdk/                   # @platform/sdk — client (in game) + host (in shell)
  ui/                    # shared primitives, only once 2+ consumers exist
workers/
  api/                   # Cloudflare Worker: saves, scores, currency
catalog.json             # game registry
docs/
```

Build output: shell to `/`, each game to `/g/<slug>/`. Deployed as one static
site so games are same-origin with the shell.

## Current milestone: v0

Goal is to prove the whole pipeline end to end with one real game. Ship this
before adding anything else.

In scope:
- Shell with a game grid rendered from `catalog.json`, one entry.
- 2048 fully playable (`docs/game-2048.md`).
- SDK implemented with real `save`/`load`/`getUser` (local + anonymous id) and
  **stubbed** `showRewarded`/`showInterstitial` that resolve after a fake 3s
  modal. The call sites must be real; only the ad network is fake.
- Per-game PWA install working on Android (custom prompt) and iOS (instructions
  overlay).
- Deployed to Cloudflare Pages.

Explicitly out of scope for v0: accounts, login, real ads, payments, shop, gems,
leaderboards, a second game, a design system. Do not build these. Do not
scaffold empty folders for them.

## Next milestone: v0.1 — the catalogue is more than one game

Runs in parallel with the v0 deploy. The point is to prove the platform holds
when several games are written independently, by different people, at the same
time: one folder plus one catalog entry, no shell change, no SDK change.

In scope: **Neon Snake** (`docs/game-snake.md`) and **Sudoku Daily**
(`docs/game-sudoku.md`). Each is written by one agent, in its own branch,
touching only `games/<slug>/`, `catalog.json` and one deletion in
`apps/shell/src/demo/demoData.ts`. `docs/building-a-game.md` is the brief.

Still out of scope, unchanged from v0: accounts, real ads, payments, shop,
gems, leaderboards, a design system, and any new SDK method. An agent that
needs one reports it instead of adding it — growing the SDK surface is a
platform decision and it is made here, not in a game.

## Working style

- Prefer boring, readable code over clever abstractions. This is a project that
  will be picked up and dropped repeatedly over months.
- Abstract on the third occurrence, not the first.
- When a decision has a real trade-off, state the options and ask rather than
  picking silently.
- Keep the SDK surface small. Every method added is a method that must be
  supported by every future game.
