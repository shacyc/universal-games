import { useState } from 'react';
import { Console } from './Console.js';
import { CoverArt } from './CoverArt.js';
import { GameGrid } from './GameGrid.js';
import { useTheme, type Theme } from './theme.js';
import {
  BOARDS, SAVED, SPOTLIGHT, STATS, YOU, gameBySlug, homeGames, type HomeGame
} from '../demo/demoData.js';

const RAINBOW = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'];

function Rainbow({ className }: { className: string }): JSX.Element {
  return (
    <span className={className} aria-hidden="true">
      {RAINBOW.map((r) => (
        <span key={r} style={{ background: `var(--${r})` }} />
      ))}
    </span>
  );
}

export function HomePage({ onPlay }: { onPlay: (game: HomeGame) => void }): JSX.Element {
  const [theme, setTheme] = useTheme();
  const [index, setIndex] = useState(0);

  const slug = SPOTLIGHT[index] ?? SPOTLIGHT[0] ?? '';
  const hero = gameBySlug(slug);
  if (!hero) throw new Error(`Spotlight references an unknown game: ${slug}`);

  const stats = STATS[slug];
  const board = BOARDS[slug] ?? [];
  const you = YOU[slug];

  const step = (delta: number): void =>
    setIndex((i) => (i + delta + SPOTLIGHT.length) % SPOTLIGHT.length);

  const themeButton = (value: Theme, label: string): JSX.Element => (
    <button
      type="button"
      className={`toggle__btn${theme === value ? ' toggle__btn--on' : ''}`}
      onClick={() => setTheme(value)}
      aria-pressed={theme === value}
    >
      {label}
    </button>
  );

  return (
    <div className={`home t-${theme}`}>
      <div className="home__inner">
        <header className="topbar">
          <div className="brand">
            <Rainbow className="brand__mark" />
            <span className="brand__name">ARCADE</span>
          </div>
          <nav className="topbar__nav">
            <a href="#games">Games</a>
            <a href="#continue">Continue</a>
            <a href="#install">Install</a>
          </nav>
          <div className="toggle">
            {themeButton('vintage', 'VINTAGE')}
            {themeButton('modern', 'MODERN')}
          </div>
        </header>

        <section className="window">
          <div className="window__bar">
            <span className="window__box" />
            <span className="window__pin" />
            <span className="window__title">SPOTLIGHT</span>
            <span className="window__pin" />
            <span className="window__box" />
          </div>

          <div className="spotlight">
            <div className="spotlight__console">
              <Console
                game={hero}
                position={index + 1}
                total={SPOTLIGHT.length}
                onPrev={() => step(-1)}
                onNext={() => step(1)}
              />
              <div className="dots">
                {SPOTLIGHT.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    className={`dots__hit${i === index ? ' dots__hit--on' : ''}`}
                    onClick={() => setIndex(i)}
                    aria-label={`Show ${gameBySlug(s)?.title ?? s}`}
                    aria-current={i === index}
                  >
                    <span />
                  </button>
                ))}
              </div>
            </div>

            <div className="spotlight__info">
              <div className="spotlight__meta">
                <span className="pill">{hero.genre}</span>
                <span className="spotlight__live">{stats?.live ?? '—'} playing now</span>
              </div>

              <h2 className="spotlight__title">{hero.title}</h2>
              <p className="spotlight__pitch">{hero.tagline}</p>
              <p className="spotlight__blurb">{stats?.blurb}</p>

              <div className="stats">
                <div className="stats__cell">
                  <span className="stats__value">{stats?.plays ?? '—'}</span>
                  <span className="stats__label">Plays</span>
                </div>
                <div className="stats__cell">
                  <span className="stats__value">{stats?.session ?? '—'}</span>
                  <span className="stats__label">Avg run</span>
                </div>
                <div className="stats__cell">
                  <span className="stats__value">{stats?.best ?? '—'}</span>
                  <span className="stats__label">World best</span>
                </div>
              </div>

              <button
                type="button"
                className="btn btn--primary"
                onClick={() => onPlay(hero)}
                disabled={!hero.playable}
              >
                {hero.playable ? 'PLAY NOW' : 'COMING SOON'}
              </button>

              <div className="board">
                <div className="board__head">
                  <h3 className="board__title">TOP PLAYERS</h3>
                  <span className="board__season">SEASON 3 · ENDS IN 4D 12H</span>
                </div>
                <div className="board__rows">
                  {board.map((row, i) => (
                    <div className="board__row" key={row.name}>
                      <span className={`board__rank board__rank--${i < 3 ? i + 1 : 'n'}`}>{i + 1}</span>
                      <span className="board__name">{row.name}</span>
                      <span className="board__score">{row.score}</span>
                    </div>
                  ))}
                  <div className="board__row board__row--you">
                    <span className="board__rank board__rank--you">{you?.rank ?? '—'}</span>
                    <span className="board__name">
                      You <span className="board__anon">· anon-4f2a</span>
                    </span>
                    <span className="board__score">{you?.score ?? '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <GameGrid onOpen={onPlay} />

        <section className="section" id="continue">
          <div className="section__head section__head--stack">
            <h2 className="section__title">PICK UP WHERE YOU LEFT OFF</h2>
            <p className="section__sub">Saved on this device — no account needed.</p>
          </div>
          <ul className="resume">
            {SAVED.map((run) => {
              const game = gameBySlug(run.slug);
              if (!game) return null;
              return (
                <li className="resume__item" key={run.slug}>
                  <span className="resume__art">
                    <CoverArt cover={game.cover} />
                  </span>
                  <span className="resume__body">
                    <span className="resume__title">{game.title}</span>
                    <span className="resume__detail">{run.detail}</span>
                    <span className="resume__track">
                      <span className="resume__fill" style={{ width: `${run.pct}%` }} />
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => onPlay(game)}
                    disabled={!game.playable}
                  >
                    RESUME
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="section" id="install">
          <div className="install">
            <div className="install__copy">
              <h2 className="install__title">
                EVERY GAME GETS
                <br />
                ITS OWN ICON
              </h2>
              <p className="install__body">
                Add a game to your home screen and it installs on its own — its own icon, its own
                full-screen window, and it keeps working with no signal. Nothing to download from a
                store.
              </p>
              <ul className="install__list">
                <li>
                  <Check />
                  Android — one tap from the game screen
                </li>
                <li>
                  <Check />
                  iPhone — Share, then Add to Home Screen
                </li>
              </ul>
            </div>
            <div className="phone">
              <div className="phone__screen">
                {homeGames.slice(0, 6).map((game) => (
                  <span className="phone__app" key={game.slug}>
                    <span className="phone__icon">
                      <CoverArt cover={game.cover} />
                    </span>
                    <span className="phone__label">{game.title}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="foot">
          <Rainbow className="foot__stripe" />
          <div className="foot__row">
            <span className="foot__brand">ARCADE — SMALL GAMES, NO INSTALL</span>
            <span className="foot__note">Made for the browser · 2026</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Check(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
