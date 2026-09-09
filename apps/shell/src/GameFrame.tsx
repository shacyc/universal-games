import { useEffect, useRef, useState } from 'react';
import { attachFrameHost } from '@platform/sdk/host';
import { chromeTheme, type CatalogGame } from './catalog.js';
import { GameSettings } from './GameSettings.js';
import { host } from './host.js';
import { useStrings } from './i18n/locale.js';
import type { CSSProperties } from 'react';

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
  const settingsRef = useRef<HTMLButtonElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const iframe = frameRef.current;
    if (!iframe) return;
    return attachFrameHost({ iframe, slug: game.slug, host });
  }, [game.slug]);

  const closeSettings = (): void => {
    setSettingsOpen(false);
    // Focus goes back where it came from, not to the top of the document.
    settingsRef.current?.focus();
  };

  const theme = chromeTheme(game);
  const buttonVars = {
    '--sheet-accent': theme.accent,
    '--sheet-on-accent': theme.onAccent,
  } as CSSProperties;

  return (
    <div className="game-frame">
      {/* Exactly one thing floats over the board, and everything the shell can
          do is behind it. It sits in the corner `@platform/sdk/game.css`
          reserves — bottom-right, where a game's HUD is not and a thumb already
          is. Two floating buttons were two things covering the game. */}
      <button
        type="button"
        className="game-frame__settings"
        style={buttonVars}
        onClick={() => setSettingsOpen(true)}
        aria-label={t.settings}
        aria-haspopup="dialog"
        aria-expanded={settingsOpen}
        ref={settingsRef}
      >
        <Gear />
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

      {settingsOpen ? <GameSettings game={game} onClose={closeSettings} onExit={onExit} /> : null}
    </div>
  );
}

function Gear(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
