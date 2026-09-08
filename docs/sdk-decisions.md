# SDK implementation decisions

Where the implementation departs from `platform-sdk.md`, and why. Read this
alongside that document — the spec still describes the intent; these are the
points where following it literally would have broken something.

## 1. The transport is pluggable, because an installed game has no parent frame

The spec's transport is `postMessage` to `window.parent`. But an installed game
opens at `/g/<slug>/` as a top-level document: there is no shell, so there is
no host, no saves and no ads — in the mode we most care about.

`createClient()` therefore picks a transport:

- framed (embedded in the shell) → `postMessage` + `MessagePort`
- top-level (installed PWA, direct navigation, standalone `pnpm dev`) →
  the same `HostCore` running in-process, loaded via dynamic `import()` so
  embedded games do not pay for its bundle

Both paths route through `HostCore.handle` with the same adapters, so they
cannot drift apart. This is also why there is no separate "mock host": the
`testing/` entry point swaps adapters into the real host.

## 2. Identity comes from the MessagePort, not the origin

The spec says to validate `event.origin`. Games are same-origin with the shell
by design, so that check passes identically for the shell, every game, and any
other same-origin frame — it is not an identity check.

Instead: the host matches `event.source` against the `contentWindow` of an
iframe it actually mounted, then transfers a private `MessagePort`. The origin
check is kept as a cheap first filter.

The slug is assigned by the shell when it mounts the frame and is never read
from the game's messages. A game that could name itself could read and
overwrite another game's saves.

## 3. Local writes are not debounced

The spec debounces `save` ~1s with a flush on `pagehide`. IndexedDB writes are
async and routinely lost during page teardown, which makes that flush the write
most likely to vanish — and losing it loses the run.

Saves are well under a kilobyte a few times per second, so the local write goes
out immediately. The coalescing the spec wants belongs on the server sync
(v1+), where the cost it avoids is real. The public API is unchanged.

## 4. `load()` returns `unknown`

`load<T>(): Promise<T | null>` is an unchecked cast: the generic asserts a
shape nothing verified. Save states are explicitly versioned (`v: 1`) because
they are expected to change, so a stale save is a case to handle, not a crash
to hit deep in game code. Games validate at the boundary.

## 5. Frequency capping wraps the ad adapter

`withFrequencyCap` decorates any `AdsAdapter`. Putting the rules in the stub
network would mean losing them when the real network is plugged in at v1.
Rewarded ads are never capped — the player asked for them.

## 6. An unsolicited host → client event type exists

The spec requires games to subscribe to platform mute changes, but a
request/response pair cannot express a host-initiated message. `HostEvent`
(`mute`, `pause`, `resume`) carries no id and expects no reply.

## 7. `gameOver` is enforced, not documented

The spec says games must call it exactly once per run. The host issues a run id
on `gameStart` and ignores duplicates, so a game bug cannot fire two
interstitials or double-count a run.

## 8. Requests time out

The spec does not say what happens when the host never replies. Every request
has a timeout (5s; 5min for ad calls, which block on a human). On timeout the
ad methods resolve to their safe default rather than hanging the game.

## 9. `UNKNOWN_METHOD` is a defined error code

Each game caches its own bundle in its own service worker, so a game can
outlive the shell build it was written against. An unrecognised method gets a
typed error instead of silence.

## 10. The hub service worker must not answer `/g/`

Root scope reaches `/g/*`. A game's own registration is narrower and wins once
registered, but the hub's SPA navigation fallback would otherwise serve the
hub's `index.html` for a game URL on first visit. `apps/shell/src/sw.ts`
returns early for `/g/`, and `public/_redirects` mirrors the same rule.
