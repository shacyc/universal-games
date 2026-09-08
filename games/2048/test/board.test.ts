import { describe, expect, it } from 'vitest';
import {
  clearLowest, emptyGrid, highestTile, isGameOver, lineIndices, move, newGrid,
  resolveLine, spawn, type Cell, type Grid,
} from '../src/board.js';

/** Reads a resolved line back as plain values, padded with nulls. */
function line(input: Cell[]): Cell[] {
  const { slots } = resolveLine(input);
  const out: Cell[] = slots.map((s) => s.value);
  while (out.length < input.length) out.push(null);
  return out;
}

/** Builds a grid from four rows, written the way the board reads. */
function grid(...rows: Cell[][]): Grid {
  return rows.flat();
}

describe('resolveLine — index 0 is the leading edge', () => {
  // The five cases named in docs/brief.md §10.
  it('[2,2,2,2] -> [4,4] — a merged tile cannot merge again', () => {
    expect(line([2, 2, 2, 2])).toEqual([4, 4, null, null]);
  });

  it('[4,4,2,2] -> [8,4]', () => {
    expect(line([4, 4, 2, 2])).toEqual([8, 4, null, null]);
  });

  it('[2,2,4,null] -> [4,4]', () => {
    expect(line([2, 2, 4, null])).toEqual([4, 4, null, null]);
  });

  it('[2,null,2,4] -> [4,4] — a gap does not stop a merge', () => {
    expect(line([2, null, 2, 4])).toEqual([4, 4, null, null]);
  });

  it('resolves from the leading edge inward, not the far end', () => {
    // If it resolved from the far end this would be [2,4,4] -> [2,8].
    expect(line([2, 4, 4, null])).toEqual([2, 8, null, null]);
  });

  it('scores the value of each tile created by a merge', () => {
    expect(resolveLine([2, 2, 2, 2]).gained).toBe(8);
    expect(resolveLine([4, 4, 2, 2]).gained).toBe(12);
    expect(resolveLine([2, 4, 8, 16]).gained).toBe(0);
  });

  it('reports which cells fed each slot, so movement can be animated', () => {
    const { slots } = resolveLine([2, null, 2, 4]);
    expect(slots[0]).toEqual({ value: 4, sources: [0, 2], merged: true });
    expect(slots[1]).toEqual({ value: 4, sources: [3], merged: false });
  });

  it('leaves an empty line empty', () => {
    expect(line([null, null, null, null])).toEqual([null, null, null, null]);
  });
});

describe('lineIndices', () => {
  it('orders each direction from the edge the tiles slide towards', () => {
    expect(lineIndices('left', 0)).toEqual([0, 1, 2, 3]);
    expect(lineIndices('right', 0)).toEqual([3, 2, 1, 0]);
    expect(lineIndices('up', 0)).toEqual([0, 4, 8, 12]);
    expect(lineIndices('down', 0)).toEqual([12, 8, 4, 0]);
  });
});

describe('move', () => {
  it('a single tile at the far edge does not move towards that edge', () => {
    // docs/brief.md §10: `[null,null,null,2]` unchanged when sliding that way.
    const before = grid(
      [null, null, null, 2],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    );
    const result = move(before, 'right');
    expect(result.grid).toEqual(before);
    expect(result.moved).toBe(false);
    expect(result.gained).toBe(0);
  });

  it('the same tile does move the other way', () => {
    const before = grid(
      [null, null, null, 2],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    );
    const result = move(before, 'left');
    expect(result.moved).toBe(true);
    expect(result.grid.slice(0, 4)).toEqual([2, null, null, null]);
    expect(result.movements).toEqual([{ from: 3, to: 0, value: 2, merged: false }]);
  });

  it('slides and merges every row at once', () => {
    const before = grid(
      [2, 2, 4, 4],
      [null, 2, null, 2],
      [4, null, null, 4],
      [2, 4, 2, 4],
    );
    const result = move(before, 'left');
    expect(result.grid).toEqual(grid(
      [4, 8, null, null],
      [4, null, null, null],
      [8, null, null, null],
      [2, 4, 2, 4],
    ));
    expect(result.gained).toBe(4 + 8 + 4 + 8);
  });

  it('slides columns', () => {
    const before = grid(
      [2, null, null, null],
      [2, null, null, null],
      [4, null, null, null],
      [null, null, null, null],
    );
    const result = move(before, 'up');
    expect(result.grid.filter((v) => v !== null)).toEqual([4, 4]);
    expect(result.grid[0]).toBe(4);
    expect(result.grid[4]).toBe(4);
  });

  it('reports both tiles of a merge as travelling to the same cell', () => {
    const before = grid(
      [2, null, 2, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    );
    expect(move(before, 'left').movements).toEqual([
      { from: 0, to: 0, value: 2, merged: true },
      { from: 2, to: 0, value: 2, merged: true },
    ]);
  });

  it('a full board with no equal neighbours is not a move in any direction', () => {
    const locked = grid(
      [2, 4, 8, 16],
      [4, 8, 16, 2],
      [8, 16, 2, 4],
      [16, 2, 4, 8],
    );
    for (const direction of ['up', 'down', 'left', 'right'] as const) {
      expect(move(locked, direction).moved).toBe(false);
    }
  });
});

describe('spawn', () => {
  it('places a 2 ninety percent of the time and a 4 otherwise', () => {
    const g = emptyGrid();
    expect(spawn(g, () => 0)?.value).toBe(2);
    // second draw decides the value: 0.95 is above the 0.9 threshold
    const draws = [0, 0.95];
    let i = 0;
    expect(spawn(g, () => draws[i++] ?? 0)?.value).toBe(4);
  });

  it('only ever lands in an empty cell', () => {
    const g = emptyGrid();
    g.fill(2);
    g[7] = null;
    expect(spawn(g, () => 0.5)?.index).toBe(7);
  });

  it('returns null when the board is full', () => {
    const g = emptyGrid().map(() => 2);
    expect(spawn(g, () => 0.5)).toBeNull();
  });
});

describe('newGrid', () => {
  it('starts with exactly two tiles', () => {
    const values = [0.1, 0.2, 0.3, 0.4];
    let i = 0;
    const g = newGrid(() => values[i++ % values.length] ?? 0.5);
    expect(g.filter((v) => v !== null)).toHaveLength(2);
  });
});

describe('isGameOver', () => {
  it('is false while an empty cell remains', () => {
    const g = emptyGrid();
    g[0] = 2;
    expect(isGameOver(g)).toBe(false);
  });

  it('is false on a full board with an equal neighbour', () => {
    expect(isGameOver(grid(
      [2, 4, 8, 16],
      [4, 8, 16, 2],
      [8, 16, 2, 4],
      [16, 2, 4, 4],
    ))).toBe(false);
  });

  it('is true on a full board with no equal neighbours', () => {
    expect(isGameOver(grid(
      [2, 4, 8, 16],
      [4, 8, 16, 2],
      [8, 16, 2, 4],
      [16, 2, 4, 8],
    ))).toBe(true);
  });
});

describe('clearLowest', () => {
  it('removes the four lowest tiles and leaves the rest untouched', () => {
    const before = grid(
      [2, 4, 8, 16],
      [4, 8, 16, 32],
      [8, 16, 32, 64],
      [16, 32, 64, 128],
    );
    const after = clearLowest(before, 4);
    expect(after.filter((v) => v === null)).toHaveLength(4);
    // the four lowest were 2, 4, 4, 8
    expect(after[0]).toBeNull();
    expect(after[1]).toBeNull();
    expect(after[4]).toBeNull();
    expect(after[2]).toBeNull();
    expect(after[15]).toBe(128);
  });
});

describe('highestTile', () => {
  it('reports the biggest tile on the board', () => {
    expect(highestTile(grid([2, 4, 8, 16], [null, null, null, null], [null, null, null, null], [null, null, null, 512]))).toBe(512);
    expect(highestTile(emptyGrid())).toBe(0);
  });
});
