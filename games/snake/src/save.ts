/**
 * The save shape (brief §5) and the storage-boundary validator, kept as pure
 * functions so the round-trip is unit-tested without importing the SDK client.
 * `session.ts` wires `isSaveState` into `createSaveSlot`.
 *
 * Deviation from plan §1, which parked these in `session.ts` — moved here so
 * `test/snake.test.ts` can cover U22/U23 (progress.md §4).
 */
import { CELLS, type Dir, type Run } from './snake.js';

export interface SaveState {
  v: 1;
  best: number;
  run: SavedRun | null;
}

export interface SavedRun {
  body: number[];
  dir: Dir;
  food: number;
  score: number;
  speed: number;
  revived: boolean;
}

const isDir = (v: unknown): v is Dir =>
  v === 'up' || v === 'down' || v === 'left' || v === 'right';

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * The persisted slice of a live run. `pendingTurns`, `justAte` and `dead` are
 * left out on purpose (plan §3): a restored run is paused and re-oriented, and
 * the two flags are recomputed each tick.
 */
export function toSavedRun(run: Run): SavedRun {
  return {
    body: run.body.slice(),
    dir: run.dir,
    food: run.food,
    score: run.score,
    speed: run.speed,
    revived: run.revived,
  };
}

/** Rebuild a live `Run` from a validated `SavedRun`: empty turn queue, alive,
 *  not mid-eat. */
export function fromSavedRun(saved: SavedRun): Run {
  return {
    body: saved.body.slice(),
    dir: saved.dir,
    food: saved.food,
    score: saved.score,
    speed: saved.speed,
    revived: saved.revived,
    pendingTurns: [],
    dead: false,
    justAte: false,
  };
}

function isSavedRun(value: unknown): value is SavedRun {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;

  if (!Array.isArray(r.body) || r.body.length < 3) return false;
  if (!r.body.every((c) => isInt(c) && c >= 0 && c < CELLS)) return false;
  if (new Set(r.body as number[]).size !== r.body.length) return false;

  if (!isDir(r.dir)) return false;

  if (!isInt(r.food) || r.food < 0 || r.food >= CELLS) return false;
  if ((r.body as number[]).includes(r.food)) return false;

  if (!isFiniteNum(r.score) || r.score < 0) return false;
  if (!isFiniteNum(r.speed)) return false;

  if (typeof r.revived !== 'boolean') return false;
  return true;
}

/**
 * The storage boundary. `load()` returns `unknown`; anything this does not
 * recognise becomes `null` — `createSaveSlot` turns that into "start fresh" and
 * stops writing, so a boot-fresh cannot overwrite a run the player still had
 * (decision 4 in docs/sdk-decisions.md).
 */
export function isSaveState(raw: unknown): SaveState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const s = raw as Record<string, unknown>;

  if (s.v !== 1) return null;

  const best = s.best;
  if (!isFiniteNum(best) || best < 0) return null;

  const run = s.run;
  if (run !== null && !isSavedRun(run)) return null;

  return {
    v: 1,
    best,
    run:
      run === null
        ? null
        : {
            body: run.body.slice(),
            dir: run.dir,
            food: run.food,
            score: run.score,
            speed: run.speed,
            revived: run.revived,
          },
  };
}
