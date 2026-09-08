import { useEffect, useRef } from 'react';
import { attachFrameHost } from '@platform/sdk/host';
import type { CatalogGame } from './catalog.js';
import { host } from './host.js';

/**
 * Mounts one game and wires it to the host.
 *
 * The iframe is same-origin so that games can be plain static builds under
 * `/g/<slug>/`; identity therefore cannot come from the origin, and comes from
 * this component knowing which slug it just mounted.
 */
export function GameFrame({ game, onExit }: { game: CatalogGame; onExit: () => void }): JSX.Element {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = frameRef.current;
    if (!iframe) return;
    return attachFrameHost({ iframe, slug: game.slug, host });
  }, [game.slug]);

  return (
    <div className="game-frame">
      <button type="button" className="game-frame__back" onClick={onExit} aria-label="Back to games">
        ‹
      </button>
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
