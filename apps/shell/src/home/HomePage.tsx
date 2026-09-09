import { Fragment, useState } from 'react';
import { Console } from './Console.js';
import { CoverArt } from './CoverArt.js';
import { GameGrid } from './GameGrid.js';
import { useTheme, type Theme } from './theme.js';
import { InstallButton } from '../InstallPrompt.js';
import { BRAND } from '../i18n/brand.js';
import { LanguagePicker } from '../i18n/LanguagePicker.js';
import { genreLabel } from '../i18n/index.js';
import { useStrings } from '../i18n/locale.js';
import { useGameCopy } from '../demo/copy.js';
import {
  ANON_ID, BOARDS, SAVED, SPOTLIGHT, STATS, YOU, gameBySlug, homeGames, type HomeGame
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
  const t = useStrings();
  const copy = useGameCopy();
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
            <span className="brand__name">{BRAND}</span>
          </div>
          <nav className="topbar__nav">
            <a href="#games">{t.nav_games}</a>
            <a href="#continue">{t.nav_continue}</a>
            <a href="#install">{t.nav_install}</a>
          </nav>
          <div className="topbar__prefs">
            <LanguagePicker variant="bar" />
            <div className="toggle" role="group" aria-label={t.theme_group}>
              {themeButton('vintage', t.theme_vintage)}
              {themeButton('modern', t.theme_modern)}
            </div>
          </div>
        </header>

        <section className="window">
          <div className="window__bar">
            <span className="window__box" />
            <span className="window__pin" />
            <span className="window__title">{t.spotlight_title}</span>
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
                    aria-label={t.show_game(gameBySlug(s)?.title ?? s)}
                    aria-current={i === index}
                  >
                    <span />
                  </button>
                ))}
              </div>
            </div>

            <div className="spotlight__info">
              <div className="spotlight__meta">
                <span className="pill">{genreLabel(t, hero.genre)}</span>
                <span className="spotlight__live">
                  {stats ? t.playing_now(stats.live) : '—'}
                </span>
              </div>

              <h2 className="spotlight__title">{hero.title}</h2>
              <p className="spotlight__pitch">{copy.tagline(hero)}</p>
              <p className="spotlight__blurb">{copy.blurb(slug)}</p>

              <div className="stats">
                <div className="stats__cell">
                  <span className="stats__value">{stats ? t.number(stats.plays) : '—'}</span>
                  <span className="stats__label">{t.stat_plays}</span>
                </div>
                <div className="stats__cell">
                  <span className="stats__value">
                    {stats ? t.duration(stats.session.minutes, stats.session.seconds) : '—'}
                  </span>
                  <span className="stats__label">{t.stat_session}</span>
                </div>
                <div className="stats__cell">
                  <span className="stats__value">{stats ? t.number(stats.best) : '—'}</span>
                  <span className="stats__label">{t.stat_best}</span>
                </div>
              </div>

              <button
                type="button"
                className="btn btn--primary"
                onClick={() => onPlay(hero)}
                disabled={!hero.playable}
              >
                {hero.playable ? t.play_now : t.coming_soon}
              </button>

              <div className="board">
                <div className="board__head">
                  <h3 className="board__title">{t.board_title}</h3>
                  <span className="board__season">{copy.season}</span>
                </div>
                <div className="board__rows">
                  {board.map((row, i) => (
                    <div className="board__row" key={row.name}>
                      <span className={`board__rank board__rank--${i < 3 ? i + 1 : 'n'}`}>{i + 1}</span>
                      <span className="board__name">{row.name}</span>
                      <span className="board__score">{t.number(row.score)}</span>
                    </div>
                  ))}
                  <div className="board__row board__row--you">
                    <span className="board__rank board__rank--you">
                      {you ? t.rank(you.rank) : '—'}
                    </span>
                    <span className="board__name">
                      {t.board_you} <span className="board__anon">· {ANON_ID}</span>
                    </span>
                    <span className="board__score">{you ? t.number(you.score) : '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <GameGrid onOpen={onPlay} />

        <section className="section" id="continue">
          <div className="section__head section__head--stack">
            <h2 className="section__title">{t.resume_title}</h2>
            <p className="section__sub">{t.resume_sub}</p>
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
                    <span className="resume__detail">{copy.saved(run.slug)}</span>
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
                    {t.resume_action}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="section" id="install">
          <div className="install">
            <div className="install__copy">
              {/* The break is the translator's, not the layout's — see `install_title`. */}
              <h2 className="install__title">
                {t.install_title.split('\n').map((line, i) => (
                  <Fragment key={line}>
                    {i > 0 ? <br /> : null}
                    {line}
                  </Fragment>
                ))}
              </h2>
              <p className="install__body">{t.install_body}</p>
              <ul className="install__list">
                <li>
                  <Check />
                  {t.install_android}
                </li>
                <li>
                  <Check />
                  {t.install_ios}
                </li>
              </ul>
              <InstallButton variant="text" />
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
            <span className="foot__brand">{t.foot_brand(BRAND)}</span>
            <span className="foot__note">{t.foot_note}</span>
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
