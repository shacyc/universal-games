import { createClient, type GameContext } from '@platform/sdk/client';
import { createSaveSlot, watchLocale, watchMute } from '@platform/sdk/game';
import { CELLS, type Cell } from './board.js';
import { SUPPORTED } from './i18n/index.js';

/** The saved shape from docs/brief.md §5. */
export interface SaveState {
  v: 1;
  board: Cell[];
  score: number;
  best: number;
  undo: { board: Cell[]; score: number } | null;
  wonShown: boolean;
}

function isBoard(value: unknown): value is Cell[] {
  return (
    Array.isArray(value) &&
    value.length === CELLS &&
    value.every((cell) => cell === null || (typeof cell === 'number' && Number.isFinite(cell)))
  );
}

/** Runs at the storage boundary — anything unrecognised starts a fresh run. */
export function isSaveState(raw: unknown): SaveState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const s = raw as Partial<SaveState>;
  if (s.v !== 1 || !isBoard(s.board)) return null;
  if (typeof s.score !== 'number' || typeof s.best !== 'number') return null;
  if (typeof s.wonShown !== 'boolean') return null;

  let undo: SaveState['undo'] = null;
  if (s.undo !== null && s.undo !== undefined) {
    if (!isBoard(s.undo.board) || typeof s.undo.score !== 'number') return null;
    undo = { board: s.undo.board, score: s.undo.score };
  }

  return { v: 1, board: s.board, score: s.score, best: s.best, undo, wonShown: s.wonShown };
}

export interface RunEnd {
  score: number;
  highest: number;
  moves: number;
}

/**
 * Every platform call this game makes, in one place.
 *
 * The rules the SDK docs put on these calls live here rather than being
 * scattered through the game: a rewarded ad never punishes the player, and the
 * interstitial is only ever asked for when the player chooses a new game.
 */
export interface Session {
  ready(): Promise<GameContext>;
  load(): Promise<SaveState | null>;
  save(state: SaveState): void;
  startRun(): void;
  endRun(payload: RunEnd): void;
  rewardedUndo(): Promise<boolean>;
  rewardedContinue(): Promise<boolean>;
  interstitialBeforeNewGame(): Promise<void>;
  track(event: string, props?: Record<string, string | number | boolean>): void;
  onMuteChange(listener: (muted: boolean) => void): () => void;
  /**
   * The platform's language, resolved to one this game ships. Fires once with
   * the current value, then on every change — including the changes this game's
   * own settings screen asks for. Re-render from here and never from the click:
   * the language can also change in the hub, and the platform's value is the
   * only one that is right.
   */
  onLocaleChange(listener: (locale: string) => void): () => void;
  /**
   * Both driven by this game's own settings screen. The platform owns what they
   * mean — which language exists, where the hub is — so neither is decided
   * here; the screen just asks.
   */
  setLocale(locale: string): void;
  exitToHub(): void;
}

export function createSession(): Session {
  const sdk = createClient({ slug: '2048' });
  const slot = createSaveSlot(sdk, isSaveState);

  return {
    ready: () => sdk.ready(),
    load: () => slot.load(),
    save: (state) => slot.save(state),

    startRun() {
      sdk.gameStart();
      sdk.track('run_start');
    },

    endRun({ score, highest, moves }) {
      // Called once, when the board is finally locked — after any continue has
      // been declined or spent. The host ignores a duplicate either way.
      sdk.gameOver({ score });
      sdk.track('run_end', { score, highest, moves });
    },

    rewardedUndo: () => sdk.showRewarded('undo'),
    rewardedContinue: () => sdk.showRewarded('continue'),
    interstitialBeforeNewGame: () => sdk.showInterstitial('run_end'),

    track: (event, props) => sdk.track(event, props),
    onMuteChange: (listener) => watchMute(sdk, listener),
    onLocaleChange: (listener) => watchLocale(sdk, SUPPORTED, listener),
    setLocale: (locale) => sdk.setLocale(locale),
    exitToHub: () => sdk.exitToHub(),
  };
}
