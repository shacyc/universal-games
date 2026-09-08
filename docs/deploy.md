# Deploying

The whole site is **one Cloudflare Worker**. It serves the assembled static
tree — the hub at `/`, each game at `/g/<slug>/` — through its `ASSETS` binding,
and it handles everything under `/api/`. One origin, one deploy. That single
origin is what makes the shell, the games and the API same-origin, which is what
makes the iframe + `MessagePort` transport work and lets the SDK host call the
API with a plain `fetch` and no CORS.

Worker: **`home`** → `https://home.ummigames.workers.dev`. The free URL is
`<worker-name>.<account-subdomain>.workers.dev`: `home` is the Worker name in
`wrangler.jsonc`, `ummigames` is this account's subdomain (set once at the
account level). A custom domain replaces the whole host — see the end of this
doc.

Config lives in `wrangler.jsonc` at the repo root. The Worker's code is
`workers/api/src/index.ts`.

## How the tree is built

`pnpm build` does two things, unchanged from before:

1. `pnpm -r build` — every package builds into its own `dist/`. Each game's Vite
   build already emits with base `/g/<slug>/`.
2. `tsx scripts/assemble.ts` — copies the shell's `dist/` to `dist/` and each
   game's `dist/` to `dist/g/<slug>/`.

The assemble step reads `catalog.json` and **fails if a listed game has no
build output**. That is deliberate: a catalog entry is a promise that the game
exists.

`wrangler deploy` then uploads `dist/` as the Worker's static assets and the
Worker script alongside it.

### Routing

There is no `_redirects` file. `wrangler.jsonc` sets:

- `not_found_handling: "single-page-application"` — a path that matches no file
  falls back to the hub's `/index.html` with a 200, so the shell's client-side
  routes such as `/play/2048` resolve. Real files still win first, so `/g/2048/`
  serves that game's own `index.html`, not the hub's.
- `run_worker_first: ["/api/*"]` — only API requests cost a Worker invocation.
  Every static request goes straight to the asset server, and navigations skip
  the Worker entirely (compat date is past 2025-04-01).

The hub service worker must still not answer for `/g/` — that rule lives in
`apps/shell/src/sw.ts`, see decision 10 in `docs/sdk-decisions.md`. It is a
service-worker rule, unrelated to the routing above.

## First time only

You need a Cloudflare account. This step is yours to run — the login is an
interactive browser flow.

```bash
npx wrangler login
```

Then deploy once:

```bash
pnpm run deploy
```

The first `wrangler deploy` creates the `home` Worker and, if the account has no
`workers.dev` subdomain yet, prompts to register one. There is no separate
"create project" step.

### Retiring the old deployments

Two earlier deployments still serve their last build until deleted in the
dashboard (Workers & Pages → pick it → Manage/Settings → Delete). Do both once
the `home` Worker is verified on a real phone:

- the **Pages** project `ummigames` at `ummigames.pages.dev` (the pre-Worker
  host);
- the **Worker** `ummigames` at `ummigames.ummigames.workers.dev` — the first
  deploy of this config used that name. Renaming the Worker in `wrangler.jsonc`
  does not move it; a fresh `home` Worker is created and the old one is left
  behind. `npx wrangler delete --name ummigames` removes it from the CLI.

## Authenticating without the browser flow

`wrangler login` stores an OAuth session per machine, which is fine to work
with but wrong for anything unattended, and it silently picks whichever
Cloudflare account that session belongs to. An API token pins both.

Wrangler reads `.env` in the project root. Create it — it is gitignored, and it
must never become anything else:

```
CLOUDFLARE_API_TOKEN=<token>
CLOUDFLARE_ACCOUNT_ID=<account id>
```

The token needs **Workers Scripts: Edit** and **Account Settings: Read** on the
account you deploy to. Add **D1: Edit** and **Workers KV Storage: Edit** if and
when those bindings are added to `wrangler.jsonc` — not before. Create the token
at https://dash.cloudflare.com/profile/api-tokens.

Three rules, and they are not negotiable:

- **The token never lands in a tracked file.** Not `wrangler.jsonc`, not a
  script, not a comment, not `catalog.json`. `.gitignore` covers `.env`,
  `.env.*` and `.dev.vars`; nothing else is safe. Keep `.env` to the two
  Cloudflare variables above — `wrangler dev` now surfaces `.env` values to the
  running Worker as local vars. They are never uploaded by `wrangler deploy`
  (only `wrangler secret put` and `.dev.vars` reach a deployed Worker), but
  there is no reason for anything else to be in that file.
- **The token never goes to a game agent.** Agents read repo files and run shell
  commands. Deploying is not part of writing a game — see the file-ownership
  table in `docs/building-a-game.md`. Deploys are run from here.
- **A token that has been pasted anywhere — chat, an issue, a screenshot — is
  spent.** Roll it at the link above and replace the value in `.env`. Rolling
  costs nothing; the deploy keeps working the moment the new value is in place.

To check which identity is actually in effect before a deploy:

```bash
npx wrangler whoami
```

With `.env` present that reports the token's account; without it, the OAuth
session's.

## Check before you deploy

Never deploy a tree you have not served. The dev server does not exercise the
built base paths, the SPA fallback, or the service workers — `vite dev` does not
even emit `sw.js`.

```bash
pnpm build && npx wrangler dev --port 8788
```

Then, at `http://localhost:8788`:

- `/` — the hub loads, its service worker registers at scope `/`.
- `/g/2048/` — the **game** loads, not the hub. If you get the hub here, a file
  is missing or `not_found_handling` is wrong.
- The game's service worker registers at scope `/g/2048/`, and
  `/g/2048/manifest.webmanifest` has `scope` and `start_url` of `/g/2048/`.
  This is what makes each game install as its own PWA.
- `/play/2048` — the hub loads and mounts the game in its iframe.
- `/api/health` — returns `{"ok":true}`.
- No console errors.

## Deploy

```bash
pnpm run deploy
```

Note the `run`: `pnpm deploy` without it hits pnpm's own built-in `deploy`
command, not this script.

That builds and uploads to production. To put the current tree up at its own
URL without touching production — useful for reviewing a game an agent has
written, on a real phone:

```bash
pnpm run deploy:preview
```

That runs `wrangler versions upload`, which prints a preview URL of the form
`https://<version-prefix>-home.ummigames.workers.dev`. It is a new **version**,
not a release: production keeps serving whatever `pnpm run deploy` last shipped.
Promote a version to production with `npx wrangler versions deploy`.

Preview URLs are per-version, not per-branch. There is no CI watching the repo;
every preview is a command you run.

## After deploying

On a real Android phone, not an emulator:

- Open `/`, then open a game. It plays.
- Open `/g/2048/` directly. Install it from the browser menu. It lands on the
  home screen with **the game's** icon, opens full-screen, and shows no browser
  chrome.
- Turn on airplane mode and reopen the installed game. It still plays.
- On iPhone: **in Safari**, Share → Add to Home Screen, same checks. It has to be
  Safari: Chrome, Firefox and Edge on iOS are WKWebView shells with no service
  worker, so nothing is cached there and a reload with no network fails. That is
  the platform, not a bug — see decision 13 in `docs/sdk-decisions.md`. Open the
  installed icon once *with* network before testing airplane mode; an installed
  iOS app has its own storage and registers its own copy of the service worker
  on that first launch.

If the installed game opens the hub instead of the game, the manifest `scope`
or the service worker registration scope is wrong — see decision 10 in
`docs/sdk-decisions.md`.

## When a new game ships

Nothing changes here. The game lands in `games/<slug>/` with an entry in
`catalog.json`, `pnpm build` picks it up, and the same deploy command ships it.
