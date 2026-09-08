/** Animation timings, and the one rule that overrides them. */

export interface Durations {
  move: number;
  pop: number;
  spawn: number;
}

const FULL: Durations = { move: 100, pop: 120, spawn: 120 };
/** Not zero: the phase machine still needs an ordering to step through. */
const REDUCED: Durations = { move: 1, pop: 1, spawn: 1 };

const query = (): MediaQueryList | null =>
  typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

/**
 * Watches the motion preference. Calls back immediately with the current
 * value, then whenever the user changes it.
 */
export function watchDurations(onChange: (durations: Durations) => void): () => void {
  const mq = query();
  const deliver = (): void => onChange(mq?.matches ? REDUCED : FULL);
  deliver();
  mq?.addEventListener('change', deliver);
  return () => mq?.removeEventListener('change', deliver);
}

export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

/** Cubic ease-out: fast departure, soft arrival. */
export const easeOut = (t: number): number => 1 - (1 - t) ** 3;

/** Overshoot and settle, for the merge pop. */
export function pop(t: number): number {
  const e = clamp01(t);
  return 1 + 0.18 * Math.sin(e * Math.PI);
}
