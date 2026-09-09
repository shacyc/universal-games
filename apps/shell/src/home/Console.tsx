import { CoverArt } from './CoverArt.js';
import { CONSOLE_BRAND } from '../i18n/brand.js';
import { useStrings } from '../i18n/locale.js';
import type { HomeGame } from '../demo/demoData.js';

const CHEVRON: Record<Direction, string> = {
  up: 'm5 15 7-7 7 7',
  down: 'm5 9 7 7 7-7',
  left: 'M15 5 8 12l7 7',
  right: 'm9 5 7 7-7 7'
};

type Direction = 'up' | 'down' | 'left' | 'right';

function Arm({ dir, onClick, label }: { dir: Direction; onClick: () => void; label: string }): JSX.Element {
  return (
    <button type="button" className={`dpad__arm dpad__arm--${dir}`} onClick={onClick} aria-label={label}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d={CHEVRON[dir]} />
      </svg>
    </button>
  );
}

/**
 * The spotlight carousel's control surface. All four D-pad arms drive it:
 * up/left step back, down/right step forward.
 */
export function Console({
  game,
  position,
  total,
  onPrev,
  onNext
}: {
  game: HomeGame;
  position: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}): JSX.Element {
  const t = useStrings();
  // Not `t.number`: this is the two-digit counter etched on a fake handheld's
  // screen, the same way a cassette counter reads. It is not a quantity.
  const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

  return (
    <div className="gba">
      <span className="gba__bumper gba__bumper--left" />
      <span className="gba__bumper gba__bumper--right" />

      <div className="gba__body">
        <div className="gba__bezel">
          <div className="gba__screen">
            <CoverArt cover={game.cover} />
            <span className="gba__scanlines" />
            <div className="gba__caption">
              <span>{game.title}</span>
              <span className="gba__counter">
                {pad(position)} / {pad(total)}
              </span>
            </div>
          </div>
          <span className="gba__led" />
        </div>

        <p className="gba__brand">{CONSOLE_BRAND}</p>

        <div className="gba__controls">
          <div className="dpad">
            <svg className="dpad__plate" viewBox="0 0 132 132" aria-hidden="true">
              <path d="M44 1 H88 V44 H131 V88 H88 V131 H44 V88 H1 V44 H44 Z" />
              <circle cx="66" cy="66" r="12" />
            </svg>
            <Arm dir="up" onClick={onPrev} label={t.prev_game} />
            <Arm dir="left" onClick={onPrev} label={t.prev_game} />
            <Arm dir="right" onClick={onNext} label={t.next_game} />
            <Arm dir="down" onClick={onNext} label={t.next_game} />
          </div>

          <div className="gba__face" aria-hidden="true">
            <span className="gba__btn gba__btn--a">A</span>
            <span className="gba__btn gba__btn--b">B</span>
          </div>
        </div>

        <div className="gba__pills" aria-hidden="true">
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
