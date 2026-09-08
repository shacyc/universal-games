import { useSyncExternalStore } from 'react';
import { dismiss, getInstallState, promptInstall, subscribeInstall } from './install.js';

/**
 * The install CTA. Rendered above both screens, because the moment that earns
 * it happens inside a game but the player may well have walked back to the hub
 * before they answer.
 *
 * `install.ts` decides *whether* this shows and *what* gets installed; this
 * file is only how it looks.
 */
export function InstallPrompt(): JSX.Element | null {
  const state = useSyncExternalStore(subscribeInstall, getInstallState);
  if (!state.open) return null;

  const ios = state.method === 'ios';

  return (
    <div className={`install-cta${ios ? ' install-cta--ios' : ''}`}>
      {ios ? <button type="button" className="install-cta__scrim" aria-label="Not now" onClick={dismiss} /> : null}
      <div className="install-cta__sheet" role="dialog" aria-labelledby="install-cta-title">
        <p className="install-cta__title" id="install-cta-title">
          Add {state.target} to your home screen
        </p>

        {ios ? (
          <>
            <ol className="install-cta__steps">
              <li>
                Tap <Share /> Share, at the bottom of Safari
              </li>
              <li>Choose “Add to Home Screen”</li>
            </ol>
            <p className="install-cta__note">
              It gets its own icon and opens full screen — nothing to download.
            </p>
            <div className="install-cta__actions">
              <button type="button" className="install-cta__ghost" onClick={dismiss}>
                Got it
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="install-cta__note">
              Its own icon, its own full-screen window, and it works with no signal.
            </p>
            <div className="install-cta__actions">
              <button type="button" className="install-cta__ghost" onClick={dismiss}>
                Not now
              </button>
              <button type="button" className="install-cta__go" onClick={() => void promptInstall()}>
                Install
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Share(): JSX.Element {
  return (
    <svg
      className="install-cta__glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 15V3" />
      <path d="m8 7 4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}
