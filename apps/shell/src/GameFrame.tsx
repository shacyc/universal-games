import { useEffect, useRef } from 'react';
import { attachFrameHost } from '@platform/sdk/host';
import type { CatalogGame } from './catalog.js';
import { onExitRequest } from './exit.js';
import { host } from './host.js';

/**
 * Mounts one game and wires it to the host.
 *
 * The iframe is same-origin so that games can be plain static builds under
 * `/g/<slug>/`; identity therefore cannot come from the origin, and comes from
 * this component knowing which slug it just mounted.
 *
 * Nothing of the shell's is drawn over the game — no back button, no language
 * control, no settings. Every game ships its own settings screen in its own
 * style and reaches the platform through `sdk.setLocale` and `sdk.exitToHub`
 * (decision 18). This component is the frame and the wiring, and that is all.
 */
export function GameFrame({ game, onExit }: { game: CatalogGame; onExit: () => void }): JSX.Element {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = frameRef.current;
    if (!iframe) return;
    return attachFrameHost({ iframe, slug: game.slug, host });
  }, [game.slug]);

  // Registered only while a game is on screen, so `exitToHub` after the player
  // has already left does nothing rather than navigating them somewhere.
  useEffect(() => onExitRequest(onExit), [onExit]);

  return (
    <div className="game-frame">
      <iframe
        ref={frameRef}
        className="game-frame__frame"
        src={`/g/${game.slug}/`}
        title={game.title}
        // Same-origin by design (rule 1): the game is a separate build, not a
        // separate origin. Sandboxing it would break the MessagePort handshake
        // and same-origin storage without adding a real boundary.
        allow="autoplay"
      />
    </div>
  );
}
