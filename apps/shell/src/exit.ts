/**
 * The shell's answer to a game asking to leave.
 *
 * A game reaches this through `sdk.exitToHub()`, which is a host request, not a
 * DOM call — so it works identically inside the iframe and inside an installed
 * game with no shell at all. The host is a module singleton and navigation is
 * React's, so the two meet here: `GameFrame` registers while a game is mounted,
 * `host.ts` calls it.
 *
 * One handler at a time on purpose. Exactly one game is ever mounted, and a
 * second registration means a bug worth failing loudly on rather than a queue.
 */
let handler: (() => void) | null = null;

export function onExitRequest(next: () => void): () => void {
  handler = next;
  return () => {
    if (handler === next) handler = null;
  };
}

export function requestExitToHub(): void {
  if (!handler) {
    // Nothing is mounted: the request raced a route change. Doing nothing is
    // right — the player is already out.
    console.debug('[shell] exitToHub with no game mounted');
    return;
  }
  handler();
}
