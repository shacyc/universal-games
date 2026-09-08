import { useEffect, useState } from 'react';
import { catalog, findGame, type CatalogGame } from './catalog.js';
import { GameFrame } from './GameFrame.js';

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

  const open = (game: CatalogGame): void => {
    window.history.pushState(null, '', `/play/${game.slug}`);
    setSlug(game.slug);
  };

  const exit = (): void => {
    window.history.pushState(null, '', '/');
    setSlug(null);
  };

  const game = slug ? findGame(slug) : undefined;
  if (game) return <GameFrame game={game} onExit={exit} />;

  return (
    <main className="hub">
      <h1 className="hub__title">Arcade</h1>
      <ul className="hub__grid">
        {catalog.games.map((entry) => (
          <li key={entry.slug}>
            <button
              type="button"
              className="hub__card"
              style={{ background: entry.backgroundColor }}
              onClick={() => open(entry)}
            >
              <span className="hub__card-title">{entry.title}</span>
              <span className="hub__card-tagline">{entry.tagline}</span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
