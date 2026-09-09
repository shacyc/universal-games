import { LOCALE_NAMES, SUPPORTED } from './index.js';
import { setLocale, useLocale, useStrings } from './locale.js';

/**
 * The language controls. The shell owns them, exactly as it owns mute and
 * install: a game ships none, and `host.setLocale` is what carries the choice
 * across the SDK to whatever game is mounted (decision 15 in
 * `docs/sdk-decisions.md`).
 *
 * Two shapes, because two places need different things:
 *
 * - `LanguagePicker` is the segmented control in the home page topbar, beside
 *   the theme toggle it deliberately looks like.
 * - `LanguageList` is a page of rows inside the settings sheet over a running
 *   game. Not a switch: a switch stops working the moment there is a third
 *   language, and this list is reached by navigating into it, so it can afford
 *   to spell each language out.
 *
 * Both label a language with its **own** name — someone hunting for Vietnamese
 * is looking for "Tiếng Việt" — and mark it with `lang`, or a screen reader set
 * to English pronounces it as English.
 */
export function LanguagePicker(): JSX.Element {
  const t = useStrings();
  const current = useLocale();

  return (
    <div className="toggle" role="group" aria-label={t.language}>
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

/**
 * The full list, one row per language. `onPick` fires after the choice is
 * applied, so the caller can navigate back the way a settings screen does.
 */
export function LanguageList({ onPick }: { onPick: () => void }): JSX.Element {
  const t = useStrings();
  const current = useLocale();

  return (
    // A radio group, not a list of toggles: these are one choice out of a set,
    // and that is what a screen reader should announce.
    <div className="sheet__group" role="radiogroup" aria-label={t.language}>
      {SUPPORTED.map((tag) => {
        const meta = LOCALE_NAMES[tag];
        const selected = tag === current;
        return (
          <button
            key={tag}
            type="button"
            className="sheet__row"
            onClick={() => {
              setLocale(tag);
              onPick();
            }}
            role="radio"
            aria-checked={selected}
            lang={tag}
          >
            <span className="sheet__row-label">{meta?.name ?? tag}</span>
            {selected ? <Check /> : null}
          </button>
        );
      })}
    </div>
  );
}

function Check(): JSX.Element {
  return (
    <svg
      className="sheet__check"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
