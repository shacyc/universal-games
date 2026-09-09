import { useMemo, useState } from 'react';
import { CoverArt } from './CoverArt.js';
import { GENRE_KEYS, genreLabel } from '../i18n/index.js';
import { useStrings } from '../i18n/locale.js';
import { useGameCopy } from '../demo/copy.js';
import { STATS, homeGames, type HomeGame } from '../demo/demoData.js';

/** The searchable catalogue. Filtering is local — there is no games API yet. */
export function GameGrid({ onOpen }: { onOpen: (game: HomeGame) => void }): JSX.Element {
  const t = useStrings();
  const copy = useGameCopy();
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState<string>('all');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Search runs over what the player can actually see: the title, the
    // tagline as it currently reads, and the translated genre label. Matching
    // the genre *key* would mean typing "puzzle" found games while reading the
    // page in Vietnamese, and typing "giải đố" found nothing.
    return homeGames.filter((g) => {
      if (genre !== 'all' && g.genre !== genre) return false;
      if (q === '') return true;
      const label = genreLabel(t, g.genre);
      return (
        g.title.toLowerCase().includes(q) ||
        label.toLowerCase().includes(q) ||
        copy.tagline(g).toLowerCase().includes(q)
      );
    });
  }, [query, genre, t, copy]);

  return (
    <section className="section" id="games">
      <div className="section__head">
        <div>
          <h2 className="section__title">{t.all_games}</h2>
          <p className="section__sub">
            {list.length === homeGames.length
              ? t.titles_all(homeGames.length)
              : t.titles_filtered(list.length, homeGames.length)}
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
            placeholder={t.search_games}
            aria-label={t.search_games}
          />
        </div>
      </div>

      <div className="chips">
        {GENRE_KEYS.map((g) => (
          <button
            key={g}
            type="button"
            className={`chip${g === genre ? ' chip--on' : ''}`}
            onClick={() => setGenre(g)}
            aria-pressed={g === genre}
          >
            {genreLabel(t, g)}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <p className="empty__title">{t.empty_title}</p>
          <p className="empty__body">{t.empty_body}</p>
        </div>
      ) : (
        <ul className="grid">
          {list.map((game) => {
            const stats = STATS[game.slug];
            return (
              <li key={game.slug}>
                <button
                  type="button"
                  className="card"
                  onClick={() => onOpen(game)}
                  disabled={!game.playable}
                  aria-label={game.playable ? t.card_play(game.title) : t.card_soon(game.title)}
                >
                  <span className="card__art">
                    <CoverArt cover={game.cover} />
                    {!game.playable && <span className="card__badge">{t.badge_soon}</span>}
                  </span>
                  <span className="card__body">
                    <span className="card__title">{game.title}</span>
                    <span className="card__genre">{genreLabel(t, game.genre)}</span>
                    <span className="card__tagline">{copy.tagline(game)}</span>
                    <span className="card__plays">{stats ? t.plays_count(stats.plays) : '—'}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
