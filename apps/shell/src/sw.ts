/// <reference lib="webworker" />
export {}; // module scope, so the `self` narrowing below does not clash with lib.webworker
declare const self: ServiceWorkerGlobalScope;

/**
 * Hub service worker. Hand-written; vite-plugin-pwa only fills in the file
 * list below at build time so it cannot drift from what actually shipped.
 */
const MANIFEST = self.__WB_MANIFEST;
const PRECACHE_URLS = MANIFEST.map((entry) => entry.url);
const CACHE = `shell-${PRECACHE_URLS.join(',').length}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('shell-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never answer for a game. Root scope reaches these URLs, but each game
  // owns its own service worker and its own offline story; serving the hub's
  // index.html here would break direct navigation to an installed game.
  if (url.pathname.startsWith('/g/')) return;

  if (request.mode === 'navigate') {
    // App-shell fallback for the hub's own routes only.
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then((cached) => cached ?? Response.error())),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request)),
  );
});
