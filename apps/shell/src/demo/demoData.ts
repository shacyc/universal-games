import { catalog, type Cover, type CatalogGame } from '../catalog.js';

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
 */

const A = (bg: string, shapes: Cover['shapes']): Cover => ({ bg, shapes });
const S = (x: string, y: string, w: string, h: string, r: string, c: string) => ({ x, y, w, h, r, c });

export interface HomeGame {
  slug: string;
  title: string;
  tagline: string;
  genre: string;
  cover: Cover;
  /** false = placeholder with no build behind it. */
  playable: boolean;
}

export interface GameStats {
  blurb: string;
  plays: string;
  session: string;
  best: string;
  live: string;
}

const DEMO_GAMES: HomeGame[] = [
  { slug: 'blokku', title: 'Blokku', tagline: 'Stack it. Clear it. Sweat it.', genre: 'Arcade', playable: false,
    cover: A('#1E1810', [
      S('40%','10%','22%','11%','2px','#963D97'), S('62%','10%','22%','11%','2px','#963D97'),
      S('14%','56%','23%','11%','2px','#61BB46'), S('37%','45%','23%','11%','2px','#61BB46'),
      S('37%','56%','23%','11%','2px','#61BB46'), S('60%','67%','26%','11%','2px','#009DDC'),
      S('14%','67%','46%','11%','2px','#FDB827'), S('14%','78%','72%','11%','2px','#E03A3E')]) },
  { slug: 'snake', title: 'Neon Snake', tagline: 'Do not bite yourself.', genre: 'Arcade', playable: false,
    cover: A('#0F2113', [
      S('16%','62%','12%','12%','3px','#61BB46'), S('28%','62%','12%','12%','3px','#61BB46'),
      S('40%','62%','12%','12%','3px','#61BB46'), S('40%','48%','12%','12%','3px','#7CD45E'),
      S('40%','34%','12%','12%','3px','#7CD45E'), S('52%','34%','12%','12%','3px','#9BE87F'),
      S('72%','20%','11%','11%','6px','#E03A3E')]) },
  { slug: 'brick', title: 'Brick Bash', tagline: 'One ball. Forty bricks.', genre: 'Arcade', playable: false,
    cover: A('#161A29', [
      S('10%','14%','18%','8%','2px','#E03A3E'), S('30%','14%','18%','8%','2px','#F5821F'),
      S('50%','14%','18%','8%','2px','#FDB827'), S('70%','14%','20%','8%','2px','#61BB46'),
      S('10%','24%','18%','8%','2px','#009DDC'), S('30%','24%','18%','8%','2px','#963D97'),
      S('50%','24%','18%','8%','2px','#E03A3E'), S('70%','24%','20%','8%','2px','#F5821F'),
      S('56%','58%','7%','10%','50%','#FFFFFF'), S('36%','82%','28%','7%','4px','#EDE3D2')]) },
  { slug: 'klondike', title: 'Klondike', tagline: 'The patient one.', genre: 'Cards', playable: false,
    cover: A('#2C6B4E', [
      S('8%','16%','20%','30%','3px','#F7F2E6'), S('32%','16%','20%','30%','3px','#F7F2E6'),
      S('56%','16%','20%','30%','3px','#E03A3E'), S('8%','54%','20%','30%','3px','#F7F2E6'),
      S('20%','62%','20%','30%','3px','#F7F2E6'), S('32%','70%','20%','30%','3px','#1E1810')]) },
  { slug: 'mines', title: 'Mine Hunt', tagline: 'Count, flag, breathe.', genre: 'Puzzle', playable: false,
    cover: A('#D6C9AE', [
      S('10%','12%','20%','22%','3px','#EDE3D2'), S('34%','12%','20%','22%','3px','#EDE3D2'),
      S('58%','12%','20%','22%','3px','#EDE3D2'), S('10%','38%','20%','22%','3px','#EDE3D2'),
      S('34%','38%','20%','22%','3px','#E03A3E'), S('58%','38%','20%','22%','3px','#EDE3D2'),
      S('10%','64%','20%','22%','3px','#EDE3D2'), S('34%','64%','20%','22%','3px','#EDE3D2'),
      S('58%','64%','20%','22%','3px','#EDE3D2')]) },
  { slug: 'sudoku', title: 'Sudoku Daily', tagline: 'A new grid every morning.', genre: 'Puzzle', playable: false,
    cover: A('#F3E9DA', [
      S('10%','10%','80%','2%','1px','#BCAB90'), S('10%','40%','80%','2%','1px','#2B2318'),
      S('10%','70%','80%','2%','1px','#BCAB90'), S('10%','10%','2%','82%','1px','#BCAB90'),
      S('39%','10%','2%','82%','1px','#2B2318'), S('68%','10%','2%','82%','1px','#BCAB90'),
      S('16%','18%','9%','12%','2px','#F5821F'), S('45%','48%','9%','12%','2px','#009DDC'),
      S('74%','76%','9%','12%','2px','#E03A3E')]) },
  { slug: 'word', title: 'Word Ladder', tagline: 'Five letters, six tries.', genre: 'Word', playable: false,
    cover: A('#EFE2CB', [
      S('8%','62%','16%','20%','3px','#BCAB90'), S('26%','52%','16%','20%','3px','#FDB827'),
      S('44%','42%','16%','20%','3px','#61BB46'), S('62%','32%','16%','20%','3px','#61BB46'),
      S('80%','22%','14%','20%','3px','#F5821F')]) },
  { slug: 'rhythm', title: 'Tap Rhythm', tagline: 'Four lanes, no mercy.', genre: 'Arcade', playable: false,
    cover: A('#191227', [
      S('12%','0%','16%','100%','0px','#241A38'), S('32%','0%','16%','100%','0px','#2E2145'),
      S('52%','0%','16%','100%','0px','#241A38'), S('72%','0%','16%','100%','0px','#2E2145'),
      S('12%','30%','16%','7%','2px','#009DDC'), S('32%','52%','16%','7%','2px','#963D97'),
      S('52%','18%','16%','7%','2px','#E03A3E'), S('72%','66%','16%','7%','2px','#FDB827'),
      S('8%','84%','84%','4%','2px','#F7F2E6')]) },
  { slug: 'bubble', title: 'Bubble Pop', tagline: 'Match three, clear the board.', genre: 'Casual', playable: false,
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

export const GENRES = ['All', 'Puzzle', 'Arcade', 'Cards', 'Word', 'Casual'] as const;

export const STATS: Record<string, GameStats> = {
  '2048': { blurb: 'The one everybody already knows how to play. Four-by-four grid, two starting tiles, and one more shot at finally seeing 4096.', plays: '128,940', session: '4m 12s', best: '186,432', live: '1,204' },
  blokku: { blurb: 'Seven falling shapes, one narrow well, and a drop speed that stops being polite somewhere around level nine.', plays: '96,310', session: '6m 48s', best: '412,880', live: '873' },
  snake: { blurb: 'A grid, a growing tail, and exactly one bad decision between you and a personal best.', plays: '74,655', session: '3m 05s', best: '9,840', live: '512' },
  brick: { blurb: 'Angle the paddle, break the wall, and try to stop the last brick from ruining a perfect run.', plays: '61,022', session: '5m 21s', best: '77,150', live: '349' },
  klondike: { blurb: 'Solitaire as it was on every office machine in 1994, minus the office and the machine.', plays: '58,470', session: '9m 33s', best: '14,220', live: '688' },
  mines: { blurb: 'Numbers, neighbours and nerve.', plays: '43,880', session: '7m 02s', best: '6,410', live: '241' },
  sudoku: { blurb: 'One puzzle a day.', plays: '39,140', session: '11m 40s', best: '3,980', live: '905' },
  word: { blurb: 'Change one letter at a time.', plays: '35,700', session: '4m 55s', best: '2,140', live: '1,510' },
  rhythm: { blurb: 'Hit the beat.', plays: '28,905', session: '3m 48s', best: '998,120', live: '430' },
  bubble: { blurb: 'Aim and shoot.', plays: '22,410', session: '6m 12s', best: '54,300', live: '167' }
};

/** Slugs shown in the spotlight carousel, in order. */
export const SPOTLIGHT = ['2048', 'blokku', 'snake', 'brick', 'klondike'];

export interface BoardRow {
  name: string;
  score: string;
}

export const BOARDS: Record<string, BoardRow[]> = {
  '2048': [
    { name: 'mira_88', score: '186,432' }, { name: 'tokyodrift', score: '171,908' },
    { name: 'n0va', score: '164,220' }, { name: 'pixelpham', score: '152,776' },
    { name: 'bluebird', score: '148,004' }],
  blokku: [
    { name: 'r3tr0', score: '412,880' }, { name: 'kaz.', score: '388,140' },
    { name: 'sunny.lee', score: '361,520' }, { name: 'quocanh', score: '344,908' },
    { name: 'mochi', score: '330,116' }],
  snake: [
    { name: 'n0va', score: '9,840' }, { name: 'mira_88', score: '9,112' },
    { name: 'grid_lock', score: '8,760' }, { name: 'tokyodrift', score: '8,204' },
    { name: 'pixelpham', score: '7,988' }],
  brick: [
    { name: 'kaz.', score: '77,150' }, { name: 'bluebird', score: '74,330' },
    { name: 'mochi', score: '71,002' }, { name: 'r3tr0', score: '68,415' },
    { name: 'sunny.lee', score: '65,780' }],
  klondike: [
    { name: 'sunny.lee', score: '14,220' }, { name: 'quocanh', score: '13,905' },
    { name: 'mira_88', score: '13,440' }, { name: 'mochi', score: '12,870' },
    { name: 'grid_lock', score: '12,330' }]
};

export const YOU: Record<string, { rank: string; score: string }> = {
  '2048': { rank: '#142', score: '96,120' },
  blokku: { rank: '#318', score: '188,400' },
  snake: { rank: '#77', score: '6,410' },
  brick: { rank: '#204', score: '41,880' },
  klondike: { rank: '#59', score: '10,240' }
};

export interface SavedRun {
  slug: string;
  detail: string;
  pct: number;
}

export const SAVED: SavedRun[] = [
  { slug: '2048', detail: 'Score 96,120 · best tile 512', pct: 64 },
  { slug: 'blokku', detail: 'Level 12 · 188,400 pts', pct: 41 },
  { slug: 'klondike', detail: '38 of 52 cards home', pct: 73 }
];

export const gameBySlug = (slug: string): HomeGame | undefined =>
  homeGames.find((g) => g.slug === slug);
