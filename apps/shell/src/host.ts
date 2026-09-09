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

export const host: HostCore = createHost({
  storage: createIdbStorage(),
  ads: withFrequencyCap(createStubAds(), { isFirstSession: () => sessions.isFirstSession() }),
  analytics: withInstallOffer(createBufferedAnalytics()),
  // The shell has already resolved the player's language by the time this
  // module loads; without it the host would fall back to `navigator.language`
  // and the first game mounted would open in the browser's language rather
  // than the chosen one.
  context: { locale: getLocale() },
  // A game's own settings screen changed the language. The store persists it
  // and re-renders the hub; the host has already told every mounted game, and
  // the store calling back into `host.setLocale` is a no-op at the same value.
  onLocaleChanged: setLocale,
  onExitToHub: requestExitToHub,
});

/**
 * The hub's own picker changed the language. It runs once, at module load, and
 * stays for the life of the tab: a game mounted an hour from now still gets the
 * language picked before it existed, through the handshake context.
 */
subscribeLocale(() => host.setLocale(getLocale()));
