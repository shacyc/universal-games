/**
 * The DOM around the board: header, footer, the overlays, and the settings
 * screen.
 *
 * The settings screen is this game's own, in this game's own colours, because
 * the shell no longer draws anything over a running game — every game builds
 * one that suits it (`docs/building-a-game.md` §3.12, decision 18). It holds
 * exactly what the platform requires: the language, and the way back to the
 * hub. Both are asked for through `session.ts`; nothing here decides them.
 *
 * No user-facing text is written here. Every word comes from `src/i18n/`, and
 * the language can change while the game is running, so the chrome keeps a
 * reference to each label node and any open panel knows how to redraw itself.
 */

import { LOCALE_NAMES, SUPPORTED, type Strings } from './i18n/index.js';

export interface UiHandlers {
  onNewGame(): void;
  onUndo(): void;
  onKeepGoing(): void;
  onContinueWithAd(): void;
  onDeclineContinue(): void;
  /** The player picked a language in settings. */
  onSetLocale(locale: string): void;
  /** The player asked to leave, from settings. */
  onExitToHub(): void;
}

export interface Ui {
  canvas: HTMLCanvasElement;
  /** The box the board is sized against. */
  stage: HTMLElement;
  setScore(score: number, best: number): void;
  /** `costsAd` shows the badge once the run's free undo is spent. */
  setUndo(available: boolean, costsAd: boolean): void;
  showWin(): void;
  showContinueOffer(): void;
  showGameOver(score: number, best: number): void;
  hideOverlay(): void;
  setBusy(busy: boolean): void;
  /**
   * The platform's language changed. Re-label everything, in place — including
   * the settings screen, which is very likely what the player just used to
   * change it.
   */
  setStrings(next: Strings, locale: string): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(className: string, label: string, onClick: () => void): HTMLButtonElement {
  const node = el('button', className, label);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

export function createUi(
  root: HTMLElement,
  handlers: UiHandlers,
  strings: Strings,
  locale: string,
): Ui {
  let s = strings;
  let current = locale;

  root.textContent = '';
  root.className = 'game game-safe';

  const scoreValue = el('span', 'score__value', '0');
  const bestValue = el('span', 'score__value', '0');
  const scoreLabel = el('span', 'score__label', s.score_label);
  const bestLabel = el('span', 'score__label', s.best_label);

  const scoreBox = el('div', 'score');
  scoreBox.append(scoreLabel, scoreValue);
  const bestBox = el('div', 'score');
  bestBox.append(bestLabel, bestValue);

  const newButton = button('btn', s.new_short, handlers.onNewGame);

  const header = el('header', 'hud');
  const scores = el('div', 'hud__scores');
  scores.append(scoreBox, bestBox);
  header.append(el('h1', 'hud__brand', '2048'), scores, newButton);

  const canvas = el('canvas', 'board game-surface');
  const overlay = el('div', 'overlay');
  overlay.hidden = true;

  const stage = el('div', 'stage');
  stage.append(canvas, overlay);

  const undoBadge = el('span', 'badge', s.ad_badge);
  // The label is its own node: the badge lives inside the button too, so
  // rewriting the button's text would delete it.
  const undoLabel = el('span', undefined, s.undo);
  const undoButton = button('btn btn--undo', '', handlers.onUndo);
  undoButton.append(undoLabel, undoBadge);

  const settingsButton = button('btn btn--icon', '', () => openMenu('root'));
  settingsButton.append(gearIcon());
  settingsButton.setAttribute('aria-label', s.settings_open);
  settingsButton.setAttribute('aria-haspopup', 'dialog');

  const footer = el('footer', 'foot');
  footer.append(undoButton, settingsButton);

  root.append(header, stage, footer);

  /**
   * How to redraw whatever overlay is currently open. Held as a closure so a
   * language change while the game-over card is up re-renders it, rather than
   * leaving the player looking at the previous language until they tap.
   */
  let openPanel: (() => void) | null = null;

  const panel = (title: string, note: string, actions: HTMLElement[]): void => {
    overlay.textContent = '';
    const card = el('div', 'overlay__card');
    card.append(el('p', 'overlay__title', title), el('p', 'overlay__note', note));
    const row = el('div', 'overlay__actions');
    row.append(...actions);
    card.append(row);
    overlay.append(card);
    overlay.hidden = false;
  };

  const win = (): void => {
    panel(s.win_title, s.win_note, [button('btn btn--primary', s.keep_going, handlers.onKeepGoing)]);
  };

  const continueOffer = (): void => {
    panel(s.stuck_title, s.stuck_note, [
      button('btn btn--primary', s.watch_ad, handlers.onContinueWithAd),
      button('btn', s.no_thanks, handlers.onDeclineContinue),
    ]);
  };

  const gameOver = (score: number, best: number): void => {
    panel(s.game_over, s.final_score(score, best), [
      button('btn btn--primary', s.new_game, handlers.onNewGame),
    ]);
  };

  // ---- settings ---------------------------------------------------------
  //
  // A separate layer from `overlay`, which belongs to the board: settings must
  // be reachable while the game-over card is up, and closing it must not
  // dismiss the card underneath.

  const menu = el('div', 'menu');
  menu.hidden = true;
  const menuScrim = button('menu__scrim', '', () => closeMenu());
  const menuCard = el('div', 'menu__card');
  menuCard.setAttribute('role', 'dialog');
  menuCard.setAttribute('aria-modal', 'true');
  const menuTitle = el('h2', 'menu__title');
  const menuHead = el('div', 'menu__head');
  const menuBody = el('div', 'menu__body');
  menuCard.append(menuHead, menuBody);
  menu.append(menuScrim, menuCard);
  root.append(menu);

  /** Which page is open, or null when the sheet is closed. */
  let menuPage: 'root' | 'language' | null = null;

  const iconButton = (label: string, icon: SVGElement, onClick: () => void): HTMLButtonElement => {
    const node = button('menu__icon', '', onClick);
    node.append(icon);
    node.setAttribute('aria-label', label);
    return node;
  };

  /** One tappable line. `value` is the current setting; `mark` is the tick. */
  const menuRow = (
    label: string,
    onClick: () => void,
    extras: { value?: string; valueLang?: string; icon?: SVGElement; checked?: boolean } = {},
  ): HTMLButtonElement => {
    const node = button('menu__row', '', onClick);
    node.append(el('span', 'menu__row-label', label));
    if (extras.value !== undefined) {
      const value = el('span', 'menu__row-value', extras.value);
      // The name of a language is written in that language, so it has to be
      // marked as such or a screen reader reads it in the wrong one.
      if (extras.valueLang) value.lang = extras.valueLang;
      node.append(value);
    }
    if (extras.icon) node.append(extras.icon);
    if (extras.checked !== undefined) {
      node.setAttribute('role', 'radio');
      node.setAttribute('aria-checked', String(extras.checked));
      if (extras.checked) node.append(checkIcon());
    }
    return node;
  };

  const drawMenu = (): void => {
    if (menuPage === null) return;
    menuHead.textContent = '';
    menuBody.textContent = '';

    // The root page has nothing to go back to, so the slot stays empty rather
    // than the title sliding off centre.
    menuHead.append(
      menuPage === 'root'
        ? el('span', 'menu__slot')
        : iconButton(s.back, chevronIcon('left'), () => openMenu('root')),
    );
    menuTitle.textContent = menuPage === 'root' ? s.settings : s.language;
    menuHead.append(menuTitle, iconButton(s.close, crossIcon(), () => closeMenu()));

    if (menuPage === 'root') {
      const group = el('div', 'menu__group');
      group.append(
        menuRow(s.language, () => openMenu('language'), {
          value: LOCALE_NAMES[current] ?? current,
          valueLang: current,
          icon: chevronIcon('right'),
        }),
        menuRow(s.back_to_home, handlers.onExitToHub, { icon: exitIcon() }),
      );
      menuBody.append(group);
    } else {
      const group = el('div', 'menu__group');
      group.setAttribute('role', 'radiogroup');
      group.setAttribute('aria-label', s.language);
      for (const tag of SUPPORTED) {
        const row = menuRow(LOCALE_NAMES[tag] ?? tag, () => {
          handlers.onSetLocale(tag);
          // Back to the root page, where the new choice is now the value on the
          // language row. The relabelling itself arrives through setStrings.
          openMenu('root');
        }, { checked: tag === current });
        row.lang = tag;
        group.append(row);
      }
      menuBody.append(group);
    }

    menuBody.querySelector<HTMLElement>('.menu__row')?.focus();
  };

  const openMenu = (page: 'root' | 'language'): void => {
    menuPage = page;
    menu.hidden = false;
    drawMenu();
  };

  const closeMenu = (): void => {
    menuPage = null;
    menu.hidden = true;
    menuHead.textContent = '';
    menuBody.textContent = '';
    settingsButton.focus();
  };

  // Escape goes back a level rather than closing outright: a sub-page that
  // exits the whole sheet loses the player's place for no reason.
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || menuPage === null) return;
    event.preventDefault();
    if (menuPage === 'root') closeMenu();
    else openMenu('root');
  });

  return {
    canvas,
    stage,

    setScore(score, best) {
      scoreValue.textContent = s.number(score);
      bestValue.textContent = s.number(best);
    },

    setUndo(available, costsAd) {
      undoButton.disabled = !available;
      undoBadge.hidden = !costsAd;
    },

    showWin() {
      openPanel = win;
      win();
    },

    showContinueOffer() {
      openPanel = continueOffer;
      continueOffer();
    },

    showGameOver(score, best) {
      openPanel = () => gameOver(score, best);
      openPanel();
    },

    hideOverlay() {
      openPanel = null;
      overlay.hidden = true;
      overlay.textContent = '';
    },

    setBusy(busy) {
      root.classList.toggle('game--busy', busy);
    },

    setStrings(next, nextLocale) {
      s = next;
      current = nextLocale;
      scoreLabel.textContent = s.score_label;
      bestLabel.textContent = s.best_label;
      newButton.textContent = s.new_short;
      undoLabel.textContent = s.undo;
      undoBadge.textContent = s.ad_badge;
      settingsButton.setAttribute('aria-label', s.settings_open);
      // Scores are formatted per locale, so they are re-rendered by the caller
      // through setScore; the board overlay and the settings sheet each redraw
      // themselves here — the sheet is usually what the player just used.
      openPanel?.();
      drawMenu();
    },
  };
}

// ---- icons ----
// Inline rather than a sprite: five paths, and a sprite would be one more file
// for the service worker to keep in step with the build.

function svg(width: number, paths: string[], strokeWidth = 2.2): SVGElement {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  node.setAttribute('viewBox', '0 0 24 24');
  node.setAttribute('width', String(width));
  node.setAttribute('height', String(width));
  node.setAttribute('fill', 'none');
  node.setAttribute('stroke', 'currentColor');
  node.setAttribute('stroke-width', String(strokeWidth));
  node.setAttribute('stroke-linecap', 'round');
  node.setAttribute('stroke-linejoin', 'round');
  node.setAttribute('aria-hidden', 'true');
  for (const d of paths) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    node.append(path);
  }
  return node;
}

function gearIcon(): SVGElement {
  const node = svg(22, [
    'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    'M15.2 12a3.2 3.2 0 1 1-6.4 0 3.2 3.2 0 0 1 6.4 0z',
  ], 1.9);
  return node;
}

function chevronIcon(dir: 'left' | 'right'): SVGElement {
  return svg(20, [dir === 'left' ? 'M15 5 8 12l7 7' : 'm9 5 7 7-7 7'], 2.4);
}

function crossIcon(): SVGElement {
  return svg(20, ['M6 6l12 12', 'M18 6 6 18'], 2.4);
}

function checkIcon(): SVGElement {
  return svg(20, ['M20 6 9 17l-5-5'], 2.6);
}

function exitIcon(): SVGElement {
  return svg(20, ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm15 16 5-4-5-4', 'M20 12H9']);
}
