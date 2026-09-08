/**
 * Minimal IndexedDB key/value store. Hand-rolled rather than pulling in a
 * wrapper: one object store, three operations, no migrations.
 */
const DB_NAME = 'platform';
const STORE = 'kv';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | undefined;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('indexedDB.open failed'));
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = work(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
        tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
      }),
  );
}

export const idb = {
  get: <T>(key: string): Promise<T | undefined> => run<T | undefined>('readonly', (store) => store.get(key)),
  set: (key: string, value: unknown): Promise<unknown> => run('readwrite', (store) => store.put(value, key)),
};
