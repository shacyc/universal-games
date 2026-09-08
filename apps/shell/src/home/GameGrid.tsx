import { useMemo, useState } from 'react';
import { CoverArt } from './CoverArt.js';
import { GENRES, STATS, homeGames, type HomeGame } from '../demo/demoData.js';

/** The searchable catalogue. Filtering is local — there is no games API yet. */
export function GameGrid({ onOpen }: { onOpen: (game: HomeGame) => void }): JSX.Element {
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState<string>('All');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return homeGames.filter(
      (g) =>
        (genre === 'All' || g.genre === genre) &&
        (q === '' || g.title.toLowerCase().includes(q) || g.genre.toLowerCase().includes(q))
    );
  }, [query, genre]);

  return (
    <section className="section" id="games">
      <div className="section__head">
        <div>
          <h2 className="section__title">ALL GAMES</h2>
          <p className="section__sub">
            {list.length === homeGames.length
              ? `${homeGames.length} titles, more every month`
              : `${list.length} of ${homeGames.length} titles`}
          </p>
        </div>

        <div className="search">
          <svg className="search__icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.6-3.6" />
          </svg>
          <input
            className="search__input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games"
            aria-label="Search games"
          />
        </div>
      </div>

      <div className="chips">
        {GENRES.map((g) => (
          <button
            key={g}
            type="button"
            className={`chip${g === genre ? ' chip--on' : ''}`}
            onClick={() => setGenre(g)}
            aria-pressed={g === genre}
          >
            {g}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <p className="empty__title">NO GAMES MATCH</p>
          <p className="empty__body">Try a different word, or clear the filter.</p>
        </div>
      ) : (
        <ul className="grid">
          {list.map((game) => (
            <li key={game.slug}>
              <button
                type="button"
                className="card"
                onClick={() => onOpen(game)}
                disabled={!game.playable}
                aria-label={game.playable ? `Play ${game.title}` : `${game.title} — coming soon`}
              >
                <span className="card__art">
                  <CoverArt cover={game.cover} />
                  {!game.playable && <span className="card__badge">SOON</span>}
                </span>
                <span className="card__body">
                  <span className="card__title">{game.title}</span>
                  <span className="card__genre">{game.genre}</span>
                  <span className="card__tagline">{game.tagline}</span>
                  <span className="card__plays">{STATS[game.slug]?.plays ?? '—'} plays</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
