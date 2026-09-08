/// <reference lib="webworker" />
export {}; // module scope, so the `self` narrowing below does not clash with lib.webworker
declare const self: ServiceWorkerGlobalScope;

/**
 * This game's service worker, scoped to `/g/2048/`. It caches only this
 * game's own build, which is what makes the game installable and playable
 * offline independently of the hub.
 */
const MANIFEST = self.__WB_MANIFEST;
const PRECACHE_URLS = MANIFEST.map((entry) => entry.url);
const CACHE = `2048-${PRECACHE_URLS.join(',').length}`;
const SCOPE = '/g/2048/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('2048-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(SCOPE)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(`${SCOPE}index.html`).then((cached) => cached ?? Response.error()),
      ),
    );
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
});
