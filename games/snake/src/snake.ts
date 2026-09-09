/**
 * Snake — the pure game rules. No DOM, no `Date.now()`, no `Math.random()`:
 * randomness is injected as `rng: () => number` so a test can pin every spawn.
 *
 * `main.ts` runs the clock and decides *when* to `step`; this module only
 * decides *what one tick does*. `justAte` and `dead` are outputs the renderer
 * reads for the reactive face and the crash effect (brief §4); they are not
 * persisted (plan §3).
 */

export type Dir = 'up' | 'down' | 'left' | 'right';

export const GRID = 15;
export const CELLS = GRID * GRID;

/** The centre cell — where a fresh snake's head sits: (7, 7) on a 15-grid. */
export const CENTRE = (GRID >> 1) + (GRID >> 1) * GRID;

const START_SPEED = 6; // cells/second (brief §2)
const MAX_SPEED = 14;
const SPEED_STEP = 0.35;
const MAX_LEVEL = 22; // the score level caps where the speed caps (brief §2 / Q1)
const MAX_QUEUED_TURNS = 2; // brief §3
const REVIVE_LENGTH = 5; // brief §6 / Q2

export interface Run {
  /** Cell indices, head first. Length >= 3, no duplicates while alive. */
  body: number[];
  /** The direction the head actually moved on the last tick. */
  dir: Dir;
  /** Cell index of the food, or -1 when the board is full and none fits. */
  food: number;
  score: number;
  /** Cells per second, START_SPEED..MAX_SPEED. */
  speed: number;
  revived: boolean;
  /** Queued turns, at most MAX_QUEUED_TURNS, one consumed per tick. */
  pendingTurns: Dir[];
  /** Set once, by `step`, on a fatal tick. A dead run does not advance. */
  dead: boolean;
  /** True only on the tick a food was eaten. Cosmetic (brief §4). */
  justAte: boolean;
}

const DELTA: Record<Dir, readonly [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

const OPPOSITE: Record<Dir, Dir> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

const xOf = (cell: number): number => cell % GRID;
const yOf = (cell: number): number => Math.floor(cell / GRID);

/**
 * A uniformly random empty cell, or -1 if the board is full. Walks the free
 * list by index rather than guess-and-retry, so a nearly full board cannot
 * spin (plan §2).
 */
export function spawnFood(occupied: readonly number[], rng: () => number): number {
  const taken = new Set(occupied);
  const free: number[] = [];
  for (let cell = 0; cell < CELLS; cell += 1) {
    if (!taken.has(cell)) free.push(cell);
  }
  if (free.length === 0) return -1;
  const pick = Math.min(free.length - 1, Math.floor(rng() * free.length));
  return free[pick] as number; // 0 <= pick < free.length, so this is defined
}

export function newRun(rng: () => number): Run {
  // Length 3, horizontal, head at the centre, heading right (brief §2).
  const body = [CENTRE, CENTRE - 1, CENTRE - 2];
  return {
    body,
    dir: 'right',
    food: spawnFood(body, rng),
    score: 0,
    speed: START_SPEED,
    revived: false,
    pendingTurns: [],
    dead: false,
    justAte: false,
  };
}

/**
 * Queue a turn. Returned unchanged — the turn is dropped — when the run is
 * dead, when the queue is full, or when the turn does not change heading or
 * would reverse it. The reference is the *last pending* turn if the queue is
 * non-empty, otherwise the current `dir` (plan §8 D6): checking only against
 * `dir` would let `right`, then a queued `up`, then a queued `down` fold the
 * snake onto itself — the case brief §3 says the rule exists to stop.
 */
export function queueTurn(run: Run, dir: Dir): Run {
  if (run.dead) return run;
  if (run.pendingTurns.length >= MAX_QUEUED_TURNS) return run;
  const reference = run.pendingTurns.at(-1) ?? run.dir;
  if (dir === reference || dir === OPPOSITE[reference]) return run;
  return { ...run, pendingTurns: [...run.pendingTurns, dir] };
}

/**
 * `10 + level`, `level = round((speed - START_SPEED) / SPEED_STEP)`, clamped to
 * `[0, MAX_LEVEL]`. `round`, not `floor`: `speed` is accumulated by repeated
 * `+= 0.35`, and the float drift would otherwise drop a level right on the
 * boundary.
 */
export function scoreFor(speed: number): number {
  const raw = Math.round((speed - START_SPEED) / SPEED_STEP);
  const level = Math.min(MAX_LEVEL, Math.max(0, raw));
  return 10 + level;
}

export function speedAfter(speed: number): number {
  return Math.min(MAX_SPEED, speed + SPEED_STEP);
}

/**
 * One tick. A dead run is returned unchanged (reference-equal). Otherwise:
 * consume up to one queued turn, advance the head, grow on food or move the
 * tail, and resolve wall and self collisions. Moving into the cell the tail
 * vacates *this* tick is legal (brief §2) — unless the snake just ate, when the
 * tail stays put.
 */
export function step(run: Run, rng: () => number): Run {
  if (run.dead) return run;

  const pendingTurns = run.pendingTurns.slice();
  const queued = pendingTurns.shift();
  const dir = queued !== undefined && queued !== OPPOSITE[run.dir] ? queued : run.dir;

  const [dx, dy] = DELTA[dir];
  const head = run.body[0] as number; // body is length >= 3 by construction
  const nx = xOf(head) + dx;
  const ny = yOf(head) + dy;

  // Walls are fatal, no wrap (brief §2). The head is not written onto an
  // off-grid cell; the renderer shows the bonk from the interpolation.
  if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) {
    return { ...run, dir, pendingTurns, dead: true, justAte: false };
  }

  const newHead = nx + ny * GRID;
  const ate = newHead === run.food && run.food >= 0;

  // Cells still solid after this move: the whole body if we grew, all but the
  // vacating tail otherwise.
  const blocking = ate ? run.body : run.body.slice(0, -1);
  if (blocking.includes(newHead)) {
    return { ...run, dir, pendingTurns, dead: true, justAte: false };
  }

  const body = ate ? [newHead, ...run.body] : [newHead, ...run.body.slice(0, -1)];
  const score = ate ? run.score + scoreFor(run.speed) : run.score;
  const speed = ate ? speedAfter(run.speed) : run.speed;
  const food = ate ? spawnFood(body, rng) : run.food;

  return {
    body,
    dir,
    food,
    score,
    speed,
    revived: run.revived,
    pendingTurns,
    dead: false,
    justAte: ate,
  };
}

/**
 * Spend a revive (brief §6, Q2–Q5): the old body is cleared and replaced with
 * exactly REVIVE_LENGTH fresh segments at the centre heading right, the score
 * and speed are kept, the food is respawned clear of the new body, and
 * `revived` is set so a second death in the same run ends it. With the board
 * cleared every direction is equally open, so the canonical orientation from
 * `newRun` is reused.
 */
export function reviveRun(run: Run, rng: () => number): Run {
  const body: number[] = [];
  for (let i = 0; i < REVIVE_LENGTH; i += 1) body.push(CENTRE - i);
  return {
    body,
    dir: 'right',
    food: spawnFood(body, rng),
    score: run.score,
    speed: run.speed,
    revived: true,
    pendingTurns: [],
    dead: false,
    justAte: false,
  };
}
