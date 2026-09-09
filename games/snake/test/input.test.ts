import { describe, expect, it } from 'vitest';
import { keyDir, swipeDir, SWIPE_THRESHOLD } from '../src/input.js';

describe('swipeDir — larger axis wins, threshold 24px (U25)', () => {
  it('swipeDir: a drag under the threshold on both axes is not a swipe', () => {
    expect(swipeDir(10, -12)).toBeNull();
    expect(swipeDir(SWIPE_THRESHOLD - 1, SWIPE_THRESHOLD - 1)).toBeNull();
  });

  it('swipeDir: the larger axis decides the direction', () => {
    expect(swipeDir(40, 8)).toBe('right');
    expect(swipeDir(-40, 8)).toBe('left');
    expect(swipeDir(8, 40)).toBe('down');
    expect(swipeDir(8, -40)).toBe('up');
  });

  it('swipeDir: a diagonal past the threshold resolves to one axis, never two', () => {
    const d = swipeDir(30, -50);
    expect(d).toBe('up'); // |dy| > |dx|
  });

  it('swipeDir: a tie goes to the horizontal axis', () => {
    expect(swipeDir(30, 30)).toBe('right');
    expect(swipeDir(-30, -30)).toBe('left');
  });
});

describe('keyDir — arrows and WASD (U26)', () => {
  it('keyDir: maps the arrow keys', () => {
    expect(keyDir('ArrowUp')).toBe('up');
    expect(keyDir('ArrowDown')).toBe('down');
    expect(keyDir('ArrowLeft')).toBe('left');
    expect(keyDir('ArrowRight')).toBe('right');
  });

  it('keyDir: maps WASD in either case', () => {
    expect(keyDir('w')).toBe('up');
    expect(keyDir('S')).toBe('down');
    expect(keyDir('a')).toBe('left');
    expect(keyDir('D')).toBe('right');
  });

  it('keyDir: ignores everything else', () => {
    expect(keyDir(' ')).toBeNull();
    expect(keyDir('Enter')).toBeNull();
    expect(keyDir('q')).toBeNull();
  });
});
