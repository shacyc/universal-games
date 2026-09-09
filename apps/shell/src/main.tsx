import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { hydrateLocale } from './host.js';
import { applyDocumentLocale } from './i18n/locale.js';
import { registerShellServiceWorker } from './pwa.js';
import './styles.css';
import './home.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root is missing from index.html');
const root = createRoot(container);

/**
 * An async function rather than top-level `await`: the build target is es2020
 * and Safari 14, neither of which has it, and raising the target for the whole
 * app to save one function is not a trade worth making.
 */
async function boot(): Promise<void> {
  // Before the first render, in this order: fetch the player's language off
  // their record, then stamp it on the document. `index.html` ships `lang="en"`
  // and the player may well have chosen otherwise on a previous visit.
  await hydrateLocale();
  applyDocumentLocale();

  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  registerShellServiceWorker();
}

void boot();
