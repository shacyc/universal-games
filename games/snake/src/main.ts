/*
 * Boot. T1 scaffold: build the shell DOM, size a square canvas to the device
 * pixel ratio, and paint the checkerboard grass field so the pipeline is
 * visibly working at `/g/snake/`.
 *
 * The RAF loop + tick accumulator (plan §4), input, persistence and the
 * pause/resume pair land in later tasks. Field drawing moves into `render.ts`
 * at T4 — the copy here is deliberately throwaway.
 */
import './styles.css';

const GRID = 15;

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

function mount(root: HTMLElement): HTMLCanvasElement {
  const hud = h('header', 'hud');
  const score = h('span', 'hud__stat');
  score.textContent = '🍎 0';
  const best = h('span', 'hud__stat');
  best.textContent = '🏆 0';
  hud.append(score, best);

  const surface = h('div', 'surface game-surface');
  const canvas = h('canvas');
  surface.append(canvas);

  root.append(hud, surface);
  return canvas;
}

/**
 * Keeps the canvas backing store square and matched to DPR. Sizing is computed
 * here, not in CSS: an `aspect-ratio` box whose clamp binds on one axis leaves
 * the other axis to a stretched bitmap. Same reasoning as
 * `games/2048/src/canvas.ts` — read it, do not import it.
 */
function fitSquare(canvas: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; size: number } {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas context is unavailable');

  const rect = canvas.getBoundingClientRect();
  const side = Math.max(1, Math.floor(Math.min(rect.width, rect.height)));
  const dpr = Math.min(window.devicePixelRatio || 1, 3);

  canvas.width = Math.round(side * dpr);
  canvas.height = Math.round(side * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return { ctx, size: side };
}

function drawField(ctx: CanvasRenderingContext2D, size: number): void {
  const cell = size / GRID;
  const a = getComputedStyle(document.documentElement).getPropertyValue('--grass-a').trim() || '#8ecc39';
  const b = getComputedStyle(document.documentElement).getPropertyValue('--grass-b').trim() || '#a2d84a';

  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      ctx.fillStyle = (x + y) % 2 === 0 ? a : b;
      ctx.fillRect(Math.floor(x * cell), Math.floor(y * cell), Math.ceil(cell), Math.ceil(cell));
    }
  }
}

function registerServiceWorker(): void {
  // vite-plugin-pwa emits `sw.js` only in a build, never under `vite dev`, so a
  // failed registration here in dev is expected (docs/building-a-game.md §9).
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/g/snake/sw.js', { scope: '/g/snake/' });
  });
}

function boot(): void {
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) throw new Error('#app is missing');

  const canvas = mount(root);

  const paint = (): void => {
    const { ctx, size } = fitSquare(canvas);
    drawField(ctx, size);
  };

  paint();
  new ResizeObserver(paint).observe(canvas);

  registerServiceWorker();
}

boot();
