import type { Direction } from './board.js';

const SWIPE_THRESHOLD = 24;

const KEYS: Record<string, Direction> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', a: 'left', s: 'down', d: 'right',
  W: 'up', A: 'left', S: 'down', D: 'right',
};

/**
 * Swipe and keyboard, both reduced to a direction.
 *
 * No tap-to-move and no on-screen d-pad by design. The surface must carry
 * `touch-action: none` or the browser scrolls the page instead.
 */
export function createInput(surface: HTMLElement, onDirection: (direction: Direction) => void): () => void {
  let startX = 0;
  let startY = 0;
  let tracking = false;

  const onPointerDown = (event: PointerEvent): void => {
    tracking = true;
    startX = event.clientX;
    startY = event.clientY;
    surface.setPointerCapture(event.pointerId);
  };

  const finish = (event: PointerEvent): void => {
    if (!tracking) return;
    tracking = false;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    // Whichever axis travelled further wins; a short flick is not a swipe.
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;

    if (Math.abs(dx) > Math.abs(dy)) onDirection(dx > 0 ? 'right' : 'left');
    else onDirection(dy > 0 ? 'down' : 'up');
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const direction = KEYS[event.key];
    if (!direction) return;
    event.preventDefault();
    onDirection(direction);
  };

  surface.addEventListener('pointerdown', onPointerDown);
  surface.addEventListener('pointerup', finish);
  surface.addEventListener('pointercancel', () => {
    tracking = false;
  });
  window.addEventListener('keydown', onKeyDown);

  return () => {
    surface.removeEventListener('pointerdown', onPointerDown);
    surface.removeEventListener('pointerup', finish);
    window.removeEventListener('keydown', onKeyDown);
  };
}
