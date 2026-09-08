/**
 * Registers the hub's service worker at root scope.
 *
 * Root scope covers `/g/*` too, but a game's own registration at
 * `/g/<slug>/sw.js` is narrower and wins for those URLs. The hub SW must still
 * refuse to answer `/g/` navigations itself — see the fallback rule in sw.ts —
 * or the first visit to a game (before its SW registers) gets the hub's
 * index.html instead of the game.
 */
export function registerShellServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error: unknown) => {
      console.debug('[shell] service worker registration failed', error);
    });
  });
}
