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

## 11. `@platform/sdk/game` — the only shared game code, for now

Games are written independently. The exception is a small set of helpers under
the `./game` entry point, admitted by one test: **would two games implementing
this differently break the platform?** Not "does it repeat" — repetition alone
is a reason to wait.

Three things pass that test today:

- **`createSaveSlot`** — `load()` returns `unknown` by design (decision 4), so
  every game must validate at the boundary. The one that skips it trusts a
  stale save and breaks mid-run. The slot also stops writing after a failed
  read, because a game that boots fresh and saves over an unreadable slot
  destroys a run the player still had.
- **`watchMute`** — the platform owns the mute toggle "so it is consistent
  across every game". Subscribing to changes but never reading
  `context.isMuted` is the obvious way to break that promise; the helper
  delivers the current value first, then changes.
- **`game.css`** — safe-area insets, 44px hit targets, `touch-action: none` on
  the play surface, reduced motion. These are CLAUDE.md rule 6, and left to
  each game they will drift. Everything is wrapped in `:where()` so a game
  overrides any of it with a plain selector. No colours, no fonts: games bring
  their own look.

None of these add a method to the wire protocol, so the SDK contract — the
thing every future host must support — does not grow.

Deliberately **not** here: canvas sizing, input and swipe handling, tweening,
grid state, UI chrome. Those would be generalised *from* game code, and there
is not yet a single finished game to generalise from. CLAUDE.md says abstract
on the third occurrence; the helpers above are exempt because they come from
the platform contract in `platform-sdk.md`, not from a game.

## 12. The host brackets every ad with `pause` / `resume`

Decision 6 added `HostEvent` so the platform could push mute changes, and
declared `pause`/`resume` alongside it. Nothing emitted them: `createHost` only
ever sent `mute`, and the stub ad overlay sent nothing at all.

That was survivable while 2048 was the only game — it is turn-based, so an
overlay costs it nothing. It stops being survivable the moment a game has a
clock: a real-time game keeps ticking under the rewarded ad the player chose to
watch, and kills them while they watch it. Making every game defend itself
against that would push a platform rule into ten separate implementations, which
is the thing this SDK exists to prevent.

So `HostCore` now brackets both ad methods with `pause` before and `resume`
after, in a `finally`. Three consequences worth stating:

- **`resume` fires even when nothing was shown.** The frequency cap may
  suppress an interstitial, and a real ad network will report no fill. The host
  cannot know before it asks, so the contract is that a game's `resume` handler
  is idempotent: it restarts only a loop that `pause` actually stopped. That is
  a permanent property, not a v0 wart.
- **Events are addressed to one game.** `subscribeEvents` now takes a slug.
  `mute` still reaches every subscriber; `pause`/`resume` concern the game the
  host just covered, and broadcasting them would pause games that are merely
  mounted. The slug comes from the caller — the shell for a framed game, the
  local transport for a standalone one — never from the game.
- **Overlays are counted, not flagged.** A game with two ad calls in flight
  still sees exactly one `pause` and one `resume`.

The host still cannot see everything that obscures a game: a backgrounded tab,
a locked phone and the browser's own UI never reach it. Games with a clock
therefore still handle `visibilitychange` themselves. The rule is that the
*platform's* own overlays are the platform's job.

## 13. Offline stays, and the leaderboard is online-only at submit

The proposal was to drop offline support before leaderboards land, on the
grounds that runs finished with no network would be a sync problem. Rejected,
because the two features are not independent and the conflict is not where it
looks.

**Offline is the precondition of install, not a feature beside it.** Chrome
fires `beforeinstallprompt` — the custom prompt in `apps/shell/src/install.ts`
— only for a site with a service worker that answers `start_url` while offline.
Remove the service workers and Android loses the prompt entirely: what is left
is the browser menu's "Add to Home screen", which makes a shortcut that opens
in a tab with browser chrome, not a game in its own window. Per-game
installability is the whole product idea (CLAUDE.md), so it outranks a sync
worry about a milestone that has not started.

**The sync ambiguity does not come from offline.** Saves are local-first by
rule 5 whatever the network does, and a phone loses signal mid-run, gets its
tab killed, and evicts iOS storage after seven days regardless of whether a
service worker exists. Dropping offline removes the case where the game still
plays; it removes none of the cases where a write has to be reconciled later.

**Scores are the easy write.** A leaderboard entry is `max(best)` per player:
idempotent and order-independent. A queued submission replayed three times, or
three days late, lands on the same value. It needs a per-run idempotency key
and nothing resembling a merge.

So the line is drawn at what the data means, not at whether the app runs:

- **Offline covers the app shell, gameplay and the local save.** Exactly what
  the two service workers cache today. It does not grow to cover server state.
- **Anything server-backed is online-only at the moment it is submitted.** With
  no network the submission queues and the UI says so. It never renders a
  pending score as ranked.
- **Time-boxed content gets a freshness window.** This is the one real conflict,
  and Sudoku Daily has it in v0.1: a puzzle finished offline on the 8th and
  synced on the 11th. The client declares its `dayKey`; the server accepts it
  for ranking only within N hours of its own clock and otherwise records the run
  as unranked practice. Ranking always uses the server's receipt timestamp, and
  the client's clock is never trusted for it — the same defence a purely online
  submission needs anyway, since any client-sent score is forgeable.

One boundary worth stating because it will be reported as a bug: **"works
offline" is a promise on Android Chrome and iOS Safari only.** Third-party iOS
browsers are WKWebView shells with no service worker at all, so a game opened in
Chrome or Firefox on iOS is a plain web page and a reload with no network fails.
That is also why `install.ts` shows the Add to Home Screen overlay for iOS
Safari and stays silent in those browsers.

## 14. Install has a button, and an installed target is never offered again

The automatic offer from decision 13's implementation was the whole install
flow, and that was wrong in two directions at once. It kept offering an install
the player had already accepted — inside a browser tab `display-mode:
standalone` is false, so nothing in the page knew the app was on the home
screen — and a player who said "not now" once, or who never finished a run at a
moment the platform picked, had no way to ask for it.

So installation now has memory, and a door.

**Memory, keyed by manifest href.** That href is what identifies the target, so
answers do not leak between games: installing 2048 must not silence the hub's
offer, and the third game must not inherit what was said about the second.
`localStorage` holds `installed[]` and `snoozed{}` — per-device UI state, like
the theme, and losing it only means the offer returns.

**What counts as evidence of an install.** Chrome's `appinstalled` event, and
finding ourselves running standalone, which records the current target. On
Android an installed PWA shares the origin's storage with the browser, so the
note written by the installed app is what stops the browser tab offering again.
On iOS an installed app gets its own storage bucket and Safari never learns
anything; there the fortnight snooze set by "Got it" is the only defence. That
asymmetry is the reason the button is not optional.

**The button is shell chrome, not game code.** It sits in the game frame beside
the back button and in the hub's install section, reads the same state as the
offer, and renders nothing when the target cannot be installed — a button that
does nothing when tapped is worse than no button. A game ships no install code
and gains none: a game added to the catalog tomorrow gets the offer, the
button, the manifest swap and the per-target memory by existing.

Two consequences worth stating:

- **A sheet the player opened themselves ignores the snooze and does not extend
  it.** They asked; answering "close" is not the same as "not now".
- **Opening `/g/<slug>/` directly in a browser has no platform install
  affordance**, because the shell is not running there — only the browser's own
  menu. Fixing that means moving the install flow into the SDK host so the
  standalone path gets it too, which grows the platform surface, so it waits
  for a milestone that asks for it.
