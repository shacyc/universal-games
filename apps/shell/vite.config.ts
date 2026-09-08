import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import catalog from '../../catalog.json' with { type: 'json' };

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

/**
 * In dev, each game runs its own Vite server and the shell proxies to it, so
 * `/g/<slug>/` resolves the same way it will in production. Ports come from
 * the catalog — the same file that decides which games exist.
 */
const gameProxy = Object.fromEntries(
  catalog.games.map((game) => [
    `/g/${game.slug}`,
    {
      target: `http://localhost:${game.devPort}`,
      changeOrigin: false,
    },
  ]),
);

export default defineConfig({
  base: '/',
  server: {
    port: 5173,
    // Bound to every interface so the hub is reachable from a phone or
    // another machine — this repo is usually developed on a headless box.
    // Games are proxied from here, so only this port needs to be exposed.
    host: true,
    proxy: gameProxy,
    // catalog.json lives at the repo root, outside the shell's own tree.
    fs: { allow: [repoRoot] },
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: false, // registration lives in src/pwa.ts, next to the rest of the shell
      manifest: false, // hand-written at public/manifest.webmanifest
      injectManifest: {
        // Games own their own precaches at their own scope.
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
        globIgnores: ['g/**'],
      },
    }),
  ],
  build: { outDir: 'dist', emptyOutDir: true },
});
