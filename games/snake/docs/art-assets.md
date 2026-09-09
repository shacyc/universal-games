# Snake — art assets to generate

Bitmap art for this game is generated with the **`agy-image`** skill (rule 13),
never sourced from the web. This file is the run-list: what to generate, the
exact prompt, and where the file goes. Run it when the image-model daily quota
has capacity (it is separate from the Claude/`agy`-chat quota).

`src/assets.ts` loads each file from `public/art/` and **falls back to
procedural canvas drawing when the file is missing**, so the game is fully
playable before any of these exist. Dropping the `.webp` files in and running
`pnpm build` is all that is needed to switch them on — no code change.

## What is a bitmap, and what is not

| Drawn in canvas (no asset) | Why |
| --- | --- |
| the snake body path, the head, all three face states, the crash tint/shake/flash | it bends and interpolates every frame, rotates to four directions, and switches state on the eating tick — a keyed sprite over the canvas body fringes and cannot rotate crisply. Deviation from brief §4's "face sheet"; see `progress.md` §4. |
| the 3-2-1 countdown, every text label | text is a translated string (rule 11), never baked into an image |

So the generated set is three files, all clean composites: a background, a
sprite on the green board, and a sprite on the blue start card.

## The three assets

All go in **`games/snake/public/art/`**. `--resize` to the size actually drawn
at; `.webp` for alpha. Run each command from the repo root.

### 1. `field.webp` — the grass board texture

Drawn stretched over the whole square board, under the snake. No transparency
needed. A flat 2-tone checker is also drawn in canvas as the fallback; this
just adds organic variation on top.

```bash
python3 ~/.claude/skills/agy-image/scripts/agy_image.py \
  --prompt "Top-down grass texture for a game board, flat vector style, two very close shades of bright lime green forming a soft subtle checkerboard, gentle organic mottling, no grass blades, no outlines, even flat lighting, seamless tileable. No text, no letters, no numbers." \
  --aspect 1:1 --resize 512x512 \
  --out games/snake/public/art/field.webp
```

### 2. `apple.webp` — the food

Drawn at roughly one grid cell, pulsing. Generated on flat **magenta**
(`#FF00FF`); `assets.ts` chroma-keys the magenta to transparent on load.

```bash
python3 ~/.claude/skills/agy-image/scripts/agy_image.py \
  --prompt "A single glossy cartoon apple, bright cherry red, one small curved green leaf at the top, one soft white highlight, flat vector sticker style with a thin clean darker-red edge, front view, centered, filling most of the frame, on a solid flat magenta background hex FF00FF, no drop shadow. No text, no letters, no numbers." \
  --aspect 1:1 --resize 128x128 \
  --out games/snake/public/art/apple.webp
```

### 3. `title.webp` — the start-card mascot

Drawn on the blue start card. Generated on flat **magenta** (`#FF00FF`);
chroma-keyed on load, then drawn with a soft white halo so the blue body reads
on the blue card.

```bash
python3 ~/.claude/skills/agy-image/scripts/agy_image.py \
  --prompt "A cute coiled cartoon snake mascot, rounded royal blue hex 3B5BC0 body, big friendly white eyes with dark pupils, small happy smile, curled up resting in a spiral, front view, centered, filling most of the frame, flat vector sticker style with a thin white outline, soft even lighting, on a solid flat magenta background hex FF00FF, no drop shadow. No text, no letters, no numbers." \
  --aspect 1:1 --resize 384x384 \
  --out games/snake/public/art/title.webp
```

## After generating

1. Eyeball each file — **no text/letters/numbers anywhere** (testplan S10). If
   the model slipped a glyph in, regenerate.
2. For `apple.webp` / `title.webp`, check the background is an even magenta with
   no gradient — the keyer keys a colour range, a gradient leaves a halo.
3. `pnpm build` and confirm `dist/g/snake/art/` contains all three (they are in
   the PWA precache glob via `webp`, testplan S3).
4. `git add games/snake/public/art` and commit as part of T3.
5. Flip T3 to `done` in `progress.md` and tick the art parts of testplan
   M17 / S10.

## `icon.svg` and the catalog `cover` are NOT here

Both stay hand-authored flat vector (rule 13) — they must read at 42px, which a
generator is the wrong tool for. `public/icon.svg` already exists; the `cover`
is written into `catalog.json` at T14.
