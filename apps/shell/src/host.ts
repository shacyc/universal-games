import {
  createBufferedAnalytics,
  createHost,
  createIdbStorage,
  createSessionCounter,
  createStubAds,
  withFrequencyCap,
  type HostCore,
} from '@platform/sdk/host';

/**
 * One host for the whole shell. Games are told apart by the slug the shell
 * passes when it mounts their iframe, never by anything they send.
 *
 * The adapters here are identical to the ones the standalone host uses when a
 * game runs installed with no shell above it — only the transport differs.
 */
const sessions = createSessionCounter();

export const host: HostCore = createHost({
  storage: createIdbStorage(),
  ads: withFrequencyCap(createStubAds(), { isFirstSession: () => sessions.isFirstSession() }),
  analytics: createBufferedAnalytics(),
});
