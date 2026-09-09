import { catalog, type Cover, type CatalogGame, type LocalisedText } from '../catalog.js';

/**
 * PLACEHOLDER DATA — delete this module when the API lands.
 *
 * Everything here is invented so the home page can be designed and reviewed
 * against a full-looking arcade. None of it is wired to the SDK: no method was
 * added to the SDK surface for leaderboards or stats, because
 * `submitScore`/`getLeaderboard` are reserved for a later milestone.
 *
 * The nine games below are deliberately NOT in `catalog.json`: an entry there
 * means a real build must exist at `games/<slug>/`, and `scripts/assemble.ts`
 * fails the build without one. They are marked `playable: false` and the home
 * page refuses to open them.
 *
 * No words live in this file. Titles are proper nouns and player names are
 * fake identities; everything a player actually reads is in `copy.en.ts` and
 * `copy.vi.ts` beside it. Numbers are numbers, not pre-formatted strings, so
 * `128,940` becomes `128.940` when the language changes instead of staying
 * English under Vietnamese words.
 */

const A = (bg: string, shapes: Cover['shapes']): Cover => ({ bg, shapes });
const S = (x: string, y: string, w: string, h: string, r: string, c: string) => ({ x, y, w, h, r, c });

export interface HomeGame {
  slug: string;
  /** A proper noun, so it reads the same in every language. */
  title: string;
  /** Real games carry the catalog's copy; placeholders get theirs from `copy.ts`. */
  tagline: LocalisedText | undefined;
  /** A genre key from `i18n/genres.ts`, never a label. */
  genre: string;
  cover: Cover;
  /** false = placeholder with no build behind it. */
  playable: boolean;
}

export interface GameStats {
  plays: number;
  /** An average run, as minutes and seconds — the locale decides how it reads. */
  session: { minutes: number; seconds: number };
  best: number;
  live: number;
}

const DEMO_GAMES: HomeGame[] = [
  { slug: 'blokku', title: 'Blokku', tagline: undefined, genre: 'arcade', playable: false,
    cover: A('#1E1810', [
      S('40%','10%','22%','11%','2px','#963D97'), S('62%','10%','22%','11%','2px','#963D97'),
      S('14%','56%','23%','11%','2px','#61BB46'), S('37%','45%','23%','11%','2px','#61BB46'),
      S('37%','56%','23%','11%','2px','#61BB46'), S('60%','67%','26%','11%','2px','#009DDC'),
      S('14%','67%','46%','11%','2px','#FDB827'), S('14%','78%','72%','11%','2px','#E03A3E')]) },
  { slug: 'snake', title: 'Neon Snake', tagline: undefined, genre: 'arcade', playable: false,
    cover: A('#0F2113', [
      S('16%','62%','12%','12%','3px','#61BB46'), S('28%','62%','12%','12%','3px','#61BB46'),
      S('40%','62%','12%','12%','3px','#61BB46'), S('40%','48%','12%','12%','3px','#7CD45E'),
      S('40%','34%','12%','12%','3px','#7CD45E'), S('52%','34%','12%','12%','3px','#9BE87F'),
      S('72%','20%','11%','11%','6px','#E03A3E')]) },
  { slug: 'brick', title: 'Brick Bash', tagline: undefined, genre: 'arcade', playable: false,
    cover: A('#161A29', [
      S('10%','14%','18%','8%','2px','#E03A3E'), S('30%','14%','18%','8%','2px','#F5821F'),
      S('50%','14%','18%','8%','2px','#FDB827'), S('70%','14%','20%','8%','2px','#61BB46'),
      S('10%','24%','18%','8%','2px','#009DDC'), S('30%','24%','18%','8%','2px','#963D97'),
      S('50%','24%','18%','8%','2px','#E03A3E'), S('70%','24%','20%','8%','2px','#F5821F'),
      S('56%','58%','7%','10%','50%','#FFFFFF'), S('36%','82%','28%','7%','4px','#EDE3D2')]) },
  { slug: 'klondike', title: 'Klondike', tagline: undefined, genre: 'cards', playable: false,
    cover: A('#2C6B4E', [
      S('8%','16%','20%','30%','3px','#F7F2E6'), S('32%','16%','20%','30%','3px','#F7F2E6'),
      S('56%','16%','20%','30%','3px','#E03A3E'), S('8%','54%','20%','30%','3px','#F7F2E6'),
      S('20%','62%','20%','30%','3px','#F7F2E6'), S('32%','70%','20%','30%','3px','#1E1810')]) },
  { slug: 'mines', title: 'Mine Hunt', tagline: undefined, genre: 'puzzle', playable: false,
    cover: A('#D6C9AE', [
      S('10%','12%','20%','22%','3px','#EDE3D2'), S('34%','12%','20%','22%','3px','#EDE3D2'),
      S('58%','12%','20%','22%','3px','#EDE3D2'), S('10%','38%','20%','22%','3px','#EDE3D2'),
      S('34%','38%','20%','22%','3px','#E03A3E'), S('58%','38%','20%','22%','3px','#EDE3D2'),
      S('10%','64%','20%','22%','3px','#EDE3D2'), S('34%','64%','20%','22%','3px','#EDE3D2'),
      S('58%','64%','20%','22%','3px','#EDE3D2')]) },
  { slug: 'sudoku', title: 'Sudoku Daily', tagline: undefined, genre: 'puzzle', playable: false,
    cover: A('#F3E9DA', [
      S('10%','10%','80%','2%','1px','#BCAB90'), S('10%','40%','80%','2%','1px','#2B2318'),
      S('10%','70%','80%','2%','1px','#BCAB90'), S('10%','10%','2%','82%','1px','#BCAB90'),
      S('39%','10%','2%','82%','1px','#2B2318'), S('68%','10%','2%','82%','1px','#BCAB90'),
      S('16%','18%','9%','12%','2px','#F5821F'), S('45%','48%','9%','12%','2px','#009DDC'),
      S('74%','76%','9%','12%','2px','#E03A3E')]) },
  { slug: 'word', title: 'Word Ladder', tagline: undefined, genre: 'word', playable: false,
    cover: A('#EFE2CB', [
      S('8%','62%','16%','20%','3px','#BCAB90'), S('26%','52%','16%','20%','3px','#FDB827'),
      S('44%','42%','16%','20%','3px','#61BB46'), S('62%','32%','16%','20%','3px','#61BB46'),
      S('80%','22%','14%','20%','3px','#F5821F')]) },
  { slug: 'rhythm', title: 'Tap Rhythm', tagline: undefined, genre: 'arcade', playable: false,
    cover: A('#191227', [
      S('12%','0%','16%','100%','0px','#241A38'), S('32%','0%','16%','100%','0px','#2E2145'),
      S('52%','0%','16%','100%','0px','#241A38'), S('72%','0%','16%','100%','0px','#2E2145'),
      S('12%','30%','16%','7%','2px','#009DDC'), S('32%','52%','16%','7%','2px','#963D97'),
      S('52%','18%','16%','7%','2px','#E03A3E'), S('72%','66%','16%','7%','2px','#FDB827'),
      S('8%','84%','84%','4%','2px','#F7F2E6')]) },
  { slug: 'bubble', title: 'Bubble Pop', tagline: undefined, genre: 'casual', playable: false,
    cover: A('#E4EFF3', [
      S('12%','14%','20%','20%','50%','#E03A3E'), S('36%','14%','20%','20%','50%','#FDB827'),
      S('60%','14%','20%','20%','50%','#009DDC'), S('24%','38%','20%','20%','50%','#61BB46'),
      S('48%','38%','20%','20%','50%','#963D97'), S('36%','62%','20%','20%','50%','#F5821F'),
      S('40%','86%','12%','12%','50%','#2B2318')]) }
];

const fromCatalog = (game: CatalogGame): HomeGame => ({
  slug: game.slug,
  title: game.title,
  tagline: game.tagline,
  genre: game.genre,
  cover: game.cover,
  playable: true
});

/** Real games first, then the placeholders. */
export const homeGames: HomeGame[] = [...catalog.games.map(fromCatalog), ...DEMO_GAMES];

export const STATS: Record<string, GameStats> = {
  '2048':   { plays: 128940, session: { minutes: 4,  seconds: 12 }, best: 186432, live: 1204 },
  blokku:   { plays: 96310,  session: { minutes: 6,  seconds: 48 }, best: 412880, live: 873 },
  snake:    { plays: 74655,  session: { minutes: 3,  seconds: 5 },  best: 9840,   live: 512 },
  brick:    { plays: 61022,  session: { minutes: 5,  seconds: 21 }, best: 77150,  live: 349 },
  klondike: { plays: 58470,  session: { minutes: 9,  seconds: 33 }, best: 14220,  live: 688 },
  mines:    { plays: 43880,  session: { minutes: 7,  seconds: 2 },  best: 6410,   live: 241 },
  sudoku:   { plays: 39140,  session: { minutes: 11, seconds: 40 }, best: 3980,   live: 905 },
  word:     { plays: 35700,  session: { minutes: 4,  seconds: 55 }, best: 2140,   live: 1510 },
  rhythm:   { plays: 28905,  session: { minutes: 3,  seconds: 48 }, best: 998120, live: 430 },
  bubble:   { plays: 22410,  session: { minutes: 6,  seconds: 12 }, best: 54300,  live: 167 }
};

/** Slugs shown in the spotlight carousel, in order. */
export const SPOTLIGHT = ['2048', 'blokku', 'snake', 'brick', 'klondike'];

export interface BoardRow {
  /** A made-up handle. Handles are not translated. */
  name: string;
  score: number;
}

/** The fake identity the "you" row shows until accounts exist. */
export const ANON_ID = 'anon-4f2a';

export const BOARDS: Record<string, BoardRow[]> = {
  '2048': [
    { name: 'mira_88', score: 186432 }, { name: 'tokyodrift', score: 171908 },
    { name: 'n0va', score: 164220 }, { name: 'pixelpham', score: 152776 },
    { name: 'bluebird', score: 148004 }],
  blokku: [
    { name: 'r3tr0', score: 412880 }, { name: 'kaz.', score: 388140 },
    { name: 'sunny.lee', score: 361520 }, { name: 'quocanh', score: 344908 },
    { name: 'mochi', score: 330116 }],
  snake: [
    { name: 'n0va', score: 9840 }, { name: 'mira_88', score: 9112 },
    { name: 'grid_lock', score: 8760 }, { name: 'tokyodrift', score: 8204 },
    { name: 'pixelpham', score: 7988 }],
  brick: [
    { name: 'kaz.', score: 77150 }, { name: 'bluebird', score: 74330 },
    { name: 'mochi', score: 71002 }, { name: 'r3tr0', score: 68415 },
    { name: 'sunny.lee', score: 65780 }],
  klondike: [
    { name: 'sunny.lee', score: 14220 }, { name: 'quocanh', score: 13905 },
    { name: 'mira_88', score: 13440 }, { name: 'mochi', score: 12870 },
    { name: 'grid_lock', score: 12330 }]
};

export const YOU: Record<string, { rank: number; score: number }> = {
  '2048': { rank: 142, score: 96120 },
  blokku: { rank: 318, score: 188400 },
  snake: { rank: 77, score: 6410 },
  brick: { rank: 204, score: 41880 },
  klondike: { rank: 59, score: 10240 }
};

export interface SavedRun {
  slug: string;
  pct: number;
}

/** The detail line for each of these is in `copy.en.ts`, keyed by slug. */
export const SAVED: SavedRun[] = [
  { slug: '2048', pct: 64 },
  { slug: 'blokku', pct: 41 },
  { slug: 'klondike', pct: 73 }
];

export const gameBySlug = (slug: string): HomeGame | undefined =>
  homeGames.find((g) => g.slug === slug);
