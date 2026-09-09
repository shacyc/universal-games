import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { applyDocumentLocale } from './i18n/locale.js';
import { registerShellServiceWorker } from './pwa.js';
import './styles.css';
import './home.css';

// Before the first render: `index.html` ships `lang="en"` and the player may
// well have picked something else on a previous visit.
applyDocumentLocale();

const container = document.getElementById('root');
if (!container) throw new Error('#root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerShellServiceWorker();
