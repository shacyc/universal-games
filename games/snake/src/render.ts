/**
 * Canvas drawing: the grass field, the apple, the snake as a rounded path with
 * inter-tick interpolation, and (T5) the reactive face and the crash effect.
 * The snake is drawn, not blitted — it bends, interpolates and rotates every
 * frame. Bitmaps are used for the field and the apple when `assets` has them,
 * and a procedural fallback is drawn when it does not (see `assets.ts`).
 *
 * No game rules here. State comes in through `Frame`; nothing is mutated.
 */
import { GRID, type Dir, type Run } from './snake.js';
import type { Assets } from './assets.js';

const COLORS = {
  grassA: '#8ecc39',
  grassB: '#a2d84a',
  snake: '#3b5bc0',
  snakeDead: '#2b3350',
  apple: '#e8412e',
  appleLeaf: '#54a838',
  eyeWhite: '#ffffff',
  eyeDark: '#1e2a55',
  mouth: '#ff6b8a', // pink, reads clearly against the royal-blue head
  flash: '#ffffff',
};

/** Time the open-mouth "chomp" face is held after a bite (brief §4). */
const EAT_FACE_MS = 150;
/** Crash shake + flash durations (brief §4). */
const SHAKE_MS = 260;
const FLASH_MS = 180;

const DIR_ANGLE: Record<Dir, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
};

export interface Frame {
  run: Run;
  /** The run before the last `step`, for interpolation. `null` when idle or restored. */
  prev: Run | null;
  /** 0..1 progress through the current tick. 0 when not running. */
  t: number;
  reducedMotion: boolean;
  /** ms clock for time-based effects. */
  now: number;
  /** ms of the most recent bite, or `null`. Drives the chomp face. */
  ateAt: number | null;
  /** ms the run died, or `null`. Drives the crash shake + flash. */
  deadAt: number | null;
}

export interface Renderer {
  draw(frame: Frame): void;
  dispose(): void;
}

type Point = { x: number; y: number };

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function createRenderer(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  assets: Assets,
): Renderer {
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) throw new Error('2d canvas context is unavailable');
  const ctx: CanvasRenderingContext2D = maybeCtx;

  let size = 0; // logical (CSS) px side of the square board

  const fit = (): void => {
    const rect = container.getBoundingClientRect();
    const side = Math.max(1, Math.floor(Math.min(rect.width, rect.height)));
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    size = side;
    canvas.style.width = `${side}px`;
    canvas.style.height = `${side}px`;
    canvas.width = Math.round(side * dpr);
    canvas.height = Math.round(side * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  fit();
  const observer = new ResizeObserver(fit);
  observer.observe(container);

  const cellSize = (): number => size / GRID;
  const centreX = (idx: number): number => ((idx % GRID) + 0.5) * cellSize();
  const centreY = (idx: number): number => (Math.floor(idx / GRID) + 0.5) * cellSize();

  function drawField(): void {
    // Drawn, not a bitmap: the classic two-green checkerboard is a handful of
    // fillRects, stays crisp at any size, and needs nothing precached.
    const c = cellSize();
    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID; x += 1) {
        ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.grassA : COLORS.grassB;
        ctx.fillRect(Math.floor(x * c), Math.floor(y * c), Math.ceil(c), Math.ceil(c));
      }
    }
  }

  function drawApple(idx: number, now: number, reduced: boolean): void {
    if (idx < 0) return;
    const c = cellSize();
    const r = c * 0.42;
    const pulse = reduced ? 1 : 1 + 0.06 * Math.sin(now / 300);
    const x = centreX(idx);
    const y = centreY(idx);

    if (assets.apple) {
      const d = r * 2.3 * pulse;
      ctx.drawImage(assets.apple, x - d / 2, y - d / 2, d, d);
      return;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = COLORS.apple;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.appleLeaf;
    ctx.beginPath();
    ctx.ellipse(r * 0.35, -r * 0.95, r * 0.42, r * 0.22, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.3, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Interpolated centre-points of the body, head first. */
  function bodyPoints(run: Run, prev: Run | null, t: number, reduced: boolean): Point[] {
    const pts: Point[] = run.body.map((idx) => ({ x: centreX(idx), y: centreY(idx) }));
    if (reduced || prev === null || t <= 0 || pts.length === 0) return pts;

    const grew = prev.body.length !== run.body.length;

    const prevHead = prev.body[0];
    const head = pts[0];
    if (prevHead !== undefined && head) {
      pts[0] = { x: lerp(centreX(prevHead), head.x, t), y: lerp(centreY(prevHead), head.y, t) };
    }

    // The tail retracts toward the next segment — unless the snake grew, when
    // the tail stays put for a tick.
    if (!grew && pts.length >= 2) {
      const tail = pts[pts.length - 1];
      const ahead = pts[pts.length - 2];
      if (tail && ahead) {
        pts[pts.length - 1] = { x: lerp(tail.x, ahead.x, t), y: lerp(tail.y, ahead.y, t) };
      }
    }
    return pts;
  }

  function drawSnakeBody(pts: Point[], dead: boolean): void {
    if (pts.length === 0) return;
    const head = pts[0];
    if (!head) return;

    ctx.strokeStyle = dead ? COLORS.snakeDead : COLORS.snake;
    ctx.lineWidth = cellSize() * 0.8;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(head.x, head.y);
    for (let i = 1; i < pts.length; i += 1) {
      const p = pts[i];
      if (p) ctx.lineTo(p.x, p.y);
    }
    if (pts.length === 1) ctx.lineTo(head.x + 0.01, head.y);
    ctx.stroke();
  }

  /**
   * The face, drawn in the head's local frame where +x is forward. Three
   * states (brief §4): cruise, chomp (held EAT_FACE_MS after a bite), dizzy
   * (while dead).
   */
  function drawFace(head: Point, dir: Dir, dead: boolean, chomping: boolean): void {
    const c = cellSize();
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(DIR_ANGLE[dir]);

    const eyeR = c * 0.13;
    const fwd = c * 0.13;
    const side = c * 0.2;

    if (dead) {
      // Dizzy spiral eyes.
      ctx.strokeStyle = COLORS.eyeDark;
      ctx.lineWidth = c * 0.045;
      ctx.lineCap = 'round';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 4; a += 0.3) {
          const rr = eyeR * (a / (Math.PI * 4));
          const px = fwd + Math.cos(a) * rr;
          const py = s * side + Math.sin(a) * rr;
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    for (const s of [-1, 1]) {
      ctx.fillStyle = COLORS.eyeWhite;
      ctx.beginPath();
      ctx.arc(fwd, s * side, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.eyeDark;
      ctx.beginPath();
      // pupil rides forward; a chomp squints it down a touch
      ctx.arc(fwd + eyeR * 0.35, s * side, eyeR * (chomping ? 0.42 : 0.55), 0, Math.PI * 2);
      ctx.fill();
    }

    if (chomping) {
      ctx.fillStyle = COLORS.mouth;
      ctx.beginPath();
      ctx.arc(c * 0.34, 0, c * 0.17, -Math.PI * 0.55, Math.PI * 0.55);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  return {
    draw(frame: Frame): void {
      const { run, prev, t, reducedMotion, now, ateAt, deadAt } = frame;

      let shakeX = 0;
      let shakeY = 0;
      if (deadAt !== null && !reducedMotion) {
        const e = now - deadAt;
        if (e < SHAKE_MS) {
          const decay = 1 - e / SHAKE_MS;
          shakeX = Math.sin(e / 18) * 6 * decay;
          shakeY = Math.cos(e / 22) * 5 * decay;
        }
      }

      ctx.save();
      ctx.clearRect(0, 0, size, size);
      ctx.translate(shakeX, shakeY);

      drawField();
      drawApple(run.food, now, reducedMotion);

      const pts = bodyPoints(run, prev, t, reducedMotion);
      drawSnakeBody(pts, run.dead);

      const head = pts[0];
      if (head) {
        const chomping =
          !run.dead && ateAt !== null && now - ateAt >= 0 && now - ateAt < EAT_FACE_MS;
        drawFace(head, run.dir, run.dead, chomping);
      }

      ctx.restore();

      // White flash on death, drawn over everything and unaffected by the shake.
      if (deadAt !== null && !reducedMotion) {
        const e = now - deadAt;
        if (e < FLASH_MS) {
          ctx.save();
          ctx.globalAlpha = 0.6 * (1 - e / FLASH_MS);
          ctx.fillStyle = COLORS.flash;
          ctx.fillRect(0, 0, size, size);
          ctx.restore();
        }
      }
    },
    dispose(): void {
      observer.disconnect();
    },
  };
}
