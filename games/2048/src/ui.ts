/**
 * The DOM around the board: header, footer and the overlays. Minimal by
 * instruction — no tutorial, no settings screen.
 */

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

export function createUi(root: HTMLElement, handlers: UiHandlers): Ui {
  root.textContent = '';
  root.className = 'game game-safe';

  const scoreValue = el('span', 'score__value', '0');
  const bestValue = el('span', 'score__value', '0');

  const scoreBox = el('div', 'score');
  scoreBox.append(el('span', 'score__label', 'SCORE'), scoreValue);
  const bestBox = el('div', 'score');
  bestBox.append(el('span', 'score__label', 'BEST'), bestValue);

  const header = el('header', 'hud');
  const scores = el('div', 'hud__scores');
  scores.append(scoreBox, bestBox);
  header.append(el('h1', 'hud__brand', '2048'), scores, button('btn', 'New', handlers.onNewGame));

  const canvas = el('canvas', 'board game-surface');
  const overlay = el('div', 'overlay');
  overlay.hidden = true;

  const stage = el('div', 'stage');
  stage.append(canvas, overlay);

  const undoBadge = el('span', 'badge', 'AD');
  const undoButton = button('btn btn--undo', 'Undo', handlers.onUndo);
  undoButton.append(undoBadge);

  const footer = el('footer', 'foot');
  footer.append(undoButton);

  root.append(header, stage, footer);

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

  return {
    canvas,
    stage,

    setScore(score, best) {
      scoreValue.textContent = String(score);
      bestValue.textContent = String(best);
    },

    setUndo(available, costsAd) {
      undoButton.disabled = !available;
      undoBadge.hidden = !costsAd;
    },

    showWin() {
      panel('You made 2048', 'Keep going for a bigger tile.', [
        button('btn btn--primary', 'Keep going', handlers.onKeepGoing),
      ]);
    },

    showContinueOffer() {
      panel('No moves left', 'Watch a short ad to clear the four smallest tiles and carry on.', [
        button('btn btn--primary', 'Watch ad', handlers.onContinueWithAd),
        button('btn', 'No thanks', handlers.onDeclineContinue),
      ]);
    },

    showGameOver(score, best) {
      panel('Game over', `Score ${score} · Best ${best}`, [
        button('btn btn--primary', 'New game', handlers.onNewGame),
      ]);
    },

    hideOverlay() {
      overlay.hidden = true;
      overlay.textContent = '';
    },

    setBusy(busy) {
      root.classList.toggle('game--busy', busy);
    },
  };
}
