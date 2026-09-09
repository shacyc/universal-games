import { useSyncExternalStore } from 'react';
import { useStrings } from './i18n/locale.js';
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
  const t = useStrings();
  const state = useInstallState();
  if (!state.open) return null;

  const ios = state.method === 'ios';

  return (
    <div className={`install-cta${ios ? ' install-cta--ios' : ''}`}>
      {ios ? (
        <button type="button" className="install-cta__scrim" aria-label={t.close} onClick={dismissInstall} />
      ) : null}
      <div className="install-cta__sheet" role="dialog" aria-labelledby="install-cta-title">
        <p className="install-cta__title" id="install-cta-title">
          {t.install_sheet_title(state.target)}
        </p>

        {ios ? (
          <>
            <ol className="install-cta__steps">
              {/* The glyph leads the line rather than sitting inside it: a
                  sentence split around an icon is two half-strings, and no
                  translator can put the halves back in their own word order. */}
              <li>
                <Share /> {t.ios_step_share}
              </li>
              <li>{t.ios_step_add}</li>
            </ol>
            <p className="install-cta__note">{t.ios_note}</p>
            <div className="install-cta__actions">
              <button type="button" className="install-cta__ghost" onClick={dismissInstall}>
                {t.ios_done}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="install-cta__note">{t.prompt_note}</p>
            <div className="install-cta__actions">
              <button type="button" className="install-cta__ghost" onClick={dismissInstall}>
                {state.manual ? t.close : t.prompt_not_now}
              </button>
              <button type="button" className="install-cta__go" onClick={() => void promptInstall()}>
                {t.prompt_install}
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
 *
 * This is the hub's button. Over a running game the shell draws nothing at all
 * (decision 18); a game that wants to offer the install puts a row in its own
 * settings screen. The automatic prompt below is unaffected — it is what
 * actually earns installs.
 */
export function InstallButton(): JSX.Element | null {
  const t = useStrings();
  const state = useInstallState();
  if (!state.available) return null;

  return (
    <button type="button" className="btn btn--primary install__btn" onClick={openInstall}>
      {t.install_cta(state.target)}
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
