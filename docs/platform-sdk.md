# Platform SDK

The contract between the shell (host) and each game (client). This is the most
important interface in the project: it is what lets game #10 be written in a
couple of days, and what lets the ad network be swapped without touching any
game.

## Shape

`packages/sdk` ships two entry points:

- `@platform/sdk/client` — imported by games. Sends `postMessage` requests to
  the parent frame, returns promises.
- `@platform/sdk/host` — imported by the shell. Receives messages, performs the
  real work (storage, ads, currency), replies.

The transport is `window.postMessage` between same-origin frames. Every message
carries an incrementing `id` so replies can be matched to requests.

```ts
type Request  = { v: 1; id: number; method: string; params?: unknown };
type Response = { v: 1; id: number; ok: true; data: unknown }
              | { v: 1; id: number; ok: false; error: { code: string; message: string } };
```

Validate `event.origin` against the shell origin on both sides. Ignore anything
that does not match, and ignore messages without `v: 1`.

## v0 interface

Implement exactly this. Do not add methods speculatively.

```ts
interface PlatformSDK {
  ready(): Promise<GameContext>;

  // identity
  getUser(): Promise<{ id: string; isAnonymous: boolean }>;

  // persistence — the game passes a plain JSON-serialisable object
  load<T>(): Promise<T | null>;
  save<T>(state: T): Promise<void>;

  // ads — v0 returns a stubbed result, call sites must be real
  showRewarded(placement: string): Promise<boolean>;  // true = watched to completion
  showInterstitial(placement: string): Promise<void>;

  // lifecycle — the game reports, the platform decides what to do
  gameStart(): void;
  gameOver(payload: { score?: number }): void;

  // analytics
  track(event: string, props?: Record<string, string | number | boolean>): void;

  // driven by the game's own settings screen — the game asks, the platform acts
  setLocale(locale: string): void;
  exitToHub(): void;

  // platform state the game subscribes to — never owns
  onMuteChange(listener: (isMuted: boolean) => void): () => void;
  onLocaleChange(listener: (locale: string) => void): () => void;
}

interface GameContext {
  slug: string;
  locale: string;
  isInstalled: boolean;   // running as an installed PWA
  isMuted: boolean;       // platform-level sound preference
}
```

Reserved for later milestones, not implemented in v0:
`currency.get/spend`, `inventory.has`, `submitScore`, `getLeaderboard`,
`hasPass`, `notify`.

## Behaviour rules

**`save` is debounced by the host**, not the game. A game may call `save` on
every move; the host coalesces writes (trailing debounce ~1s, plus an immediate
flush on `visibilitychange: hidden` and on `pagehide`). Games must not implement
their own debouncing.

**`save` is local-first.** Host writes to IndexedDB immediately, then syncs to
the server when a user is signed in (v1+). `load` returns local state
immediately; server reconciliation happens later.

**`showRewarded` never throws.** Ad not available, user closed early, network
failure — all resolve `false`. Games must handle `false` gracefully and never
punish the player for it. A rewarded call site is always optional value:
the game must be completable without ever watching one.

**`showInterstitial` is a request, not a command.** The host applies frequency
capping (no interstitial within 90s of the previous one, none in the first
session, none for Pass holders). The game just calls it at legal moments; the
host decides. Legal moments are between sessions only, never mid-input.

**`gameOver` is the platform's hook.** The host uses it to decide about
interstitials, cross-promotion of other games, and the install prompt. Games
must call it exactly once per finished run.

**Sound.** Games read `isMuted` from context and subscribe to changes; the
platform owns the mute toggle so it is consistent across every game.

**Language.** The same shape, for a related reason: the platform owns the
language, games read `locale` and subscribe to changes. A game draws a picker
but never *holds* the value — it can be changed from the hub, or from another
mounted game, or restored from a previous visit. `locale` is a BCP 47 tag
(`en`, `en-US`, `vi`), so a game resolves it against the locales it ships —
use `watchLocale` from `@platform/sdk/game`, which delivers the current value
first and then every change, already resolved. A game never reads
`navigator.language`.

Translation itself does **not** cross the wire: each game ships its own strings
under `src/i18n/`. See decision 15 in `docs/sdk-decisions.md` for why the SDK
has no `t()`.

**Every game ships a settings screen**, holding at least the language and the
way back to the hub (CLAUDE.md rule 7, decision 18). It acts through two methods:

```ts
sdk.setLocale('vi');   // ask the platform to change language
sdk.exitToHub();       // leave the game; this document is on its way out
```

`setLocale` does not hand the game the language. The host adopts it, tells every
mounted game through `onLocaleChange`, and remembers it — so a language picked
in a game's settings, one picked in the hub's topbar and one restored from a
previous visit can never disagree. Re-render from the event, never from the
click.

`exitToHub` is a navigation: the shell takes over when the game is embedded, the
browser when it is installed and there is no shell. Save before calling it.

The hub keeps a picker of its own in its topbar. The choice is remembered in
`localStorage` under `arcade:locale`, which `createStandaloneHost` also reads, so
a game opened from its own installed icon starts in the language picked in the
hub rather than in the browser's.

Two small pieces of this are exported outside `@platform/sdk/game`, because the
shell needs the identical behaviour: `resolveLocale` is on the package root
(and re-exported from `/game` and `/host`), and `readLocalePreference` /
`writeLocalePreference` are on `/host`.

## Install prompt ownership

The shell owns installation, not the game.

- Capture `beforeinstallprompt` in the shell, store the deferred event.
- Show the custom install CTA only after a meaningful moment: second
  `gameOver`, or a returning session. Never on first load.
- iOS: no `beforeinstallprompt`. Detect iOS Safari + not standalone, show an
  overlay explaining Share → Add to Home Screen.
- When a game route is open, the manifest served for that route is the game's
  own, so the install installs *that game*, not the hub.

## Stub implementations for v0

- `showRewarded` — render a real modal ("Watch ad to continue"), a 3 second
  countdown, a close button. Resolves `true` on completion, `false` on close.
  This exercises the real UX and the real timing.
- `showInterstitial` — same but non-skippable for 3 seconds, then auto-close.
- `track` — `console.debug` plus an in-memory buffer. No network.
- `getUser` — generate a UUID on first run, persist in IndexedDB,
  `isAnonymous: true`.

Keeping the call sites real from day one is the whole point: when a real ad
network is plugged in at v1, no game code changes.

## Testing

- The SDK client must work with a mock host so games can run standalone at
  `pnpm dev` inside a game folder without booting the shell.
- Contract tests: for each method, one test asserting the message shape and one
  asserting the failure path resolves rather than rejects.
