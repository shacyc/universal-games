# Deploying

The whole site is one static tree on Cloudflare Pages: the hub at `/`, each game
at `/g/<slug>/`. That single origin is what makes the shell and the games
same-origin, which is what makes the iframe + `MessagePort` transport work.

Project: **`ummigames`** → https://ummigames.pages.dev

## How the tree is built

`pnpm build` does two things:

1. `pnpm -r build` — every package builds into its own `dist/`. Each game's Vite
   build already emits with base `/g/<slug>/`.
2. `tsx scripts/assemble.ts` — copies the shell's `dist/` to `dist/` and each
   game's `dist/` to `dist/g/<slug>/`.

The assemble step reads `catalog.json` and **fails if a listed game has no
build output**. That is deliberate: a catalog entry is a promise that the game
exists.

`dist/_redirects` ships with the shell. Pages serves real files first, so
`/g/2048/` resolves to the game's own `index.html`; the `/*  /index.html  200`
rule only catches the hub's client-side routes such as `/play/2048`.

## First time only

You need a Cloudflare account. These two steps are yours to run — the login is
an interactive browser flow.

```bash
npx wrangler login
```

```bash
npx wrangler pages project create ummigames --production-branch main
```

Direct Upload was chosen over the Git integration. **That choice is permanent
for this project**: Cloudflare does not allow converting a Direct Upload project
to a Git-connected one. Moving to Git later means creating a second project and
retiring this one.

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

The token needs the **Cloudflare Pages: Edit** permission on the account that
owns `ummigames`, and nothing more. Create it at
https://dash.cloudflare.com/profile/api-tokens.

Three rules, and they are not negotiable:

- **The token never lands in a tracked file.** Not `wrangler.jsonc`, not a
  script, not a comment, not `catalog.json`. `.gitignore` covers `.env`,
  `.env.*` and `.dev.vars`; nothing else is safe.
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
built base paths, the `_redirects` file, or the service workers — `vite dev`
does not even emit `sw.js`.

```bash
pnpm build && npx wrangler pages dev dist --port 8788
```

Then, at `http://localhost:8788`:

- `/` — the hub loads, its service worker registers at scope `/`.
- `/g/2048/` — the **game** loads, not the hub. If you get the hub here,
  `_redirects` is wrong or a file is missing.
- The game's service worker registers at scope `/g/2048/`, and
  `/g/2048/manifest.webmanifest` has `scope` and `start_url` of `/g/2048/`.
  This is what makes each game install as its own PWA.
- `/play/2048` — the hub loads and mounts the game in its iframe.
- No console errors.

## Deploy

```bash
pnpm run deploy
```

Note the `run`: `pnpm deploy` without it hits pnpm's own built-in `deploy`
command, not this script.

That builds and uploads to production. To put a branch up at its own preview URL
without touching production — useful for reviewing a game an agent has written,
on a real phone:

```bash
pnpm run deploy:preview -- --branch game/snake
```

Preview deployments here are manual, because Direct Upload has no CI watching
the repo. Every branch you name gets its own `<branch>.ummigames.pages.dev`.

## After deploying

On a real Android phone, not an emulator:

- Open `/`, then open a game. It plays.
- Open `/g/2048/` directly. Install it from the browser menu. It lands on the
  home screen with **the game's** icon, opens full-screen, and shows no browser
  chrome.
- Turn on airplane mode and reopen the installed game. It still plays.
- On iPhone: Share → Add to Home Screen, same checks.

If the installed game opens the hub instead of the game, the manifest `scope`
or the service worker registration scope is wrong — see decision 10 in
`docs/sdk-decisions.md`.

## When a new game ships

Nothing changes here. The game lands in `games/<slug>/` with an entry in
`catalog.json`, `pnpm build` picks it up, and the same deploy command ships it.
