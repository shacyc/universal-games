import '@platform/sdk/game.css';
import './styles.css';

import {
  WIN_TILE, clearLowest, highestTile, isGameOver, move, newGrid, spawn,
  type Cell, type Direction, type Grid,
} from './board.js';
import { watchDurations, type Durations } from './anim.js';
import { createSurface } from './canvas.js';
import { createInput } from './input.js';
import { draw, phaseDone, type Phase } from './render.js';
import { createSession, type SaveState } from './session.js';
import { createUi } from './ui.js';

/** Deep enough that fast swiping never loses a move, bounded so it cannot run away. */
const MAX_QUEUED_MOVES = 12;

const root = document.getElementById('app');
if (!root) throw new Error('#app is missing from index.html');

const session = createSession();

/** Persisted state — exactly the shape in docs/game-2048.md. */
let grid: Grid = [];
let score = 0;
let best = 0;
let undo: { board: Cell[]; score: number } | null = null;
let wonShown = false;

/**
 * Run-local state. Deliberately not persisted: the saved shape is fixed by the
 * docs and does not carry these, so a reload grants a fresh free undo and a
 * fresh continue. See the note in the handover.
 */
let freeUndoUsed = false;
let continueUsed = false;
let moves = 0;
let over = false;

let phase: Phase | null = null;
let durations: Durations = { move: 100, pop: 120, spawn: 120 };
const queued: Direction[] = [];

const snapshot = (): SaveState => ({
  v: 1,
  board: [...grid],
  score,
  best,
  undo: undo ? { board: [...undo.board], score: undo.score } : null,
  wonShown,
});

const save = (): void => session.save(snapshot());

const ui = createUi(root, {
  onNewGame: () => void newGame(),
  onUndo: () => void requestUndo(),
  onKeepGoing: () => ui.hideOverlay(),
  onContinueWithAd: () => void takeContinue(),
  onDeclineContinue: () => endRun(),
});

const surface = createSurface(ui.canvas, ui.stage, () => render(performance.now()));

function refreshChrome(): void {
  ui.setScore(score, best);
  ui.setUndo(undo !== null && !over, freeUndoUsed);
}

function applyMove(direction: Direction): void {
  const result = move(grid, direction);
  // A move that changes nothing is not a move: no spawn, no score, no undo.
  if (!result.moved) return;

  undo = { board: [...grid], score };
  grid = result.grid;
  score += result.gained;
  best = Math.max(best, score);
  moves += 1;

  const seeded = spawn(grid, Math.random);
  if (seeded) grid[seeded.index] = seeded.value;

  phase = {
    movements: result.movements,
    gridAfter: [...grid],
    merged: [...new Set(result.movements.filter((m) => m.merged).map((m) => m.to))],
    spawn: seeded,
    startedAt: performance.now(),
  };

  save();
  refreshChrome();

  if (!wonShown && highestTile(grid) >= WIN_TILE) {
    wonShown = true;
    save();
    session.track('tile_2048_reached', { moves });
    ui.showWin();
  }

  if (isGameOver(grid)) lock();
}

/** The board is stuck. Offer the continue once, then end the run. */
function lock(): void {
  if (over) return;
  if (!continueUsed) {
    session.track('continue_offered', { score });
    ui.showContinueOffer();
    return;
  }
  endRun();
}

function endRun(): void {
  if (over) return;
  over = true;
  session.endRun({ score, highest: highestTile(grid), moves });
  refreshChrome();
  ui.showGameOver(score, best);
}

async function takeContinue(): Promise<void> {
  ui.setBusy(true);
  const watched = await session.rewardedContinue();
  ui.setBusy(false);

  // No reward: fall through to the normal game over screen, no penalty.
  if (!watched) {
    endRun();
    return;
  }

  continueUsed = true;
  session.track('continue_taken', { score });
  grid = clearLowest(grid, 4);
  // The snapshot points at the locked board; undoing into it would lock again.
  undo = null;
  phase = null;
  save();
  refreshChrome();
  ui.hideOverlay();
}

async function requestUndo(): Promise<void> {
  if (!undo || over) return;

  if (!freeUndoUsed) {
    freeUndoUsed = true;
    applyUndo();
    session.track('undo_used', { rewarded: false });
    return;
  }

  ui.setBusy(true);
  const watched = await session.rewardedUndo();
  ui.setBusy(false);
  // Closed early or no fill: change nothing, say nothing.
  if (!watched) return;

  applyUndo();
  session.track('undo_used', { rewarded: true });
}

function applyUndo(): void {
  if (!undo) return;
  grid = [...undo.board];
  score = undo.score;
  undo = null;
  phase = null;
  queued.length = 0;
  save();
  refreshChrome();
}

async function newGame(): Promise<void> {
  // The one legal interstitial moment: the player chose a new game from the
  // game over screen, after the score was shown.
  if (over) {
    ui.setBusy(true);
    await session.interstitialBeforeNewGame();
    ui.setBusy(false);
  }

  grid = newGrid(Math.random);
  score = 0;
  undo = null;
  wonShown = false;
  freeUndoUsed = false;
  continueUsed = false;
  moves = 0;
  over = false;
  phase = null;
  queued.length = 0;

  save();
  refreshChrome();
  ui.hideOverlay();
  session.startRun();
}

function render(now: number): void {
  draw(surface.ctx, surface.size, grid, phase, now, durations);
}

function frame(now: number): void {
  if (phase && phaseDone(phase, now, durations)) phase = null;

  // Input taken during an animation is queued, never dropped.
  if (!phase && queued.length > 0) {
    const next = queued.shift();
    if (next) applyMove(next);
  }

  render(now);
  window.requestAnimationFrame(frame);
}

createInput(ui.canvas, (direction) => {
  if (over) return;
  if (queued.length >= MAX_QUEUED_MOVES) return;
  queued.push(direction);
});

watchDurations((next) => {
  durations = next;
});

// No sounds ship in v0, but the platform owns mute, so the state is observed
// and reflected here — the gate is in place for when sounds land.
session.onMuteChange((muted) => {
  root.dataset.muted = String(muted);
});

async function boot(): Promise<void> {
  await session.ready();

  const saved = await session.load();
  if (saved) {
    // Restored silently — no "continue?" prompt.
    grid = saved.board;
    score = saved.score;
    best = saved.best;
    undo = saved.undo;
    wonShown = saved.wonShown;
  } else {
    grid = newGrid(Math.random);
  }

  // A restored run still needs a run open on the host, or its gameOver is
  // ignored and the run never reports.
  session.startRun();
  refreshChrome();

  if (isGameOver(grid)) lock();

  window.requestAnimationFrame(frame);
}

void boot().catch((error: unknown) => {
  root.textContent = `Could not start: ${error instanceof Error ? error.message : String(error)}`;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Registered at this game's own scope so it installs as its own PWA.
    void navigator.serviceWorker.register('/g/2048/sw.js', { scope: '/g/2048/' }).catch((error: unknown) => {
      console.debug('[2048] service worker registration failed', error);
    });
  });
}
