import { useEffect, useState } from 'react';
import { findGame } from './catalog.js';
import { GameFrame } from './GameFrame.js';
import { HomePage } from './home/HomePage.js';
import { InstallPrompt } from './InstallPrompt.js';
import { setInstallTarget } from './install.js';
import type { HomeGame } from './demo/demoData.js';

/**
 * Deliberately no router: two screens, and every kilobyte of the shell is
 * paid for on first load before any game is reachable.
 */
function slugFromPath(pathname: string): string | null {
  const match = /^\/play\/([^/]+)\/?$/.exec(pathname);
  return match?.[1] ?? null;
}

export function App(): JSX.Element {
  const [slug, setSlug] = useState<string | null>(() => slugFromPath(window.location.pathname));

  useEffect(() => {
    const onPopState = (): void => setSlug(slugFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const open = (game: HomeGame): void => {
    // Placeholder entries have no build behind them; the UI disables them, and
    // this is the backstop so a stray call can never mount a 404 iframe.
    if (!game.playable || !findGame(game.slug)) return;
    window.history.pushState(null, '', `/play/${game.slug}`);
    setSlug(game.slug);
  };

  const exit = (): void => {
    window.history.pushState(null, '', '/');
    setSlug(null);
  };

  const game = slug ? findGame(slug) : undefined;

  // Which manifest the document points at decides what an install installs:
  // the game on a game route, the hub on the hub. See install.ts.
  useEffect(() => {
    setInstallTarget(game ?? null);
  }, [game]);

  return (
    <>
      {game ? <GameFrame game={game} onExit={exit} /> : <HomePage onPlay={open} />}
      <InstallPrompt />
    </>
  );
}
