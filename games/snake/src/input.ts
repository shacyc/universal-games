/**
 * Input: swipes on the play surface and arrow / WASD keys, decoded to a `Dir`
 * and handed to `onTurn`. Legality — the 180° rule, the queue depth — is the
 * pure core's job (`queueTurn`), not this module's; every decoded direction is
 * passed on as-is.
 *
 * The decode itself is two pure functions so `test/input.test.ts` can pin them
 * without a DOM.
 */
import type { Dir } from './snake.js';

/** Swipe distance that counts as a swipe (brief §3). */
export const SWIPE_THRESHOLD = 24;

const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  a: 'left',
  s: 'down',
  d: 'right',
  W: 'up',
  A: 'left',
  S: 'down',
  D: 'right',
};

/**
 * The turn a drag of `(dx, dy)` pixels means, or `null` when it is under the
 * threshold on both axes. The larger axis wins (brief §3).
 */
export function swipeDir(dx: number, dy: number): Dir | null {
  if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/** The turn a key means, or `null`. Arrows and WASD, either case (brief §3). */
export function keyDir(key: string): Dir | null {
  return KEY_DIRS[key] ?? null;
}

export interface InputController {
  dispose(): void;
}

export function createInput(surface: HTMLElement, onTurn: (dir: Dir) => void): InputController {
  let startX = 0;
  let startY = 0;
  let tracking = false;

  const onKeyDown = (event: KeyboardEvent): void => {
    const dir = keyDir(event.key);
    if (dir === null) return;
    event.preventDefault(); // arrows would scroll the page
    onTurn(dir);
  };

  const onPointerDown = (event: PointerEvent): void => {
    tracking = true;
    startX = event.clientX;
    startY = event.clientY;
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (!tracking) return;
    tracking = false;
    const dir = swipeDir(event.clientX - startX, event.clientY - startY);
    if (dir !== null) onTurn(dir);
  };

  const onPointerCancel = (): void => {
    tracking = false;
  };

  window.addEventListener('keydown', onKeyDown);
  surface.addEventListener('pointerdown', onPointerDown);
  surface.addEventListener('pointerup', onPointerUp);
  surface.addEventListener('pointercancel', onPointerCancel);

  return {
    dispose(): void {
      window.removeEventListener('keydown', onKeyDown);
      surface.removeEventListener('pointerdown', onPointerDown);
      surface.removeEventListener('pointerup', onPointerUp);
      surface.removeEventListener('pointercancel', onPointerCancel);
    },
  };
}
