import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { chromeTheme, type CatalogGame } from './catalog.js';
import { LOCALE_NAMES } from './i18n/index.js';
import { LanguageList } from './i18n/LanguagePicker.js';
import { useLocale, useStrings } from './i18n/locale.js';
import { openInstall } from './install.js';
import { useInstallState } from './InstallPrompt.js';

/**
 * The settings sheet over a running game.
 *
 * Everything in it is a **shell** capability — the language the platform is in,
 * and leaving the game — so it lives here rather than in any game. A game that
 * drew its own would need two new SDK methods and would have to be rebuilt in
 * every future game; see decision 17 in `docs/sdk-decisions.md`.
 *
 * It wears the open game's colours, taken from `chrome` in `catalog.json`. That
 * is data, not an import, so rule 1 holds: the shell still knows nothing about
 * how a game is built.
 *
 * Navigation, not a switch: the root page lists what can be changed and the
 * language page is a level below it. A segmented control would have been fewer
 * taps for two languages and unusable at five.
 */
type Page = 'root' | 'language';

export function GameSettings({
  game,
  onClose,
  onExit,
}: {
  game: CatalogGame;
  onClose: () => void;
  onExit: () => void;
}): JSX.Element {
  const t = useStrings();
  const locale = useLocale();
  const install = useInstallState();
  const [page, setPage] = useState<Page>('root');
  /** Which way the page just moved, so it animates in from the right side. */
  const [back, setBack] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const toRoot = (): void => {
    setBack(true);
    setPage('root');
  };

  useEffect(() => {
    // Escape pops one level, the way a settings screen does — closing the whole
    // sheet from a sub-page would lose the player's place for no reason.
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (page === 'root') onClose();
      else toRoot();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [page, onClose]);

  // Focus follows the page, so a keyboard or screen-reader user is not left
  // pointing at a button that no longer exists.
  useEffect(() => {
    sheetRef.current?.querySelector<HTMLElement>('.sheet__row')?.focus();
  }, [page]);

  const theme = chromeTheme(game);
  const vars = {
    '--sheet-surface': theme.surface,
    '--sheet-ink': theme.ink,
    '--sheet-muted': theme.muted,
    '--sheet-accent': theme.accent,
    '--sheet-on-accent': theme.onAccent,
  } as CSSProperties;

  return (
    <div className="sheet-layer" style={vars}>
      <button type="button" className="sheet__scrim" aria-label={t.close} onClick={onClose} />

      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-settings-title"
        ref={sheetRef}
      >
        <header className="sheet__head">
          {page === 'root' ? (
            <span className="sheet__slot" />
          ) : (
            <button type="button" className="sheet__icon" onClick={toRoot} aria-label={t.settings_back}>
              <Chevron dir="left" />
            </button>
          )}

          <h2 className="sheet__title" id="game-settings-title">
            {page === 'root' ? t.settings : t.language}
          </h2>

          <button type="button" className="sheet__icon" onClick={onClose} aria-label={t.close}>
            <Cross />
          </button>
        </header>

        {/* Keyed on the page so it remounts and animates in; `data-back` picks
            the direction, so going back does not look like going forward. */}
        <div className="sheet__page" key={page} data-back={back ? '' : undefined}>
          {page === 'root' ? (
            <div className="sheet__group">
              <button
                type="button"
                className="sheet__row"
                onClick={() => {
                  setBack(false);
                  setPage('language');
                }}
              >
                <span className="sheet__row-label">{t.language}</span>
                <span className="sheet__row-value" lang={locale}>
                  {LOCALE_NAMES[locale]?.name ?? locale}
                </span>
                <Chevron dir="right" />
              </button>

              {/* Only when this target can actually be installed — `install.ts`
                  decides that, and a row that does nothing when tapped is
                  worse than no row. The sheet gets out of the way first: the
                  install prompt is itself a sheet. */}
              {install.available ? (
                <button
                  type="button"
                  className="sheet__row"
                  onClick={() => {
                    onClose();
                    openInstall();
                  }}
                >
                  <span className="sheet__row-label">{t.install_target(install.target)}</span>
                  <Download />
                </button>
              ) : null}

              <button type="button" className="sheet__row" onClick={onExit}>
                <span className="sheet__row-label">{t.back_to_games}</span>
                <Exit />
              </button>
            </div>
          ) : (
            <LanguageList onPick={toRoot} />
          )}
        </div>
      </div>
    </div>
  );
}

function Chevron({ dir }: { dir: 'left' | 'right' }): JSX.Element {
  return (
    <svg
      className="sheet__chevron"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={dir === 'left' ? 'M15 5 8 12l7 7' : 'm9 5 7 7-7 7'} />
    </svg>
  );
}

function Cross(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function Download(): JSX.Element {
  return (
    <svg
      className="sheet__chevron"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m8 11 4 4 4-4" />
      <path d="M5 21h14" />
    </svg>
  );
}

function Exit(): JSX.Element {
  return (
    <svg
      className="sheet__chevron"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m15 16 5-4-5-4" />
      <path d="M20 12H9" />
    </svg>
  );
}
