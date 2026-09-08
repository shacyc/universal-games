import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import catalog from '../catalog.json' with { type: 'json' };

/**
 * Merges the separate builds into the one static tree the platform Worker
 * serves through its `ASSETS` binding: the shell at `/`, each game at
 * `/g/<slug>/`.
 *
 * Each package builds into its own `dist/` first and is copied here. Pointing
 * every Vite build straight at a shared output directory would work until the
 * first partial rebuild silently dropped half of it.
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = path.join(root, 'dist');

async function exists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function requireBuild(label: string, dir: string): Promise<void> {
  if (!(await exists(dir))) {
    throw new Error(`${label} has no build output at ${path.relative(root, dir)} — run \`pnpm -r build\` first`);
  }
}

async function main(): Promise<void> {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const shellDist = path.join(root, 'apps/shell/dist');
  await requireBuild('shell', shellDist);
  await cp(shellDist, outDir, { recursive: true });
  console.log('assembled shell -> /');

  for (const game of catalog.games) {
    const gameDist = path.join(root, 'games', game.slug, 'dist');
    await requireBuild(`game "${game.slug}"`, gameDist);

    // Vite already emits with base `/g/<slug>/`, so its dist is the contents
    // of that directory, not a directory containing it.
    const target = path.join(outDir, 'g', game.slug);
    await mkdir(target, { recursive: true });
    await cp(gameDist, target, { recursive: true });
    console.log(`assembled game "${game.slug}" -> /g/${game.slug}/`);
  }
}

await main();
