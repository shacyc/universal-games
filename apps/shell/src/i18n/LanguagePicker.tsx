import { LOCALE_NAMES, SUPPORTED } from './index.js';
import { setLocale, useLocale, useStrings } from './locale.js';

/**
 * The hub's language picker: the segmented control in the topbar, beside the
 * theme toggle it deliberately looks like. Over a running game there is no
 * shell control at all: every game ships its own settings screen and calls
 * `sdk.setLocale` (decision 18).
 *
 * A language is labelled with its **own** name — someone hunting for
 * Vietnamese is looking for "Tiếng Việt" — and marked with `lang`, or a screen
 * reader set to English pronounces it as English.
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
