import type { CatalogGame } from './catalog.js';

/**
 * Install prompt ownership, per docs/platform-sdk.md: the shell owns
 * installation, not the game. A game never learns any of this — it calls
 * `gameOver`, and what that means for install is a platform decision made here.
 * Adding a game to the catalog gets it an install flow with no game-side code,
 * which is the point.
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
 *
 * Everything remembered here is keyed by manifest href, because that is what
 * identifies the target: installing 2048 must not silence the hub's offer, and
 * a third game must not inherit the answer given about a second.
 */

/** Chrome-only, still not in lib.dom. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallMethod = 'prompt' | 'ios';

export interface InstallState {
  /** The sheet is on screen. */
  open: boolean;
  /** Installing this target is possible right now — what the button keys off. */
  available: boolean;
  /** `prompt` = we have a real deferred event; `ios` = show the instructions. */
  method: InstallMethod;
  /** What gets installed if they say yes. */
  target: string;
  /** The player opened the sheet themselves rather than being offered it. */
  manual: boolean;
}

interface Memory {
  /** Manifests known to be installed on this device. */
  installed: string[];
  /** Manifest -> the time at which it may be offered again. */
  snoozed: Record<string, number>;
}

const HUB_MANIFEST = '/manifest.webmanifest';
const HUB_NAME = 'Arcade';
const MEMORY_KEY = 'arcade:install';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

/** Keyed by manifest href: going home and back must not lose the hub's event. */
const deferred = new Map<string, BeforeInstallPromptEvent>();
const listeners = new Set<(state: InstallState) => void>();

let manifest = HUB_MANIFEST;
let targetName = HUB_NAME;
/** A meaningful moment has happened. Never true on first load. */
let offered = false;
let manual = false;
let memory = readMemory();
let snapshot: InstallState = compute();

function compute(): InstallState {
  const method: InstallMethod = isIosSafari() ? 'ios' : 'prompt';
  // iOS can always be told how; Android needs Chrome to have offered a prompt
  // for this exact manifest.
  const ready = method === 'ios' || deferred.has(manifest);
  const available = ready && !memory.installed.includes(manifest);
  const snoozed = Date.now() < (memory.snoozed[manifest] ?? 0);
  return {
    open: available && (manual || (offered && !snoozed)),
    available,
    method,
    target: targetName,
    manual,
  };
}

function publish(): void {
  const next = compute();
  const same =
    next.open === snapshot.open &&
    next.available === snapshot.available &&
    next.method === snapshot.method &&
    next.target === snapshot.target &&
    next.manual === snapshot.manual;
  if (same) return;
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

  if (href !== manifest) {
    // Leaving a target closes whatever was being said about it.
    offered = false;
    manual = false;
  }

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
 * A meaningful moment happened and the CTA may show. Idempotent, and silent for
 * a target that is already installed or was answered recently — the button
 * stays available in both cases.
 */
export function offerInstall(): void {
  if (offered) return;
  offered = true;
  publish();
}

/** The player pressed the install button. Ignores the snooze; they asked. */
export function openInstall(): void {
  manual = true;
  publish();
}

/** Android: hand the deferred event back to Chrome. */
export async function promptInstall(): Promise<void> {
  const event = deferred.get(manifest);
  if (!event) return;
  // A deferred prompt is single-use whatever the player picks.
  deferred.delete(manifest);
  close();

  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    // Saying no to the system dialog is a no to the whole idea for a while,
    // not just to this one moment. Accepting is answered by `appinstalled`.
    if (outcome === 'dismissed') snooze();
  } catch (error) {
    console.debug('[install] prompt failed', error);
  }
}

/**
 * "Not now", and on iOS the only way to close the overlay. A sheet the player
 * opened themselves just closes; one the platform offered also stops the
 * offering for a fortnight.
 */
export function dismissInstall(): void {
  if (!manual) snooze();
  close();
}

export function subscribeInstall(listener: (state: InstallState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getInstallState(): InstallState {
  return snapshot;
}

function close(): void {
  offered = false;
  manual = false;
  publish();
}

function snooze(): void {
  writeMemory({ ...memory, snoozed: { ...memory.snoozed, [manifest]: Date.now() + SNOOZE_MS } });
}

function markInstalled(href: string): void {
  if (memory.installed.includes(href)) return;
  writeMemory({ ...memory, installed: [...memory.installed, href] });
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
  markInstalled(manifest);
});

// Running standalone means this target is installed, and that is the only
// evidence we ever get. On Android the installed app shares the browser's
// storage for the origin, so writing it here is what stops the browser tab
// offering an install the player already accepted. On iOS an installed app has
// its own storage bucket and the note never reaches Safari; there the snooze
// set by "Got it" is the whole defence, which is why the button exists.
if (detectStandalone()) markInstalled(manifest);

function readMemory(): Memory {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(MEMORY_KEY) ?? 'null');
    if (typeof raw !== 'object' || raw === null) return { installed: [], snoozed: {} };
    const value = raw as Partial<Memory>;
    return {
      installed: Array.isArray(value.installed) ? value.installed.filter((v) => typeof v === 'string') : [],
      snoozed: typeof value.snoozed === 'object' && value.snoozed !== null ? value.snoozed : {},
    };
  } catch {
    return { installed: [], snoozed: {} };
  }
}

function writeMemory(next: Memory): void {
  memory = next;
  try {
    // Per-device UI state, like the theme. Losing it only means the offer comes
    // back — no game state lives here (rule 5).
    window.localStorage.setItem(MEMORY_KEY, JSON.stringify(next));
  } catch {
    /* private mode or blocked storage: it just does not persist */
  }
  publish();
}

function detectStandalone(): boolean {
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
