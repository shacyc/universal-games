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
  the play surface, reduced motion. These are CLAUDE.md's portrait-first rule,
  and left to each game they will drift. Everything is wrapped in `:where()` so a game
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

## 15. Locale is mute, again: the shell owns it, games ship their own strings

`GameContext.locale` has existed since v0, filled from `navigator.language`, and
nothing ever read it. Adding real multi-language support forced the question of
what it is actually for, and there were two credible answers.

The rejected one is a translation service in the SDK — `sdk.t('game_over')`,
strings held by the platform. It is tempting because it centralises the thing a
solo developer will otherwise repeat, and it is wrong for this platform. It puts
every game's copy in a file the game does not own, so shipping a typo fix in
Snake means touching platform code; it makes the wire protocol carry strings,
which the per-game service workers then cache with the *shell's* release cycle
rather than the game's; and it grows the SDK surface by a method that every
future game must be supported on forever. The rule that the SDK stays small is
worth more than the duplication it costs.

So: **the platform owns the language, each game owns its words.** A game ships
`src/i18n/<locale>.ts` and picks from it. Nothing about translation crosses the
wire.

That leaves only the question of how a game learns the language, and mute had
already answered it. The shell owns the picker, so a game that read the
handshake once would render the old language until it was reloaded — exactly the
bug `onMuteChange` exists to prevent. Locale gets the same shape, deliberately
identical so neither can drift:

| | mute | locale |
| --- | --- | --- |
| in `GameContext` | `isMuted` | `locale` |
| host event | `mute` | `locale` |
| client method | `onMuteChange` | `onLocaleChange` |
| host setter | `setMuted` | `setLocale` |
| game helper | `watchMute` | `watchLocale` |

`watchLocale` does one thing `watchMute` does not: it resolves. `navigator.language`
is `en-US` or `vi-VN`, a game ships `en` and `vi`, and the match is exact tag →
primary subtag → fallback, case-insensitively. That is four lines of code and
every game would eventually get one of them wrong in a way that fails
silently — the game just renders English at a Vietnamese player and nobody
files a bug. So it lives in `@platform/sdk/game`, which decision 11 already
established as the place for a rule the docs state once.

The fallback is `supported[0]`, and it must be the language the game is
authored in. A missing translation then degrades to real text rather than to a
key on screen.

Three consequences worth stating:

- **`locale` is read once at host construction**, not per `context()` call.
  Re-reading `navigator.language` would quietly undo a language the player
  picked in the shell.
- **The PWA manifest stays single-language.** `name` and `description` are
  fetched once at install and frozen into the home-screen icon; the shell would
  have to serve a per-locale manifest *and* the player would have to reinstall
  to see it. English there, until a milestone asks otherwise.
- **No RTL.** Nothing in the initial locale set needs it, and honouring it means
  layout work in the shell and in every game. Adding an RTL language is a new
  decision, not a translation.

## 16. Where the shell's own words live, and where the picker lives

Decision 15 settled how a *game* gets its language. The shell then needed the
other half — its own strings, and the control that sets the language in the
first place — and three sub-decisions were not obvious.

**Catalog copy is per-locale inside `catalog.json`, not in the shell's locale
files.** A game's tagline and genre are read by the home page, so the tempting
shape is a lookup in `apps/shell/src/i18n/` keyed by slug. That breaks rule 3:
adding a game would stop being "one folder plus one catalog entry" and become a
shell edit that every parallel agent conflicts on — and the tagline of a game
nobody remembered to add would be a blank card, not an error. So `tagline` is
`{ "en": ..., "vi": ... }` in the entry itself, `pickText` resolves it, and
`apps/shell/test/i18n.test.ts` fails when a locale is missing.

`genre` went the other way and became a **key** (`puzzle`, not `Puzzle`), with
the label in the locale files. The filter chips compare genres; comparing
translated words would empty the grid the moment the player switched language.
The cost is that a new genre is a platform decision rather than something a game
can invent, which is the right side to err on for a set of six.

**The picker is in two places, not one.** The obvious home is the topbar. But
the shell's other screen is a full-window game, and going home to change
language unmounts the iframe — which would mean the `locale` event of decision
15 never actually gets exercised in the one situation it exists for. So language
is reachable over a running game too. (It started as the same segmented control
floating in the corner; decision 17 moved it into a settings sheet.)

**The choice is stored where both hosts can see it.** `arcade:locale` in
`localStorage`, written by the shell, read by `createStandaloneHost` — so a game
launched from its own installed icon, with no shell above it, opens in the
language picked in the hub. Games are same-origin by rule 1, so this needs no
sync and no SDK method; it is the same trick the install memory already uses,
with the same known hole (an installed PWA on iOS gets its own storage bucket
and starts from the browser's language).

> **Superseded by decision 20.** The language moved off the device and onto the
> user record. Everything else in this decision stands.

Two consequences worth stating:

- **Display fonts are opted into per language.** Silkscreen, the vintage theme's
  whole personality, ships no Vietnamese glyphs, and the browser's per-character
  fallback renders a heading half in one face and half in another with nothing
  thrown. So `--font-display` defaults to a face that covers everything and the
  pixel face is switched on for `:lang(en)` only. A locale added tomorrow looks
  plain rather than broken, and turning the pixel face on for it is a deliberate
  step after checking coverage.
- **Placeholder copy is a locale file too.** `apps/shell/src/demo/copy.en.ts`
  and `copy.vi.ts` sit beside `demoData.ts` and are deleted with it. Fake data
  that is only written in English is fake data that makes half the page look
  untranslated, and demo numbers are stored as numbers so they re-format with
  the language rather than staying `128,940` under Vietnamese words.

## 17. One settings sheet over a game, and the corner it lives in

> **Superseded by decision 18.** The sheet moved into the games. Kept because
> the corner problem it found is still real, and because the reasoning for
> *where* platform controls may sit over a game is what decision 18 leans on.

The chrome over a running game had grown to three floating things: a back arrow
top-left, a language toggle and an install button top-right. That is a browser
toolbar sitting on someone's game. It collapses to **one** button, and
everything the shell can do lives behind it.

**The sheet is the shell's, not the game's.** Both things in it are shell
capabilities: the platform's language (decision 15) and leaving the game. A game
drawing its own would need two SDK methods that do not exist — something like
`setLocale` and `exitToHub` — and both are the kind of surface every future game
then has to be supported on forever. It would also mean ten games each building
their own settings screen. The sheet costs no SDK surface at all.

**It wears the game's colours, from `catalog.json`.** A neutral panel over a
cream puzzle board looks like an error message. But the shell may not import a
game's stylesheet (rule 1), and adding a game may not mean editing the shell
(rule 3), so the palette is *data*: an optional `chrome` object of five values
on the catalog entry. A game that omits it gets a readable neutral. Deriving the
palette from the existing `themeColor` was rejected — one hex cannot tell you
what is readable on it, and a computed contrast failure is worse than an honest
default.

**Navigation, not a switch.** Language is a row that opens a page listing every
locale, with the current one checked; a segmented toggle is fewer taps for two
languages and unusable at five, and the sheet is where a language a player
cannot read must still be findable. Escape pops one level rather than closing,
because a sub-page that exits the whole sheet loses the player's place.

**The reserved corner is bottom-right.** This is the part that touches every
game, so it is stated in `@platform/sdk/game.css` as `--platform-chrome` rather
than left to each game to discover. Top-right was the first attempt and it
failed on the only game that exists: 2048's HUD runs to the right edge, and at
320px the button landed exactly on "New game" — a shell control stealing a tap
the game believed was its own. The HUD cannot give up 52px at that width without
reflowing, so the platform moved instead of the game. Bottom-right is also where
a thumb already is (rule 7), and a game's own primary control is usually centred
there rather than in the corner.

Two consequences worth stating:

- **The install icon is gone from the game screen.** It is a row in the sheet,
  shown only when the target is actually installable. The automatic prompt that
  appears after a finished run is untouched — that is the one that earns
  installs; the button was only ever the manual way back to it.
- **Standalone still has no settings at all.** A game opened from its own
  installed icon has no shell, so no language row and no way back to the hub.
  It inherits the language chosen in the hub (decision 16) and nothing more.
  Closing that means the SDK host drawing the sheet itself in standalone, which
  is the same shape as decision 14's unresolved install gap and waits for the
  same milestone.

## 18. Settings belong to the game, and the SDK grew two methods to allow it

Decision 17 put one settings sheet in the shell, floating over every game. This
reverses it: **every game ships its own settings screen, in its own style**, and
the shell draws nothing over a running game at all.

The owner's call, and the reasoning holds up. A sheet the shell draws can only
ever approximate the game underneath it — decision 17 tried, with a five-colour
palette in the catalog, and a palette is not a design. More importantly it left
a real hole: an installed game opened from its own icon has **no shell**, so it
had no way to change language and no way back to the hub. Decision 17 recorded
that as an accepted gap. Moving the screen into the game closes it, because the
screen ships with the game and is therefore on screen in both modes.

**The cost is two new SDK methods**, and this is the milestone's only exception
to "no new SDK method":

| Method | What the host does |
| --- | --- |
| `setLocale(tag)` | adopts the language, emits `locale` to every mounted game, tells the embedder to persist and re-render |
| `exitToHub()` | the shell navigates to `/`; standalone, the browser does |

Both meet the bar CLAUDE.md sets — every game needs them, not one — and both are
answers to a question the game is not allowed to decide for itself. `setLocale`
notably does **not** hand the game the language: the game asks, and learns the
outcome through `onLocaleChange` like any other change. That single path is what
keeps a language picked in a game's settings, one picked in the hub, and one
restored from a previous visit from ever disagreeing, and it is why the host
holds `adoptLocale` as the one place the value changes whoever asked.

`exitToHub` returns `UNKNOWN_METHOD` from a host with no `onExitToHub`. That is
the truth rather than a silent success — a host embedded somewhere with no hub
is a real future case, and a game must be able to tell.

Consequences:

- **The shell's `GameFrame` is a frame and its wiring, nothing else.** No back
  button, no picker, no install icon. The install *prompt* still appears on its
  own after a finished run; only the manual button went, and it went into each
  game's settings screen as the games get one.
- **The catalog's `chrome` palette is gone**, along with `--platform-chrome` in
  `game.css`. Both existed only to make decision 17's sheet fit over a game, and
  a game styling its own screen needs neither.
- **Ten games will each build a settings screen.** That is the honest price, and
  it is bounded: the two required rows are four lines of glue each, and
  `building-a-game.md` §5 *Settings* states the rules that are easy to get wrong
  once, rather than each game rediscovering them.

## 19. One choice, every surface: store the tag verbatim, resolve at render

> **Half superseded by decision 20.** Storing the tag verbatim and resolving at
> render is unchanged and is the part that mattered. The `localStorage` home and
> the cross-tab `storage` event are gone with it.

The requirement, stated plainly by the owner: **the language follows the
player.** Set it once — in the hub, inside any game, in any tab — and everything
else follows. Auditing against that found two places where it did not hold.

**The hub was narrowing the choice on the way into storage.** The shell resolved
the player's tag against its own `SUPPORTED` list *before* persisting it and
before handing it to the host. That made the hub's translation status a silent
ceiling on the whole platform: a game shipping `fr` before the hub had been
translated would have its language overwritten with `en` the moment the shell
wrote the preference, with nothing logged and nothing to notice.

So the rule is now explicit and lives in one place: **what is stored is the
player's tag, verbatim.** Resolution happens where words are rendered, never
where the choice is written. The shell keeps two values — `choice`, which is
persisted and broadcast, and `rendered`, which is `choice` resolved against what
the *shell* ships and is used for nothing but picking its own strings. The hub
reading English while a game reads French is the correct outcome, not a bug, and
`resolveLocale` is what makes it an ordinary one.

The hub's picker highlights `choice`, not `rendered`. If a game set a language
the hub does not offer, nothing is highlighted — which is the truth, and better
than telling the player they picked English.

**A second tab did not follow.** The hub in one tab and an installed game in
another are the same person, and `localStorage` was written but never watched.
`watchLocalePreference` closes it with the `storage` event, which browsers fire
only in the tabs that did *not* write — so it cannot loop with the write beside
it. Both the shell's store and `createStandaloneHost` subscribe, and a change
propagates live: verified with a hub tab and a standalone `/g/2048/` tab, in
both directions, with `performance.getEntriesByType('navigation').length === 1`
on the receiving side to show nothing reloaded.

Two consequences worth stating:

- **A storage-driven change is adopted but not written back.** Rewriting the key
  we were just told about is noise at best, and a loop on any browser that
  echoes a tab's own writes.
- **iOS installed PWAs still stand apart.** Their storage bucket is their own,
  so they neither see another tab's change nor publish theirs. Same boundary as
  the install memory, and not fixable from here.

## 20. The language is on the user, not on the device

The owner's framing, and it is the right one: **a language belongs to the
player.** So it is a field on the user record, and fetching the user at boot is
what tells a surface which language to be in. There is no device-local key
beside it.

That deletes a whole class of problem rather than solving it. `arcade:locale`
was a second source of truth that had to be kept in step with everything else
about the player, and every place that read or wrote it was a place the two
could drift. `getUser()` already existed, every surface already calls it, and
`locale` rides along.

It also makes the eventual server trivial. `createIdbStorage` is local-first by
rule 5 and becomes the API client; when it does, the language arrives from the
server with the rest of the record and **nothing in the shell or in any game
changes**. A device-local key would have needed a migration and a merge rule for
"which device is right".

**One place writes it.** `adoptLocale` in `createHost` calls
`storage.saveUserLocale`, whichever host is running and whoever asked — the
hub's picker, a game's settings screen, a future server push. Neither embedder
can forget to, and the two cannot persist it differently. A write that fails is
logged and nothing else: the change still stands for this session, and it is the
*next* boot that will have forgotten it. Nothing the player did failed, so
nothing is shown to them.

**Reading it is awaited before the first render.** `hydrateLocale()` in the
shell and the `await` inside `createStandaloneHost` both fetch the record before
anything paints, so the hub never renders one language and swaps, and no game
has been mounted yet to be told the wrong one. The shell's boot moved into an
async `boot()` for it — top-level `await` is not in the es2020/Safari 14 build
target, and raising the target for the whole app to save one function is not a
trade worth making.

Two consequences, one of them a real loss:

- **Cross-tab changes are no longer live.** Decision 19 propagated them with the
  `storage` event; IndexedDB has no equivalent. A second tab now picks the
  language up the next time it loads. Within a document everything is still
  live — every mounted game gets the `locale` event as before. Restoring
  liveness means a `BroadcastChannel`, which is a small addition, and it is not
  here because nobody has asked for it and an unused mechanism is a liability.
- **iOS installed PWAs still stand apart**, and will until the record is
  genuinely server-side. Their storage bucket is their own, so their user record
  is a different anonymous user. That is now visibly the same problem as "this
  player has no account", which is the honest shape of it.
