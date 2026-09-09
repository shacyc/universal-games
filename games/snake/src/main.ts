/*
 * Boot and the game loop. This is the orchestrator: it owns the phase
 * (idle / running / dead), the tick accumulator (plan §4), and the wiring from
 * input into the pure core and from the core into the renderer.
 *
 * Not here yet: the UI overlays and settings screen (T7, `ui.ts`), and the SDK
 * lifecycle / persistence / pause-resume (T8–T11, `session.ts`). The HUD markup
 * below is a stopgap that `ui.ts` will take over.
 */
import './styles.css';
import { newRun, queueTurn, step, type Dir, type Run } from './snake.js';
import { createInput } from './input.js';
import { EMPTY_ASSETS, loadAssets } from './assets.js';
import { createRenderer } from './render.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

function mountDom(root: HTMLElement): { surface: HTMLElement; canvas: HTMLCanvasElement; hud: HTMLElement } {
  root.replaceChildren();
  const hud = document.createElement('header');
  hud.className = 'hud';
  hud.innerHTML =
    '<span class="hud__stat" data-hud="score">\u{1F34E} 0</span>' +
    '<span class="hud__stat" data-hud="best">\u{1F3C6} 0</span>';
  const surface = document.createElement('div');
  surface.className = 'surface game-surface';
  const canvas = document.createElement('canvas');
  surface.append(canvas);
  root.append(hud, surface);
  return { surface, canvas, hud };
}

async function boot(): Promise<void> {
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) throw new Error('#app is missing');

  const { surface, canvas, hud } = mountDom(root);
  const scoreEl = hud.querySelector<HTMLElement>('[data-hud="score"]');
  const bestEl = hud.querySelector<HTMLElement>('[data-hud="best"]');

  const assets = await loadAssets().catch(() => EMPTY_ASSETS);
  const renderer = createRenderer(canvas, surface, assets);

  const rng = Math.random;

  let run: Run = newRun(rng);
  let prev: Run | null = null;
  let phase: 'idle' | 'running' | 'dead' = 'idle';
  let acc = 0;
  let last = performance.now();
  let best = 0;
  let ateAt: number | null = null;
  let deadAt: number | null = null;

  const tickMs = (): number => 1000 / run.speed;

  const startFresh = (): void => {
    run = newRun(rng);
    prev = null;
    phase = 'idle';
    acc = 0;
    ateAt = null;
    deadAt = null;
  };

  const onTurn = (dir: Dir): void => {
    if (phase === 'dead') {
      // Stopgap until T7 draws a game-over card with its own "New game".
      startFresh();
      return;
    }
    run = queueTurn(run, dir);
    if (phase === 'idle') {
      phase = 'running';
      last = performance.now();
    }
  };
  const input = createInput(surface, onTurn);

  const frame = (now: number): void => {
    const dt = Math.min(now - last, 250);
    last = now;

    if (phase === 'running') {
      acc += dt;
      let guard = 0;
      while (acc >= tickMs() && guard++ < 8) {
        prev = run;
        run = step(run, rng);
        acc -= tickMs();
        if (run.justAte) {
          ateAt = now;
          if (run.score > best) best = run.score;
        }
        if (run.dead) {
          phase = 'dead';
          deadAt = now;
          acc = 0;
          break;
        }
      }
    }

    const reduced = REDUCED.matches;
    const t = phase === 'running' ? Math.min(1, acc / tickMs()) : 0;
    renderer.draw({ run, prev, t, reducedMotion: reduced, now, ateAt, deadAt });

    if (scoreEl) scoreEl.textContent = `\u{1F34E} ${run.score}`;
    if (bestEl) bestEl.textContent = `\u{1F3C6} ${best}`;

    rafId = requestAnimationFrame(frame);
  };
  let rafId = requestAnimationFrame(frame);

  // vite-plugin-pwa emits sw.js only in a build, so this is a no-op under
  // `vite dev` and the failed registration in the console there is expected.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register('/g/snake/sw.js', { scope: '/g/snake/' });
    });
  }

  // The game lives for the document; nothing tears this down. `input` is kept
  // referenced so its listeners are not seen as dead code.
  void input;

  // Dev-only inspection hook for manual render checks (eat face, crash, dead
  // face) that are too brief to catch through screenshot latency. Stripped from
  // a production build by the `import.meta.env.DEV` guard.
  if (import.meta.env.DEV) {
    (window as unknown as { __snake?: unknown }).__snake = {
      get state(): unknown {
        return {
          phase,
          score: run.score,
          length: run.body.length,
          dir: run.dir,
          dead: run.dead,
          speed: Number(run.speed.toFixed(2)),
        };
      },
      /** Drop the food onto the cell directly ahead of the head. */
      feedAhead(): void {
        const head = run.body[0];
        if (head === undefined) return;
        const delta = run.dir === 'right' ? 1 : run.dir === 'left' ? -1 : run.dir === 'down' ? 15 : -15;
        run = { ...run, food: head + delta };
      },
      /**
       * Paint one held frame with forced face/crash state, so a still
       * screenshot can verify what is otherwise a 150ms flash. `face`:
       * `'chomp'` | `'dead'` | `'cruise'`.
       */
      paintFace(face: 'chomp' | 'dead' | 'dead-flash' | 'cruise'): void {
        cancelAnimationFrame(rafId);
        const t = performance.now();
        const isDead = face === 'dead' || face === 'dead-flash';
        renderer.draw({
          run: { ...run, dead: isDead },
          prev: null,
          t: 0,
          reducedMotion: false,
          now: t,
          ateAt: face === 'chomp' ? t : null,
          // 'dead' shows the settled crash; 'dead-flash' catches the white flash
          deadAt: face === 'dead-flash' ? t : isDead ? t - 500 : null,
        });
      },
    };
  }
}

void boot();
