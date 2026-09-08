import type { CatalogGame } from './catalog.js';

/**
 * Install prompt ownership, per docs/platform-sdk.md: the shell owns
 * installation, not the game. A game never learns any of this — it calls
 * `gameOver`, and what that means for install is a platform decision made here.
 *
 * Three things have to line up for the install to be the *game's* and not the
 * hub's:
 *
 * 1. While a game route is open, `<link rel="manifest">` points at that game's
 *    own manifest, whose `scope`/`start_url` are `/g/<slug>/`.
 * 2. The deferred `beforeinstallprompt` is only used for the manifest that was
 *    in effect when it arrived. Chrome re-runs its installability check when
 *    the manifest URL changes and fires a fresh event; until that event lands
 *    the Android CTA stays hidden, because showing the old one would install
 *    the hub while the player is looking at a game.
 * 3. iOS has no `beforeinstallprompt` at all, so there it is an instructions
 *    overlay for Share -> Add to Home Screen — which installs whatever the
 *    current manifest describes, i.e. the same target.
 */

/** Chrome-only, still not in lib.dom. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallMethod = 'prompt' | 'ios';

export interface InstallState {
  /** The CTA is on screen. */
  open: boolean;
  /** `prompt` = we have a real deferred event; `ios` = show the instructions. */
  method: InstallMethod;
  /** What gets installed if they say yes. */
  target: string;
}

const HUB_MANIFEST = '/manifest.webmanifest';
const HUB_NAME = 'Arcade';
const DISMISS_KEY = 'arcade:install-dismissed';
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

/** Keyed by manifest href: going home and back must not lose the hub's event. */
const deferred = new Map<string, BeforeInstallPromptEvent>();
const listeners = new Set<(state: InstallState) => void>();

let manifest = HUB_MANIFEST;
let targetName = HUB_NAME;
/** A meaningful moment has happened. Never true on first load. */
let offered = false;
let installed = detectInstalled();
let dismissedAt = readDismissed();
let snapshot: InstallState = compute();

function compute(): InstallState {
  const method: InstallMethod = isIosSafari() ? 'ios' : 'prompt';
  const ready = method === 'ios' || deferred.has(manifest);
  const muted = installed || Date.now() - dismissedAt < DISMISS_MS;
  return { open: offered && ready && !muted, method, target: targetName };
}

function publish(): void {
  const next = compute();
  if (next.open === snapshot.open && next.method === snapshot.method && next.target === snapshot.target) {
    return;
  }
  snapshot = next;
  for (const listener of listeners) listener(next);
}

/**
 * Points the document at the manifest for what the player is looking at: a
 * game's own manifest on a game route, the hub's on the hub.
 */
export function setInstallTarget(game: CatalogGame | null): void {
  const href = game ? `/g/${game.slug}/manifest.webmanifest` : HUB_MANIFEST;
  targetName = game ? game.title : HUB_NAME;

  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (link && link.getAttribute('href') !== href) link.setAttribute('href', href);

  // The installed window's title bar and the browser chrome should already be
  // the game's colour when it is what gets installed.
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', game ? game.themeColor : hubThemeColor);

  manifest = href;
  publish();
}

/**
 * A meaningful moment happened and the CTA may show. Idempotent: the moment
 * that unlocks it is not the moment it necessarily becomes visible — on
 * Android it also needs Chrome's event for the current manifest.
 */
export function offerInstall(): void {
  if (offered) return;
  offered = true;
  publish();
}

/** Android: hand the deferred event back to Chrome. */
export async function promptInstall(): Promise<void> {
  const event = deferred.get(manifest);
  if (!event) return;
  // A deferred prompt is single-use whatever the player picks.
  deferred.delete(manifest);
  offered = false;
  publish();

  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    // Saying no to the system dialog is a no to the whole idea for a while,
    // not just to this one moment.
    if (outcome === 'dismissed') dismiss();
  } catch (error) {
    console.debug('[install] prompt failed', error);
  }
}

/** "Not now", and on iOS the only way to close the overlay. */
export function dismiss(): void {
  offered = false;
  dismissedAt = Date.now();
  try {
    // A per-device UI preference, like the theme. Losing it only means the
    // CTA is offered again — no game state lives here (rule 5).
    window.localStorage.setItem(DISMISS_KEY, String(dismissedAt));
  } catch {
    /* private mode or blocked storage: it just does not persist */
  }
  publish();
}

export function subscribeInstall(listener: (state: InstallState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getInstallState(): InstallState {
  return snapshot;
}

const hubThemeColor =
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content ?? '#1c1b1a';

window.addEventListener('beforeinstallprompt', (event) => {
  // Without this Chrome shows its own mini-infobar and the CTA below never
  // gets a say in when to ask.
  event.preventDefault();
  deferred.set(manifest, event as BeforeInstallPromptEvent);
  publish();
});

window.addEventListener('appinstalled', () => {
  deferred.delete(manifest);
  installed = true;
  publish();
});

function readDismissed(): number {
  try {
    const stored = Number(window.localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(stored) ? stored : 0;
  } catch {
    return 0;
  }
}

function detectInstalled(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari predates display-mode and still reports this instead.
  return (window.navigator as { standalone?: boolean }).standalone === true;
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ claims to be a Mac; the touch points give it away.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isIos) return false;
  // Every other iOS browser is a WebKit shell with no Add to Home Screen item,
  // so pointing at the Share menu there would be a lie.
  return !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}
