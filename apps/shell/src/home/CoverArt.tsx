import type { Cover } from '../catalog.js';

/**
 * A game's cover: a coloured field with a handful of positioned rectangles.
 * Data-driven so a new game ships its art in `catalog.json` with no shell
 * change, and so the same art scales from a 42px home-screen icon to the
 * console screen.
 */
export function CoverArt({ cover }: { cover: Cover }): JSX.Element {
  return (
    <div className="cover" style={{ background: cover.bg }}>
      {cover.shapes.map((s, i) => (
        <span
          key={i}
          className="cover__shape"
          style={{ left: s.x, top: s.y, width: s.w, height: s.h, borderRadius: s.r, background: s.c }}
        />
      ))}
    </div>
  );
}
