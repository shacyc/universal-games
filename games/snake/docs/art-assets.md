# Snake — art assets

**The run-list is [`art-assets.json`](./art-assets.json)** — machine-readable,
one object per image with `prompt`, `path`, `file`, `command`, chroma-key notes
and accept checks. Hand that file to an image-generating agent. This page is the
human context.

## Rules

- Bitmap art is generated with the **`agy-image`** skill (rule 13), never
  sourced from the web. The image model has its own daily quota, separate from
  the Claude/`agy`-chat quota.
- **No text, letters or numbers** in any generated image — a word baked into a
  PNG is a string the i18n layer cannot reach.
- `src/assets.ts` loads each file from `public/art/` and **falls back to
  procedural canvas drawing when the file is missing**, so the game is fully
  playable before any of these exist. Dropping the `.webp` files in and running
  `pnpm build` switches them on — no code change.
- The model paints a background, not an alpha channel. Sprites that need
  transparency (`apple`, `title`) are generated on flat magenta `#FF00FF` and
  colour-keyed at load.

## What is a bitmap, and what is not

| Drawn in canvas (no asset) | Why |
| --- | --- |
| the snake body, head, all three face states, the crash tint / shake / flash | it bends and interpolates every frame, rotates to four directions, switches state on the eating tick. A keyed sprite over the canvas body fringes and cannot do any of that crisply. Deviation from brief §4's "face sheet" — `progress.md` §4 row 3. |
| the 3-2-1 countdown, every text label | text is a translated string (rule 11), never baked into an image |

So the generated set is **three files** — `field.webp`, `apple.webp`,
`title.webp` — all clean composites: a background, a sprite on the green board,
a sprite on the blue card. Full spec in `art-assets.json`.

## `icon.svg` and the catalog `cover` are NOT generated

Both stay hand-authored flat vector — they must read at 42px, which a generator
is the wrong tool for. `public/icon.svg` exists; the `cover` is written into
`catalog.json` at T14.
