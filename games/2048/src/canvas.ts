/**
 * Canvas plumbing: keeps the board square and its backing store matched to the
 * device pixel ratio, so it is crisp on a phone and never stretched.
 *
 * The square is computed here rather than in CSS. `aspect-ratio` with
 * `max-width`/`max-height` looks like it should work, but when the clamp binds
 * only one axis follows, and the element ends up a rectangle with a square
 * bitmap stretched into it.
 */

export interface Surface {
  ctx: CanvasRenderingContext2D;
  /** Logical (CSS px) side of the square board. */
  size: number;
  dispose(): void;
}

export function createSurface(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  onResize: () => void,
): Surface {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas context is unavailable');

  const surface: Surface = { ctx, size: 0, dispose: () => undefined };

  const fit = (notify: boolean): void => {
    const rect = container.getBoundingClientRect();
    const side = Math.max(1, Math.floor(Math.min(rect.width, rect.height)));
    const dpr = Math.min(window.devicePixelRatio || 1, 3);

    surface.size = side;
    canvas.style.width = `${side}px`;
    canvas.style.height = `${side}px`;
    canvas.width = Math.round(side * dpr);
    canvas.height = Math.round(side * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (notify) onResize();
  };

  // The first fit must not call back: the caller is still evaluating the
  // `const surface = createSurface(...)` binding, so anything reading it now
  // hits the temporal dead zone.
  fit(false);

  // Observes the container, not the canvas — sizing the canvas from its own
  // box would feed back into the observer.
  const observer = new ResizeObserver(() => fit(true));
  observer.observe(container);

  surface.dispose = () => observer.disconnect();
  return surface;
}
