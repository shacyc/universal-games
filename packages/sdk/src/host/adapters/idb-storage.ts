import { StorageError } from '../core.js';
import { idb } from './idb.js';
import type { StorageAdapter, User } from './types.js';

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
  let userPromise: Promise<User> | undefined;

  function readUser(): Promise<User> {
    userPromise ??= (async () => {
      const existing = await idb.get<Partial<User>>(USER_KEY);
      if (existing?.id !== undefined) {
        // `locale` is newer than the first records written; an older one simply
        // has not chosen yet.
        return {
          id: existing.id,
          isAnonymous: existing.isAnonymous ?? true,
          locale: existing.locale ?? null,
        };
      }
      const user: User = { id: crypto.randomUUID(), isAnonymous: true, locale: null };
      await idb.set(USER_KEY, user);
      return user;
    })().catch((cause: unknown) => {
      userPromise = undefined; // let a later call retry
      throw new StorageError('Could not read or create the anonymous user', { cause });
    });
    return userPromise;
  }

  return {
    getUser: readUser,

    async saveUserLocale(locale) {
      try {
        const user = await readUser();
        if (user.locale === locale) return;
        const next: User = { ...user, locale };
        await idb.set(USER_KEY, next);
        // Keep the cached promise honest, or the next getUser() in this tab
        // hands back the language the player just changed away from.
        userPromise = Promise.resolve(next);
      } catch (cause) {
        throw new StorageError('Could not record the language on the user', { cause });
      }
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
