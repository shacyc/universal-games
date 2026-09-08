/**
 * The DOM around the board: header, footer and the overlays. Minimal by
 * instruction — no tutorial, no settings screen.
 *
 * No user-facing text is written here. Every word comes from `src/i18n/`, and
 * the language can change while the game is running, so the chrome keeps a
 * reference to each label node and an overlay knows how to redraw itself.
 */

import type { Strings } from './i18n/index.js';

export interface UiHandlers {
  onNewGame(): void;
  onUndo(): void;
  onKeepGoing(): void;
  onContinueWithAd(): void;
  onDeclineContinue(): void;
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
  /** The platform's language changed. Re-label everything, in place. */
  setStrings(next: Strings): void;
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

export function createUi(root: HTMLElement, handlers: UiHandlers, strings: Strings): Ui {
  let s = strings;

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

  const footer = el('footer', 'foot');
  footer.append(undoButton);

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

    setStrings(next) {
      s = next;
      scoreLabel.textContent = s.score_label;
      bestLabel.textContent = s.best_label;
      newButton.textContent = s.new_short;
      undoLabel.textContent = s.undo;
      undoBadge.textContent = s.ad_badge;
      // Scores are formatted per locale, so they are re-rendered by the caller
      // through setScore; the overlay redraws itself here.
      openPanel?.();
    },
  };
}
