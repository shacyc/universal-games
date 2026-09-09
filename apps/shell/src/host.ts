import {
  createBufferedAnalytics,
  createHost,
  createIdbStorage,
  createSessionCounter,
  createStubAds,
  withFrequencyCap,
  type AnalyticsAdapter,
  type HostCore,
} from '@platform/sdk/host';
import { requestExitToHub } from './exit.js';
import { getLocale, setLocale, subscribeLocale } from './i18n/locale.js';
import { offerInstall } from './install.js';

/**
 * One host for the whole shell. Games are told apart by the slug the shell
 * passes when it mounts their iframe, never by anything they send.
 *
 * The adapters here are identical to the ones the standalone host uses when a
 * game runs installed with no shell above it — only the transport differs.
 */
const sessions = createSessionCounter();

/**
 * Picks the moment to offer the install.
 *
 * `gameOver` is already the platform's hook (docs/platform-sdk.md), and it
 * reaches the host as a `run_ended` event, so listening for it here costs no
 * new SDK surface and no game knows the shell is counting.
 *
 * Never on first load: the second finished run, or the first run of a session
 * the player came back for. Both mean someone who has actually played.
 */
function withInstallOffer(inner: AnalyticsAdapter): AnalyticsAdapter {
  let finishedRuns = 0;
  return {
    track(slug, event, props) {
      inner.track(slug, event, props);
      if (event !== 'run_ended') return;
      finishedRuns += 1;
      if (finishedRuns >= 2 || !sessions.isFirstSession()) offerInstall();
    },
  };
}

/**
 * Hoisted so the language read below and the host share one adapter — and, once
 * the API lands, one fetch of the player's record rather than two.
 */
const storage = createIdbStorage();

export const host: HostCore = createHost({
  storage,
  ads: withFrequencyCap(createStubAds(), { isFirstSession: () => sessions.isFirstSession() }),
  analytics: withInstallOffer(createBufferedAnalytics()),
  // The store's guess at module-load time — `navigator.language`. `hydrateLocale`
  // below replaces it with the player's own before anything renders, and the
  // host is told through the subscription at the bottom of this file.
  context: { locale: getLocale() },
  // The language changed, here or inside a game. The host has already recorded
  // it on the user and told every mounted game; this only re-renders the hub.
  // The store calling back into `host.setLocale` is a no-op at the same value.
  onLocaleChanged: setLocale,
  onExitToHub: requestExitToHub,
});

/**
 * The hub's own picker changed the language. It runs once, at module load, and
 * stays for the life of the tab: a game mounted an hour from now still gets the
 * language picked before it existed, through the handshake context.
 */
subscribeLocale(() => host.setLocale(getLocale()));

/**
 * Reads the player's language off their user record, before the first render.
 *
 * A language belongs to the player, not to the device, so fetching the user is
 * what tells the hub which language to be in — there is no separate key to keep
 * in step, and when the API lands this same read comes from the server with
 * nothing here to change.
 *
 * `main.tsx` awaits it, so the hub never paints in one language and swaps to
 * another, and no game has been mounted yet to be told the wrong one. A read
 * that fails leaves the browser's language standing: a worse guess, not a
 * broken page.
 */
export async function hydrateLocale(): Promise<void> {
  try {
    const user = await storage.getUser();
    if (user.locale !== null) setLocale(user.locale);
  } catch (error) {
    console.debug('[shell] could not read the language off the user', error);
  }
}
