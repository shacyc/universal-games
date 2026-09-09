import { describe, expect, it } from 'vitest';
import {
  CELLS,
  CENTRE,
  GRID,
  type Dir,
  type Run,
  newRun,
  queueTurn,
  reviveRun,
  scoreFor,
  spawnFood,
  speedAfter,
  step,
} from '../src/snake.js';
import { fromSavedRun, isSaveState, toSavedRun, type SaveState } from '../src/save.js';

/** Cell index from grid coordinates, written the way the board reads. */
const at = (x: number, y: number): number => x + y * GRID;

/** A deterministic `rng` that always picks the first free cell. */
const rng0 = (): number => 0;

/** Build a run with sane defaults; `over` pins whatever a case cares about. */
function make(body: number[], dir: Dir, over: Partial<Run> = {}): Run {
  return {
    body,
    dir,
    food: -1, // nothing to eat unless a case sets it
    score: 0,
    speed: 6,
    revived: false,
    pendingTurns: [],
    dead: false,
    justAte: false,
    ...over,
  };
}

describe('scoreFor — 10 + floor(level), capped (U1–U4)', () => {
  it('scoreFor: first food is worth 10', () => {
    expect(scoreFor(6)).toBe(10);
  });

  it('scoreFor: level 21 is worth 31', () => {
    expect(scoreFor(6 + 21 * 0.35)).toBe(31);
  });

  it('scoreFor: level 22 is worth 32', () => {
    expect(scoreFor(6 + 22 * 0.35)).toBe(32);
  });

  it('scoreFor: capped speed stays at 32', () => {
    expect(scoreFor(14)).toBe(32);
    expect(scoreFor(999)).toBe(32);
  });
});

describe('speedAfter — +0.35 per food, capped at 14 (U5)', () => {
  it('speedAfter: rises by 0.35 and caps at 14', () => {
    expect(speedAfter(6)).toBeCloseTo(6.35, 10);
    expect(speedAfter(13.8)).toBe(14);
    expect(speedAfter(6 + 22 * 0.35)).toBe(14);
  });
});

describe('step — eating (U6, U7)', () => {
  it('step: eating grows the snake and spawns new food', () => {
    const run = make([at(5, 7), at(4, 7), at(3, 7)], 'right', { food: at(6, 7) });
    const next = step(run, rng0);

    expect(next.dead).toBe(false);
    expect(next.justAte).toBe(true);
    expect(next.body).toHaveLength(4);
    expect(next.body[0]).toBe(at(6, 7));
    expect(next.score).toBe(10);
    expect(next.speed).toBeCloseTo(6.35, 10);
    expect(next.food).toBeGreaterThanOrEqual(0);
    expect(next.body).not.toContain(next.food);
  });

  it('step: justAte is false on a non-eating tick', () => {
    const run = make([at(5, 7), at(4, 7), at(3, 7)], 'right');
    const next = step(run, rng0);
    expect(next.justAte).toBe(false);
    expect(next.body).toHaveLength(3);
    expect(next.body[0]).toBe(at(6, 7));
  });
});

describe('step — collisions (U8, U9, U10)', () => {
  it('step: moving into the vacating tail cell is legal', () => {
    // Head (6,5) heading right; a body that loops so the tail sits at (6,6),
    // the cell a queued 'down' takes the head into.
    const run = make([at(6, 5), at(5, 5), at(5, 6), at(6, 6)], 'right');
    const turned = queueTurn(run, 'down');
    const next = step(turned, rng0);

    expect(next.dead).toBe(false);
    expect(next.body[0]).toBe(at(6, 6));
  });

  it('step: running into the body ends the run', () => {
    // Same loop, one segment longer, so (6,6) is body — not the tail (7,6).
    const run = make([at(6, 5), at(5, 5), at(5, 6), at(6, 6), at(7, 6)], 'right');
    const turned = queueTurn(run, 'down');
    const next = step(turned, rng0);

    expect(next.dead).toBe(true);
  });

  it.each<[Dir, number[]]>([
    ['up', [at(7, 0), at(7, 1), at(7, 2)]],
    ['down', [at(7, 14), at(7, 13), at(7, 12)]],
    ['left', [at(0, 7), at(1, 7), at(2, 7)]],
    ['right', [at(14, 7), at(13, 7), at(12, 7)]],
  ])('step: leaving the %s edge ends the run', (dir, body) => {
    const next = step(make(body, dir), rng0);
    expect(next.dead).toBe(true);
  });
});

describe('step — randomness and exhaustion (U11, U12)', () => {
  it('step: new food never lands on the snake', () => {
    const body = Array.from({ length: 200 }, (_, i) => i); // cells 0..199
    for (let i = 0; i < 500; i += 1) {
      const r = i / 500; // sweep [0, 1)
      const food = spawnFood(body, () => r);
      expect(food).toBeGreaterThanOrEqual(0);
      expect(food).toBeLessThan(CELLS);
      expect(body).not.toContain(food);
    }
  });

  it('step: a full board ends the run without hanging', () => {
    const full = Array.from({ length: CELLS }, (_, i) => i);
    expect(spawnFood(full, rng0)).toBe(-1);

    const run = make(full, 'right');
    const next = step(run, rng0);
    expect(next.dead).toBe(true);
  });
});

describe('queueTurn — legality and depth (U13, U14, U15, U16)', () => {
  it('queueTurn: a direct 180 is dropped', () => {
    const run = make([at(5, 7), at(4, 7), at(3, 7)], 'right');
    const turned = queueTurn(run, 'left');
    expect(turned.pendingTurns).toEqual([]);
    expect(step(turned, rng0).dir).toBe('right');
  });

  it('queueTurn: a turn that reverses the last pending turn is dropped', () => {
    const run = make([at(5, 7), at(4, 7), at(3, 7)], 'right');
    const q1 = queueTurn(run, 'up');
    const q2 = queueTurn(q1, 'down'); // reverses the pending 'up'
    expect(q2.pendingTurns).toEqual(['up']);
  });

  it('queueTurn: the queue never exceeds two', () => {
    const run = make([at(5, 7), at(4, 7), at(3, 7)], 'right');
    const q = queueTurn(queueTurn(queueTurn(run, 'up'), 'left'), 'down');
    expect(q.pendingTurns).toEqual(['up', 'left']);
  });

  it('step: queued turns are consumed one per tick', () => {
    const run = make([at(5, 7), at(4, 7), at(3, 7)], 'right');
    const queued = queueTurn(queueTurn(run, 'up'), 'left');

    const s1 = step(queued, rng0);
    expect(s1.dir).toBe('up');
    expect(s1.pendingTurns).toEqual(['left']);
    expect(s1.body[0]).toBe(at(5, 6));

    const s2 = step(s1, rng0);
    expect(s2.dir).toBe('left');
    expect(s2.pendingTurns).toEqual([]);
    expect(s2.body[0]).toBe(at(4, 6));
  });
});

describe('reviveRun — brief §6 / Q2–Q5 (U17, U18, U19)', () => {
  it('reviveRun: 5 centred segments, score and speed kept', () => {
    const long = Array.from({ length: 20 }, (_, i) => at(i % GRID, Math.floor(i / GRID)));
    const dead = make(long, 'down', { dead: true, score: 250, speed: 12 });
    const revived = reviveRun(dead, rng0);

    expect(revived.body).toEqual([CENTRE, CENTRE - 1, CENTRE - 2, CENTRE - 3, CENTRE - 4]);
    expect(revived.score).toBe(250);
    expect(revived.speed).toBe(12);
    expect(revived.revived).toBe(true);
    expect(revived.dead).toBe(false);
    expect(revived.dir).toBe('right');
    expect(revived.pendingTurns).toEqual([]);
  });

  it('reviveRun: a short snake is grown to 5', () => {
    const dead = make([at(7, 7), at(6, 7), at(5, 7)], 'right', { dead: true });
    expect(reviveRun(dead, rng0).body).toHaveLength(5);
  });

  it('reviveRun: food is respawned clear of the new snake', () => {
    const dead = make([at(7, 7), at(6, 7), at(5, 7)], 'right', { dead: true, food: CENTRE - 2 });
    const revived = reviveRun(dead, rng0);
    expect(revived.food).toBeGreaterThanOrEqual(0);
    expect(revived.body).not.toContain(revived.food);
  });
});

describe('step — a dead run is inert (U20, U21)', () => {
  it('step: a dead run does not advance', () => {
    const run = make([at(3, 3), at(2, 3), at(1, 3)], 'right', { dead: true, score: 50 });
    const next = step(run, rng0);
    expect(next).toBe(run); // reference-equal: nothing was recomputed
  });

  it('step: the end of a run is detected exactly once', () => {
    const live = make([at(14, 7), at(13, 7), at(12, 7)], 'right');
    const d1 = step(live, rng0);
    expect(d1.dead).toBe(true);
    const d2 = step(d1, rng0);
    expect(d2).toBe(d1); // the second step is a no-op, not a re-detection
  });
});

describe('save — round-trip and validation (U22, U23)', () => {
  it('save: a run survives a save/load round-trip', () => {
    const run = make([at(3, 3), at(2, 3), at(1, 3)], 'right', {
      food: at(1, 1),
      score: 40,
      speed: 6.7,
      revived: true,
      pendingTurns: ['up'],
      justAte: true,
    });

    const state: SaveState = { v: 1, best: 90, run: toSavedRun(run) };
    const parsed = isSaveState(state);
    expect(parsed).not.toBeNull();

    const back = fromSavedRun(parsed!.run!);
    expect(back.body).toEqual(run.body);
    expect(back.dir).toBe(run.dir);
    expect(back.food).toBe(run.food);
    expect(back.score).toBe(run.score);
    expect(back.speed).toBe(run.speed);
    expect(back.revived).toBe(run.revived);
    expect(back.pendingTurns).toEqual([]); // not persisted
    expect(back.justAte).toBe(false);
    expect(back.dead).toBe(false);
  });

  const good = { body: [1, 2, 3], dir: 'up', food: 5, score: 0, speed: 6, revived: false };

  it.each<[string, unknown]>([
    ['null', null],
    ['undefined', undefined],
    ['a number', 42],
    ['an empty object', {}],
    ['no best', { v: 1, run: null }],
    ['wrong version', { v: 2, best: 0, run: null }],
    ['negative best', { v: 1, best: -5, run: null }],
    ['body too short', { v: 1, best: 0, run: { ...good, body: [1, 2] } }],
    ['duplicate body cells', { v: 1, best: 0, run: { ...good, body: [1, 1, 1] } }],
    ['body cell out of range', { v: 1, best: 0, run: { ...good, body: [1, 2, CELLS] } }],
    ['food under the body', { v: 1, best: 0, run: { ...good, food: 2 } }],
    ['unknown dir', { v: 1, best: 0, run: { ...good, dir: 'sideways' } }],
  ])('save: a malformed save returns null — %s', (_label, raw) => {
    expect(isSaveState(raw)).toBeNull();
  });

  it('save: a valid state parses', () => {
    expect(isSaveState({ v: 1, best: 0, run: null })).not.toBeNull();
    expect(isSaveState({ v: 1, best: 12, run: good })).not.toBeNull();
  });
});

describe('newRun — matches the brief (U24)', () => {
  it('newRun: a fresh run matches the brief', () => {
    const run = newRun(rng0);
    expect(run.body).toEqual([CENTRE, CENTRE - 1, CENTRE - 2]);
    expect(run.dir).toBe('right');
    expect(run.speed).toBe(6);
    expect(run.score).toBe(0);
    expect(run.revived).toBe(false);
    expect(run.pendingTurns).toEqual([]);
    expect(run.dead).toBe(false);
    expect(run.justAte).toBe(false);
    expect(run.food).toBeGreaterThanOrEqual(0);
    expect(run.food).toBeLessThan(CELLS);
    expect(run.body).not.toContain(run.food);
  });
});
