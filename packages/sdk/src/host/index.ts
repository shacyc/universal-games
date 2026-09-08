export { createHost, StorageError, type HostCore, type HostDeps } from './core.js';
export { attachFrameHost, type AttachFrameHostOptions } from './frame-host.js';
export { createStandaloneHost } from './standalone.js';

export { createIdbStorage } from './adapters/idb-storage.js';
export { createStubAds } from './adapters/stub-ads.js';
export { withFrequencyCap, type FrequencyCapOptions } from './adapters/frequency-cap.js';
export { createBufferedAnalytics, type BufferedAnalytics, type TrackedEvent } from './adapters/analytics.js';
export { createSessionCounter } from './adapters/sessions.js';
export { createAdOverlay, type AdOverlay } from './overlay/ad-overlay.js';
export type { AdsAdapter, AnalyticsAdapter, StorageAdapter } from './adapters/types.js';
