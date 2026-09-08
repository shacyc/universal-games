import { useSyncExternalStore } from 'react';
import {
  dismissInstall,
  getInstallState,
  openInstall,
  promptInstall,
  subscribeInstall,
  type InstallState,
} from './install.js';

/**
 * Everything the player sees about installing.
 *
 * `install.ts` decides whether an install is possible and what it would
 * install; this file is only how it looks. Both the automatic offer and the
 * button live here, and both are shell chrome — a game ships no install code,
 * and a game added to the catalog tomorrow gets this for free.
 */
export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribeInstall, getInstallState);
}

/**
 * The install CTA. Rendered above both screens, because the moment that earns
 * it happens inside a game but the player may well have walked back to the hub
 * before they answer.
 */
export function InstallPrompt(): JSX.Element | null {
  const state = useInstallState();
  if (!state.open) return null;

  const ios = state.method === 'ios';

  return (
    <div className={`install-cta${ios ? ' install-cta--ios' : ''}`}>
      {ios ? (
        <button type="button" className="install-cta__scrim" aria-label="Close" onClick={dismissInstall} />
      ) : null}
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
              <button type="button" className="install-cta__ghost" onClick={dismissInstall}>
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
              <button type="button" className="install-cta__ghost" onClick={dismissInstall}>
                {state.manual ? 'Close' : 'Not now'}
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

/**
 * The deliberate way in, for a player who never finishes a run at a moment we
 * chose, or who said "not now" once and changed their mind. Renders nothing
 * when this target cannot be installed — a button that does nothing when
 * tapped is worse than no button.
 */
export function InstallButton({ variant }: { variant: 'icon' | 'text' }): JSX.Element | null {
  const state = useInstallState();
  if (!state.available) return null;

  if (variant === 'icon') {
    return (
      <button
        type="button"
        className="game-frame__install"
        onClick={openInstall}
        aria-label={`Install ${state.target}`}
        title={`Install ${state.target}`}
      >
        <Download />
      </button>
    );
  }

  return (
    <button type="button" className="btn btn--primary install__btn" onClick={openInstall}>
      INSTALL {state.target.toUpperCase()}
    </button>
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

function Download(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m8 11 4 4 4-4" />
      <path d="M5 21h14" />
    </svg>
  );
}
