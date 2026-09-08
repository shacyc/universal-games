import { StorageError } from '../core.js';
import { idb } from './idb.js';
import type { StorageAdapter } from './types.js';

const USER_KEY = 'user';
const saveKey = (slug: string): string => `save:${slug}`;

/**
 * Local-first storage.
 *
 * Note the absence of a debounce. The SDK doc debounces `save` ~1s with a
 * flush on `pagehide`, but IndexedDB writes are async and routinely lost
 * during page teardown — that flush is exactly the write most likely to
 * vanish, and losing it means losing the run. These payloads are well under a
 * kilobyte a few times per second, so the local write goes out immediately and
 * the coalescing belongs on the server sync instead (v1+).
 */
export function createIdbStorage(): StorageAdapter {
  let userPromise: Promise<{ id: string; isAnonymous: boolean }> | undefined;

  return {
    getUser() {
      userPromise ??= (async () => {
        const existing = await idb.get<{ id: string; isAnonymous: boolean }>(USER_KEY);
        if (existing) return existing;
        const user = { id: crypto.randomUUID(), isAnonymous: true };
        await idb.set(USER_KEY, user);
        return user;
      })().catch((cause: unknown) => {
        userPromise = undefined; // let a later call retry
        throw new StorageError('Could not read or create the anonymous user', { cause });
      });
      return userPromise;
    },

    async load(slug) {
      try {
        return (await idb.get(saveKey(slug))) ?? null;
      } catch (cause) {
        throw new StorageError(`Could not load save for "${slug}"`, { cause });
      }
    },

    async save(slug, state) {
      try {
        await idb.set(saveKey(slug), state);
      } catch (cause) {
        throw new StorageError(`Could not save state for "${slug}"`, { cause });
      }
    },
  };
}
