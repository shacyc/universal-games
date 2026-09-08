import {
  PROTOCOL_VERSION,
  isHostEvent,
  isResponse,
  isWelcome,
  type GameContext,
  type Hello,
  type Request,
} from '../protocol.js';
import type { ClientTransport, TransportHandlers } from './types.js';

const HANDSHAKE_TIMEOUT_MS = 10_000;

/**
 * Embedded transport: hello over `window.postMessage`, then everything else
 * over a MessagePort the host transfers back.
 *
 * The origin check below is a cheap filter, not an identity check — the shell
 * and every game share an origin by design, so it cannot tell them apart.
 * Real identity comes from the port: only the host and this frame hold it, and
 * the host decided which slug it belongs to when it mounted the iframe.
 */
export function createFrameTransport(expectedOrigin = window.location.origin): ClientTransport {
  let port: MessagePort | undefined;

  return {
    connect(handlers: TransportHandlers): Promise<GameContext> {
      return new Promise<GameContext>((resolve, reject) => {
        const timer = setTimeout(() => {
          window.removeEventListener('message', onWindowMessage);
          reject(new Error('No welcome from host — is this game mounted by the shell?'));
        }, HANDSHAKE_TIMEOUT_MS);

        function onWindowMessage(event: MessageEvent): void {
          if (event.origin !== expectedOrigin) return;
          if (event.source !== window.parent) return;
          if (!isWelcome(event.data)) return;

          const granted = event.ports[0];
          if (!granted) return; // malformed welcome, keep waiting

          clearTimeout(timer);
          window.removeEventListener('message', onWindowMessage);

          port = granted;
          port.onmessage = (portEvent: MessageEvent) => {
            const message: unknown = portEvent.data;
            if (isResponse(message)) handlers.onResponse(message);
            else if (isHostEvent(message)) handlers.onEvent(message);
          };
          port.start();

          resolve(event.data.context);
        }

        window.addEventListener('message', onWindowMessage);

        const hello: Hello = { v: PROTOCOL_VERSION, type: 'hello' };
        window.parent.postMessage(hello, expectedOrigin);
      });
    },

    send(request: Request): void {
      port?.postMessage(request);
    },

    close(): void {
      port?.close();
      port = undefined;
    },
  };
}
