import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const SLUG = '2048';
const BASE = `/g/${SLUG}/`;

/**
 * Builds to `/g/2048/` and serves its own manifest and service worker at that
 * scope, so installing from this route installs *this game* with its own icon
 * and its own window — not the hub.
 */
export default defineConfig({
  base: BASE,
  server: { port: 5174 },
  plugins: [
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: false,
      manifest: false, // hand-written at public/manifest.webmanifest
      scope: BASE,
      base: BASE,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
      },
    }),
  ],
  build: { outDir: 'dist', emptyOutDir: true },
});
