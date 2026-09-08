import { SIZE, type Grid, type Movement, type Spawn } from './board.js';
import { clamp01, easeOut, pop, type Durations } from './anim.js';

const BOARD_BG = '#bbada0';
const EMPTY_CELL = 'rgba(238, 228, 218, 0.35)';
const DARK_TEXT = '#776e65';
const LIGHT_TEXT = '#f9f6f2';

const TILE_FILL: Record<number, string> = {
  2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563',
  32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61',
  512: '#edc850', 1024: '#edc53f', 2048: '#edc22e',
};
const BIG_TILE_FILL = '#3c3a32';

/** One move being played out: tiles travelling, then merges popping and a spawn. */
export interface Phase {
  movements: Movement[];
  gridAfter: Grid;
  /** Cells that received a merge and should pop on arrival. */
  merged: number[];
  spawn: Spawn | null;
  startedAt: number;
}

export function phaseDuration(durations: Durations): number {
  return durations.move + Math.max(durations.pop, durations.spawn);
}

export function phaseDone(phase: Phase, now: number, durations: Durations): boolean {
  return now - phase.startedAt >= phaseDuration(durations);
}

interface Metrics {
  gap: number;
  cell: number;
  radius: number;
}

function metrics(size: number): Metrics {
  const gap = Math.max(4, size * 0.028);
  const cell = (size - gap * (SIZE + 1)) / SIZE;
  return { gap, cell, radius: Math.max(3, cell * 0.09) };
}

const cellX = (index: number, m: Metrics): number => m.gap + (index % SIZE) * (m.cell + m.gap);
const cellY = (index: number, m: Metrics): number => m.gap + Math.floor(index / SIZE) * (m.cell + m.gap);

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  value: number,
  x: number,
  y: number,
  m: Metrics,
  scale: number,
  alpha: number,
): void {
  const side = m.cell * scale;
  const offset = (m.cell - side) / 2;

  ctx.globalAlpha = alpha;
  ctx.fillStyle = TILE_FILL[value] ?? BIG_TILE_FILL;
  roundRect(ctx, x + offset, y + offset, side, side, m.radius * scale);

  const digits = String(value);
  // Shrink as the numbers grow so 1024 still fits inside its tile.
  const base = m.cell * (digits.length >= 4 ? 0.34 : digits.length === 3 ? 0.42 : 0.5);
  ctx.fillStyle = value <= 4 ? DARK_TEXT : LIGHT_TEXT;
  ctx.font = `700 ${base * scale}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(digits, x + m.cell / 2, y + m.cell / 2 + base * 0.04);
  ctx.globalAlpha = 1;
}

export function draw(
  ctx: CanvasRenderingContext2D,
  size: number,
  grid: Grid,
  phase: Phase | null,
  now: number,
  durations: Durations,
): void {
  const m = metrics(size);

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = BOARD_BG;
  roundRect(ctx, 0, 0, size, size, Math.max(5, size * 0.02));

  ctx.fillStyle = EMPTY_CELL;
  for (let i = 0; i < SIZE * SIZE; i += 1) {
    roundRect(ctx, cellX(i, m), cellY(i, m), m.cell, m.cell, m.radius);
  }

  if (!phase) {
    grid.forEach((value, index) => {
      if (value !== null) drawTile(ctx, value, cellX(index, m), cellY(index, m), m, 1, 1);
    });
    return;
  }

  const elapsed = now - phase.startedAt;

  if (elapsed < durations.move) {
    // Tiles are still travelling; they carry their pre-merge value.
    const t = easeOut(clamp01(elapsed / durations.move));
    for (const movement of phase.movements) {
      const fromX = cellX(movement.from, m);
      const fromY = cellY(movement.from, m);
      drawTile(
        ctx,
        movement.value,
        fromX + (cellX(movement.to, m) - fromX) * t,
        fromY + (cellY(movement.to, m) - fromY) * t,
        m,
        1,
        1,
      );
    }
    return;
  }

  const after = elapsed - durations.move;
  const popT = clamp01(after / durations.pop);
  const spawnT = clamp01(after / durations.spawn);

  phase.gridAfter.forEach((value, index) => {
    if (value === null) return;
    if (phase.spawn && phase.spawn.index === index) return; // drawn below, fading in

    const scale = phase.merged.includes(index) ? pop(popT) : 1;
    drawTile(ctx, value, cellX(index, m), cellY(index, m), m, scale, 1);
  });

  if (phase.spawn) {
    drawTile(
      ctx,
      phase.spawn.value,
      cellX(phase.spawn.index, m),
      cellY(phase.spawn.index, m),
      m,
      0.4 + 0.6 * easeOut(spawnT),
      spawnT,
    );
  }
}
