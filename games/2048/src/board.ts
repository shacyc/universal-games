/**
 * The rules of 2048. No DOM, no canvas, no SDK — every function here is pure,
 * so the merge edge cases can be tested directly.
 */

export const SIZE = 4;
export const CELLS = SIZE * SIZE;
export const WIN_TILE = 2048;

export type Cell = number | null;
/** Length 16, row-major, matching the saved shape. */
export type Grid = Cell[];
export type Direction = 'up' | 'down' | 'left' | 'right';

export function emptyGrid(): Grid {
  return new Array<Cell>(CELLS).fill(null);
}

/**
 * The cells of one row or column, ordered from the leading edge inward — the
 * edge the tiles are sliding towards comes first. Every direction reduces to
 * the same left-to-right problem once read through this.
 */
export function lineIndices(direction: Direction, line: number): number[] {
  const indices: number[] = [];
  for (let i = 0; i < SIZE; i += 1) {
    switch (direction) {
      case 'left':
        indices.push(line * SIZE + i);
        break;
      case 'right':
        indices.push(line * SIZE + (SIZE - 1 - i));
        break;
      case 'up':
        indices.push(i * SIZE + line);
        break;
      case 'down':
        indices.push((SIZE - 1 - i) * SIZE + line);
        break;
    }
  }
  return indices;
}

export interface LineSlot {
  value: number;
  /** Positions within the input line that ended up here (two when merged). */
  sources: number[];
  merged: boolean;
}

export interface LineResult {
  slots: LineSlot[];
  gained: number;
}

/**
 * Resolves one line, index 0 being the leading edge.
 *
 * Pairs are taken from the leading edge inward and each tile is consumed once,
 * which is what stops a tile produced by a merge from merging again in the
 * same move: `[2,2,2,2]` gives `[4,4]`, never `[8]`.
 */
export function resolveLine(line: Cell[]): LineResult {
  const filled: { value: number; at: number }[] = [];
  line.forEach((value, at) => {
    if (value !== null) filled.push({ value, at });
  });

  const slots: LineSlot[] = [];
  let gained = 0;

  let i = 0;
  while (i < filled.length) {
    const first = filled[i];
    if (!first) break;
    const second = filled[i + 1];

    if (second && second.value === first.value) {
      const value = first.value * 2;
      slots.push({ value, sources: [first.at, second.at], merged: true });
      gained += value;
      i += 2;
    } else {
      slots.push({ value: first.value, sources: [first.at], merged: false });
      i += 1;
    }
  }

  return { slots, gained };
}

export interface Movement {
  from: number;
  to: number;
  /** The value carried while travelling — before any merge is applied. */
  value: number;
  merged: boolean;
}

export interface MoveResult {
  grid: Grid;
  gained: number;
  /** False when nothing shifted: not a move, so no spawn, score or undo entry. */
  moved: boolean;
  movements: Movement[];
}

export function move(grid: Grid, direction: Direction): MoveResult {
  const next = emptyGrid();
  const movements: Movement[] = [];
  let gained = 0;

  for (let line = 0; line < SIZE; line += 1) {
    const indices = lineIndices(direction, line);
    const values = indices.map((cell) => grid[cell] ?? null);
    const resolved = resolveLine(values);
    gained += resolved.gained;

    resolved.slots.forEach((slot, position) => {
      const to = indices[position];
      if (to === undefined) return;
      next[to] = slot.value;

      for (const source of slot.sources) {
        const from = indices[source];
        const value = from === undefined ? undefined : grid[from];
        if (from === undefined || value === undefined || value === null) continue;
        movements.push({ from, to, value, merged: slot.merged });
      }
    });
  }

  return {
    grid: next,
    gained,
    moved: next.some((value, cell) => value !== grid[cell]),
    movements,
  };
}

export interface Spawn {
  index: number;
  value: number;
}

/** 90% a 2, 10% a 4, in a uniformly random empty cell. */
export function spawn(grid: Grid, random: () => number): Spawn | null {
  const empty: number[] = [];
  grid.forEach((value, index) => {
    if (value === null) empty.push(index);
  });
  if (empty.length === 0) return null;

  const index = empty[Math.floor(random() * empty.length)];
  if (index === undefined) return null;
  return { index, value: random() < 0.9 ? 2 : 4 };
}

export function newGrid(random: () => number): Grid {
  const grid = emptyGrid();
  for (let i = 0; i < 2; i += 1) {
    const seed = spawn(grid, random);
    if (seed) grid[seed.index] = seed.value;
  }
  return grid;
}

/** Locked up: no empty cell and no orthogonal neighbours of equal value. */
export function isGameOver(grid: Grid): boolean {
  if (grid.some((value) => value === null)) return false;

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const value = grid[row * SIZE + col];
      if (col + 1 < SIZE && value === grid[row * SIZE + col + 1]) return false;
      if (row + 1 < SIZE && value === grid[(row + 1) * SIZE + col]) return false;
    }
  }
  return true;
}

export function highestTile(grid: Grid): number {
  return grid.reduce<number>((best, value) => (value !== null && value > best ? value : best), 0);
}

/**
 * Removes the `count` lowest-value tiles. Backs the rewarded "continue" offer,
 * which hands a locked board back to the player with a little room.
 */
export function clearLowest(grid: Grid, count: number): Grid {
  const filled = grid
    .map((value, index) => ({ value, index }))
    .filter((cell): cell is { value: number; index: number } => cell.value !== null)
    .sort((a, b) => a.value - b.value || a.index - b.index);

  const next = [...grid];
  for (const cell of filled.slice(0, count)) next[cell.index] = null;
  return next;
}
