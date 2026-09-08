import type { GameContext, HostEvent, Request } from '../protocol.js';
import type { HostCore } from '../host/core.js';
import type { ClientTransport, TransportHandlers } from './types.js';

/**
 * In-process transport for when there is no shell to talk to: the installed
 * PWA opening at `/g/<slug>/`, direct navigation, or a game running
 * standalone at `pnpm dev`.
 *
 * Same host, same adapters, same overlay UI — only the wire is gone. Messages
 * are still routed through `HostCore.handle`, so the framed and standalone
 * paths cannot drift apart.
 */
export function createLocalTransport(host: HostCore, slug: string): ClientTransport {
  let handlers: TransportHandlers | undefined;
  let unsubscribe: (() => void) | undefined;

  return {
    async connect(incoming: TransportHandlers): Promise<GameContext> {
      handlers = incoming;
      unsubscribe = host.subscribeEvents((event: HostEvent) => handlers?.onEvent(event));
      return host.context(slug);
    },

    send(request: Request): void {
      // Deliberately async even though no wire is involved, so games see the
      // same ordering guarantees in both modes.
      void host.handle(slug, request).then((response) => {
        if (response) handlers?.onResponse(response);
      });
    },

    close(): void {
      unsubscribe?.();
      unsubscribe = undefined;
      handlers = undefined;
    },
  };
}
