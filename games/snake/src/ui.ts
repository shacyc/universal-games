/**
 * All the DOM around the board: the HUD, the start card, the idle / paused /
 * game-over overlays, the 3-2-1 countdown, and the settings screen.
 *
 * No user-facing text is written here — every word comes from `src/i18n/`, and
 * the language can change while the game is open, so each label node is held by
 * reference and any open panel knows how to redraw itself (`setStrings`).
 *
 * The settings screen is this game's own, in this game's colours: the shell
 * draws nothing over a running game (`docs/building-a-game.md` §3.12). It holds
 * exactly what the platform requires — the language, and the way back to the
 * hub — and both are asked for through `session.ts`; nothing here decides them.
 */
import { LOCALE_NAMES, SUPPORTED, type Strings } from './i18n/index.js';

export type View = 'start' | 'idle' | 'running' | 'paused' | 'gameover';

export interface UiHandlers {
  /** Start card → begin a run. */
  onPlay(): void;
  /** Paused overlay tapped. */
  onResume(): void;
  /** Game-over card → "Continue with ad". */
  onRevive(): void;
  /** Game-over card → "New game". */
  onNewGame(): void;
  /** A language was picked in settings. */
  onSetLocale(tag: string): void;
  /** "Back to the hub" in settings. */
  onExitToHub(): void;
}

export interface Ui {
  readonly canvas: HTMLCanvasElement;
  /** The square box the renderer sizes the board against. */
  readonly surface: HTMLElement;
  setHud(score: number, best: number): void;
  setView(view: View): void;
  setGameOver(opts: { score: number; best: number; canRevive: boolean }): void;
  /** The revive offer came back `false`; drop the button, keep the card. */
  reviveSpent(): void;
  /** `n` shows a big digit over the board; `null` hides it. */
  setCountdown(n: number | null): void;
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

  // ---- HUD -------------------------------------------------------------
  const scoreValue = el('span', 'hud__value', '0');
  const bestValue = el('span', 'hud__value', '0');
  const scoreStat = el('div', 'hud__stat');
  scoreStat.append(el('span', 'hud__icon', '\u{1F34E}'), scoreValue);
  const bestStat = el('div', 'hud__stat');
  bestStat.append(el('span', 'hud__icon', '\u{1F3C6}'), bestValue);

  const gearButton = button('hud__gear', '', () => openMenu('root'));
  gearButton.append(gearIcon());
  gearButton.setAttribute('aria-haspopup', 'dialog');

  const header = el('header', 'hud');
  header.append(scoreStat, el('div', 'hud__spacer'), bestStat, gearButton);

  // ---- stage: canvas + overlays -------------------------------------
  const canvas = el('canvas', 'board');
  const surface = el('div', 'surface game-surface');
  surface.append(canvas);

  const countdown = el('div', 'countdown');
  countdown.hidden = true;

  const overlay = el('div', 'overlay');
  overlay.hidden = true;

  const stage = el('div', 'stage');
  stage.append(surface, countdown, overlay);

  root.append(header, stage);

  // How to redraw whatever overlay is open, so a language change re-renders it
  // in place rather than leaving the old language on screen.
  let openPanel: (() => void) | null = null;

  const showCard = (nodes: HTMLElement[]): void => {
    overlay.textContent = '';
    const card = el('div', 'card');
    card.append(...nodes);
    overlay.append(card);
    overlay.hidden = false;
  };

  // ---- start card ----------------------------------------------------
  const startMascot = el('div', 'card__mascot');
  startMascot.append(mascotSvg());

  const startCard = (): void => {
    const stats = el('div', 'card__stats');
    const a = el('div', 'hud__stat');
    a.append(el('span', 'hud__icon', '\u{1F34E}'), el('span', 'hud__value', s.number(lastScore)));
    const b = el('div', 'hud__stat');
    b.append(el('span', 'hud__icon', '\u{1F3C6}'), el('span', 'hud__value', s.number(best)));
    stats.append(a, b);

    showCard([
      stats,
      startMascot,
      button('btn btn--primary', s.play, handlers.onPlay),
      button('btn', s.settings, () => openMenu('root')),
    ]);
  };

  const idleOverlay = (): void => {
    overlay.textContent = '';
    overlay.append(el('p', 'overlay__hint', s.swipe_to_start));
    overlay.hidden = false;
  };

  const pausedOverlay = (): void => {
    overlay.textContent = '';
    const box = el('div', 'overlay__tap');
    box.append(el('p', 'overlay__hint', s.tap_to_resume));
    box.addEventListener('click', handlers.onResume);
    overlay.append(box);
    overlay.hidden = false;
  };

  let canReviveNow = false;
  let goScore = 0;
  let goBest = 0;

  const gameOverCard = (): void => {
    const actions: HTMLElement[] = [];
    if (canReviveNow) {
      actions.push(button('btn btn--primary', s.continue_with_ad, handlers.onRevive));
    }
    actions.push(button(canReviveNow ? 'btn' : 'btn btn--primary', s.new_game, handlers.onNewGame));

    const row = el('div', 'card__actions');
    row.append(...actions);
    showCard([
      el('p', 'card__title', s.game_over),
      el('p', 'card__line', s.score(goScore)),
      el('p', 'card__line', s.best(goBest)),
      row,
    ]);
  };

  // ---- settings sheet ---------------------------------------------------
  // Its own layer, above the board overlay: reachable while the game-over card
  // is up, and closing it must not dismiss that card.
  const sheet = el('div', 'sheet');
  sheet.hidden = true;
  const scrim = button('sheet__scrim', '', () => closeMenu());
  const sheetCard = el('div', 'sheet__card');
  sheetCard.setAttribute('role', 'dialog');
  sheetCard.setAttribute('aria-modal', 'true');
  const sheetHead = el('div', 'sheet__head');
  const sheetTitle = el('h2', 'sheet__title');
  const sheetBody = el('div', 'sheet__body');
  sheetCard.append(sheetHead, sheetBody);
  sheet.append(scrim, sheetCard);
  root.append(sheet);

  let menuPage: 'root' | 'language' | null = null;

  const iconButton = (label: string, icon: SVGElement, onClick: () => void): HTMLButtonElement => {
    const node = button('sheet__icon', '', onClick);
    node.append(icon);
    node.setAttribute('aria-label', label);
    return node;
  };

  const row = (
    label: string,
    onClick: () => void,
    extras: { value?: string; valueLang?: string; chevron?: boolean; checked?: boolean } = {},
  ): HTMLButtonElement => {
    const node = button('sheet__row', '', onClick);
    node.append(el('span', 'sheet__row-label', label));
    if (extras.value !== undefined) {
      const v = el('span', 'sheet__row-value', extras.value);
      if (extras.valueLang) v.lang = extras.valueLang;
      node.append(v);
    }
    if (extras.chevron) node.append(chevronIcon('right'));
    if (extras.checked !== undefined) {
      node.setAttribute('role', 'radio');
      node.setAttribute('aria-checked', String(extras.checked));
      if (extras.checked) node.append(checkIcon());
    }
    return node;
  };

  const drawMenu = (): void => {
    if (menuPage === null) return;
    sheetHead.textContent = '';
    sheetBody.textContent = '';

    sheetHead.append(
      menuPage === 'root'
        ? el('span', 'sheet__slot')
        : iconButton(s.back, chevronIcon('left'), () => openMenu('root')),
    );
    sheetTitle.textContent = menuPage === 'root' ? s.settings : s.language;
    sheetHead.append(sheetTitle, iconButton(s.back, crossIcon(), () => closeMenu()));

    const group = el('div', 'sheet__group');
    if (menuPage === 'root') {
      group.append(
        row(s.language, () => openMenu('language'), {
          value: LOCALE_NAMES[current] ?? current,
          valueLang: current,
          chevron: true,
        }),
        row(s.back_to_hub, handlers.onExitToHub),
      );
    } else {
      group.setAttribute('role', 'radiogroup');
      group.setAttribute('aria-label', s.language);
      for (const tag of SUPPORTED) {
        const r = row(
          LOCALE_NAMES[tag] ?? tag,
          () => {
            handlers.onSetLocale(tag);
            openMenu('root');
          },
          { checked: tag === current },
        );
        r.lang = tag;
        group.append(r);
      }
    }
    sheetBody.append(group);
    sheetBody.querySelector<HTMLElement>('.sheet__row')?.focus();
  };

  const openMenu = (page: 'root' | 'language'): void => {
    menuPage = page;
    sheet.hidden = false;
    drawMenu();
  };

  const closeMenu = (): void => {
    menuPage = null;
    sheet.hidden = true;
    sheetHead.textContent = '';
    sheetBody.textContent = '';
    gearButton.focus();
  };

  // Escape steps back one level rather than closing outright.
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || menuPage === null) return;
    event.preventDefault();
    if (menuPage === 'root') closeMenu();
    else openMenu('root');
  });

  // ---- view state ----------------------------------------------------
  let lastScore = 0;
  let best = 0;

  const hideOverlay = (): void => {
    openPanel = null;
    overlay.hidden = true;
    overlay.textContent = '';
  };

  return {
    canvas,
    surface,

    setHud(score, nextBest) {
      lastScore = score;
      best = nextBest;
      scoreValue.textContent = s.number(score);
      bestValue.textContent = s.number(nextBest);
    },

    setView(view) {
      root.dataset.view = view;
      if (view === 'start') {
        openPanel = startCard;
        startCard();
      } else if (view === 'idle') {
        openPanel = idleOverlay;
        idleOverlay();
      } else if (view === 'paused') {
        openPanel = pausedOverlay;
        pausedOverlay();
      } else if (view === 'running') {
        hideOverlay();
      } else {
        openPanel = gameOverCard;
        gameOverCard();
      }
    },

    setGameOver({ score, best: b, canRevive }) {
      goScore = score;
      goBest = b;
      canReviveNow = canRevive;
    },

    reviveSpent() {
      canReviveNow = false;
      if (root.dataset.view === 'gameover') gameOverCard();
    },

    setCountdown(n) {
      if (n === null) {
        countdown.hidden = true;
        countdown.textContent = '';
      } else {
        countdown.textContent = String(n);
        countdown.hidden = false;
      }
    },

    setStrings(next, nextLocale) {
      s = next;
      current = nextLocale;
      scoreValue.textContent = s.number(lastScore);
      bestValue.textContent = s.number(best);
      openPanel?.();
      drawMenu();
    },
  };
}

// ---- icons ----
// Inline: a handful of paths, and a sprite file would be one more thing for the
// service worker to keep in step with the build.

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
  return svg(
    22,
    [
      'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
      'M15.2 12a3.2 3.2 0 1 1-6.4 0 3.2 3.2 0 0 1 6.4 0z',
    ],
    1.9,
  );
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

/** The start-card snake, drawn when `public/art/title.webp` is not present. */
function mascotSvg(): SVGElement {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  node.setAttribute('viewBox', '0 0 120 90');
  node.setAttribute('width', '150');
  node.setAttribute('height', '112');
  node.setAttribute('aria-hidden', 'true');
  const body = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  body.setAttribute('d', 'M20 66 h60 a16 16 0 0 0 16 -16 v-4 a14 14 0 0 0 -28 0');
  body.setAttribute('fill', 'none');
  body.setAttribute('stroke', '#3b5bc0');
  body.setAttribute('stroke-width', '22');
  body.setAttribute('stroke-linecap', 'round');
  body.setAttribute('stroke-linejoin', 'round');
  node.append(body);
  for (const cxp of [70, 82]) {
    const w = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    w.setAttribute('cx', String(cxp));
    w.setAttribute('cy', '40');
    w.setAttribute('r', '5.5');
    w.setAttribute('fill', '#fff');
    node.append(w);
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    p.setAttribute('cx', String(cxp + 1.5));
    p.setAttribute('cy', '40');
    p.setAttribute('r', '2.6');
    p.setAttribute('fill', '#1e2a55');
    node.append(p);
  }
  return node;
}
