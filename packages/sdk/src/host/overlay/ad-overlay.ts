/**
 * The v0 ad UI. Deliberately real: a real modal, real timing, real close
 * button, so that swapping in an actual ad network at v1 changes only what
 * fills the box — not the UX around it and not a line of game code.
 *
 * Inline styles keep the SDK free of a CSS pipeline; it is rendered into
 * whichever document owns the host (the shell when embedded, the game's own
 * document when installed).
 */
const COUNTDOWN_SECONDS = 3;

export interface AdOverlay {
  showRewarded(label: string): Promise<boolean>;
  showInterstitial(): Promise<void>;
}

export function createAdOverlay(doc: Document = document): AdOverlay {
  function present(options: { title: string; skippable: boolean }): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const root = doc.createElement('div');
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-label', options.title);
      style(root, {
        position: 'fixed',
        inset: '0',
        display: 'grid',
        placeItems: 'center',
        padding: 'max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom))',
        background: 'rgba(0, 0, 0, 0.72)',
        zIndex: '2147483000',
        font: '16px/1.4 system-ui, sans-serif',
        color: '#fff',
      });

      const panel = doc.createElement('div');
      style(panel, {
        width: 'min(360px, 100%)',
        padding: '24px',
        borderRadius: '16px',
        background: '#1c1b1a',
        textAlign: 'center',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
      });

      const title = doc.createElement('p');
      title.textContent = options.title;
      style(title, { margin: '0 0 4px', fontSize: '18px', fontWeight: '600' });

      const note = doc.createElement('p');
      note.textContent = 'Placeholder ad — no network involved.';
      style(note, { margin: '0 0 20px', fontSize: '13px', opacity: '0.6' });

      const counter = doc.createElement('p');
      style(counter, { margin: '0 0 20px', fontSize: '32px', fontWeight: '700', fontVariantNumeric: 'tabular-nums' });

      const button = doc.createElement('button');
      button.type = 'button';
      style(button, {
        width: '100%',
        minHeight: '44px',
        padding: '12px 16px',
        border: '0',
        borderRadius: '10px',
        background: '#f0f0f0',
        color: '#1c1b1a',
        font: 'inherit',
        fontWeight: '600',
        cursor: 'pointer',
      });

      panel.append(title, note, counter, button);
      root.append(panel);
      doc.body.append(root);

      let remaining = COUNTDOWN_SECONDS;
      let settled = false;

      const finish = (watched: boolean): void => {
        if (settled) return;
        settled = true;
        clearInterval(timer);
        root.remove();
        resolve(watched);
      };

      const render = (): void => {
        counter.textContent = remaining > 0 ? String(remaining) : '✓';
        if (remaining > 0) {
          button.textContent = options.skippable ? 'Close' : `Please wait…`;
          button.disabled = !options.skippable;
          button.style.opacity = options.skippable ? '1' : '0.45';
          button.style.cursor = options.skippable ? 'pointer' : 'default';
        } else {
          button.textContent = 'Continue';
          button.disabled = false;
          button.style.opacity = '1';
          button.style.cursor = 'pointer';
        }
      };

      // Closing early resolves false; it never throws and never penalises.
      button.addEventListener('click', () => finish(remaining <= 0));

      const timer = setInterval(() => {
        remaining -= 1;
        render();
        // An interstitial is not a decision point — dismiss itself when done.
        if (remaining <= 0 && !options.skippable) finish(true);
      }, 1000);

      render();
      button.focus();
    });
  }

  return {
    showRewarded: (label) => present({ title: label, skippable: true }),
    showInterstitial: () => present({ title: 'Advertisement', skippable: false }).then(() => undefined),
  };
}

function style(element: HTMLElement, declarations: Record<string, string>): void {
  Object.assign(element.style, declarations);
}
