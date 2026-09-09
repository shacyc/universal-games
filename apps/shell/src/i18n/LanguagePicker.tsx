import { LOCALE_NAMES, SUPPORTED } from './index.js';
import { setLocale, useLocale, useStrings } from './locale.js';

/**
 * The language picker. The shell owns it, exactly as it owns mute: a game never
 * ships one, and `host.setLocale` is what carries the choice across the SDK to
 * whatever game is mounted (decision 15 in `docs/sdk-decisions.md`).
 *
 * Two variants, one control:
 *
 * - `bar` sits in the home page topbar next to the theme toggle, which is the
 *   other per-device display preference and looks identical on purpose.
 * - `overlay` sits over a running game. It is there so that changing language
 *   does not mean leaving the game — and leaving would remount the iframe,
 *   which would hide the very thing the live `locale` event exists to do.
 *
 * The buttons are labelled with each language's own name, shortened. A player
 * hunting for Vietnamese is looking for "Tiếng Việt", so the full name is the
 * accessible name and `lang` marks it as being in that language — otherwise a
 * screen reader set to English pronounces it as English.
 */
export function LanguagePicker({ variant }: { variant: 'bar' | 'overlay' }): JSX.Element {
  const t = useStrings();
  const current = useLocale();

  return (
    <div
      className={variant === 'bar' ? 'toggle' : 'toggle toggle--overlay'}
      role="group"
      aria-label={t.language_group}
    >
      {SUPPORTED.map((tag) => {
        const meta = LOCALE_NAMES[tag];
        return (
          <button
            key={tag}
            type="button"
            className={`toggle__btn${tag === current ? ' toggle__btn--on' : ''}`}
            onClick={() => setLocale(tag)}
            aria-pressed={tag === current}
            aria-label={meta?.name ?? tag}
            title={meta?.name ?? tag}
            lang={tag}
          >
            {meta?.short ?? tag.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
