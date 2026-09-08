import {
  isHello,
  PROTOCOL_VERSION,
  type HostEvent,
  type Welcome,
} from '../protocol.js';
import type { HostCore } from './core.js';

export interface AttachFrameHostOptions {
  /** The iframe this host mounted. Its `contentWindow` is the identity check. */
  iframe: HTMLIFrameElement;
  /**
   * The slug the shell assigned to this frame. Never read from the game's
   * messages: same-origin frames can claim any slug, so trusting one would let
   * a game read and overwrite another game's saves.
   */
  slug: string;
  host: HostCore;
  expectedOrigin?: string;
}

/**
 * Wires one mounted game iframe to the host. Returns a detach function.
 *
 * The `window` listener only lives long enough to complete the handshake;
 * afterwards the pair talk over a private MessagePort.
 */
export function attachFrameHost(options: AttachFrameHostOptions): () => void {
  const expectedOrigin = options.expectedOrigin ?? window.location.origin;
  let port: MessagePort | undefined;
  let unsubscribe: (() => void) | undefined;

  function onWindowMessage(event: MessageEvent): void {
    if (event.origin !== expectedOrigin) return;
    // The real check: this message came from the window we put in the DOM.
    if (event.source !== options.iframe.contentWindow) return;
    if (!isHello(event.data)) return;

    // A reload inside the iframe sends a fresh hello; drop the stale channel.
    teardownChannel();

    const channel = new MessageChannel();
    port = channel.port1;
    port.onmessage = (portEvent: MessageEvent) => {
      void options.host.handle(options.slug, portEvent.data).then((response) => {
        if (response) port?.postMessage(response);
      });
    };
    port.start();

    unsubscribe = options.host.subscribeEvents(options.slug, (hostEvent: HostEvent) => port?.postMessage(hostEvent));

    const welcome: Welcome = {
      v: PROTOCOL_VERSION,
      type: 'welcome',
      context: options.host.context(options.slug),
    };
    options.iframe.contentWindow?.postMessage(welcome, expectedOrigin, [channel.port2]);
  }

  function teardownChannel(): void {
    unsubscribe?.();
    unsubscribe = undefined;
    port?.close();
    port = undefined;
  }

  window.addEventListener('message', onWindowMessage);

  return () => {
    window.removeEventListener('message', onWindowMessage);
    teardownChannel();
  };
}
