import { idb } from './idb.js';

const KEY = 'sessions';

export interface SessionCounter {
  /** Synchronous so ad policy can consult it inline. */
  isFirstSession(): boolean;
}

/**
 * Counts how many sessions this device has had. Starts pessimistic — until the
 * stored count comes back we report "first session", which suppresses
 * interstitials. Erring towards showing fewer ads is the right default.
 */
export function createSessionCounter(): SessionCounter {
  let count = 1;

  void (async () => {
    try {
      const stored = await idb.get<number>(KEY);
      count = (typeof stored === 'number' ? stored : 0) + 1;
      await idb.set(KEY, count);
    } catch {
      /* storage unavailable: stay at 1 and show no interstitials */
    }
  })();

  return { isFirstSession: () => count <= 1 };
}
