import { useEffect, useRef } from 'react';
import { attachFrameHost } from '@platform/sdk/host';
import type { CatalogGame } from './catalog.js';
import { host } from './host.js';
import { LanguagePicker } from './i18n/LanguagePicker.js';
import { useStrings } from './i18n/locale.js';
import { InstallButton } from './InstallPrompt.js';

/**
 * Mounts one game and wires it to the host.
 *
 * The iframe is same-origin so that games can be plain static builds under
 * `/g/<slug>/`; identity therefore cannot come from the origin, and comes from
 * this component knowing which slug it just mounted.
 */
export function GameFrame({ game, onExit }: { game: CatalogGame; onExit: () => void }): JSX.Element {
  const t = useStrings();
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = frameRef.current;
    if (!iframe) return;
    return attachFrameHost({ iframe, slug: game.slug, host });
  }, [game.slug]);

  return (
    <div className="game-frame">
      <button type="button" className="game-frame__back" onClick={onExit} aria-label={t.back_to_games}>
        ‹
      </button>
      {/* Shell chrome, so every game in the catalog gets it without shipping
          any install code or language picker of its own. The picker is here and
          not only on the home page because going home to change language would
          unmount the iframe — and switching language without losing the run is
          the whole reason the SDK has a `locale` event. */}
      <div className="game-frame__tools">
        <LanguagePicker variant="overlay" />
        <InstallButton variant="icon" />
      </div>
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
