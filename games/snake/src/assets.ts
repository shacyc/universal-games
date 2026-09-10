/**
 * Loads the generated bitmap art from `public/art/`, keying out the magenta
 * background where a sprite needs alpha. **Every asset is optional**: a missing
 * file — nothing generated yet, or an offline first-load — resolves to `null`
 * and `render.ts` draws that element procedurally instead. See
 * `docs/art-assets.md` for what to generate and the prompts.
 */

const ART_BASE = `${import.meta.env.BASE_URL}art/`;

/** Pixels within this Euclidean distance of pure magenta are made transparent. */
const KEY_R = 255;
const KEY_G = 0;
const KEY_B = 255;
const KEY_TOLERANCE = 64;

export interface Assets {
  /** The food sprite, magenta keyed out. */
  apple: CanvasImageSource | null;
  /** The start-card mascot, magenta keyed out. */
  title: CanvasImageSource | null;
}

export const EMPTY_ASSETS: Assets = { apple: null, title: null };

function loadImage(name: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // not generated yet — render falls back
    img.src = `${ART_BASE}${name}`;
  });
}

/** A canvas copy of `img` with near-magenta pixels turned transparent. */
function chromaKey(img: HTMLImageElement): CanvasImageSource {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return img;

  ctx.drawImage(img, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = image.data;
  const limit = KEY_TOLERANCE * KEY_TOLERANCE;
  for (let i = 0; i < px.length; i += 4) {
    const dr = (px[i] as number) - KEY_R;
    const dg = (px[i + 1] as number) - KEY_G;
    const db = (px[i + 2] as number) - KEY_B;
    if (dr * dr + dg * dg + db * db <= limit) px[i + 3] = 0;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

export async function loadAssets(): Promise<Assets> {
  const [apple, title] = await Promise.all([
    loadImage('apple.webp'),
    loadImage('title.webp'),
  ]);

  return {
    apple: apple ? chromaKey(apple) : null,
    title: title ? chromaKey(title) : null,
  };
}
