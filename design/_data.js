// shared data block, pasted into each artboard's logic class
const A = (bg, shapes) => ({ bg, shapes });
const S = (x, y, w, h, r, c) => ({ x, y, w, h, r, c });

const GAMES = [
  { id: '2048', title: '2048', genre: 'Puzzle', pitch: 'Slide, merge, repeat.',
    desc: 'The one everybody already knows how to play. Four-by-four grid, two starting tiles, and one more chance to finally see 4096.',
    plays: '128,940', sessions: '4m 12s', best: '186,432', live: '1,204',
    art: A('#F3E9DA', [
      S('6%','8%','41%','40%','7px','#E9DDC7'), S('53%','8%','41%','40%','7px','#F0D6A8'),
      S('6%','54%','41%','40%','7px','#F5821F'), S('53%','54%','41%','40%','7px','#E03A3E'),
      S('60%','16%','12%','12%','3px','#FFFFFF'), S('14%','62%','12%','12%','3px','#FFF3E2') ]) },
  { id: 'blokku', title: 'Blokku', genre: 'Arcade', pitch: 'Stack it. Clear it. Sweat it.',
    desc: 'Seven falling shapes, one narrow well and a drop speed that stops being polite around level nine.',
    plays: '96,310', sessions: '6m 48s', best: '412,880', live: '873',
    art: A('#1E1810', [
      S('40%','10%','22%','11%','2px','#963D97'), S('62%','10%','22%','11%','2px','#963D97'),
      S('14%','56%','23%','11%','2px','#61BB46'), S('37%','45%','23%','11%','2px','#61BB46'),
      S('37%','56%','23%','11%','2px','#61BB46'), S('60%','67%','26%','11%','2px','#009DDC'),
      S('14%','67%','46%','11%','2px','#FDB827'), S('14%','78%','72%','11%','2px','#E03A3E') ]) },
  { id: 'snake', title: 'Neon Snake', genre: 'Arcade', pitch: 'Do not bite yourself.',
    desc: 'A grid, a growing tail and exactly one bad decision between you and a personal best.',
    plays: '74,655', sessions: '3m 05s', best: '9,840', live: '512',
    art: A('#0F2113', [
      S('16%','62%','12%','12%','3px','#61BB46'), S('28%','62%','12%','12%','3px','#61BB46'),
      S('40%','62%','12%','12%','3px','#61BB46'), S('40%','48%','12%','12%','3px','#7CD45E'),
      S('40%','34%','12%','12%','3px','#7CD45E'), S('52%','34%','12%','12%','3px','#9BE87F'),
      S('72%','20%','11%','11%','6px','#E03A3E') ]) },
  { id: 'brick', title: 'Brick Bash', genre: 'Arcade', pitch: 'One ball. Forty bricks.',
    desc: 'Angle the paddle, break the wall, and try to keep the last brick from ruining a perfect run.',
    plays: '61,022', sessions: '5m 21s', best: '77,150', live: '349',
    art: A('#161A29', [
      S('10%','14%','18%','8%','2px','#E03A3E'), S('30%','14%','18%','8%','2px','#F5821F'),
      S('50%','14%','18%','8%','2px','#FDB827'), S('70%','14%','20%','8%','2px','#61BB46'),
      S('10%','24%','18%','8%','2px','#009DDC'), S('30%','24%','18%','8%','2px','#963D97'),
      S('50%','24%','18%','8%','2px','#E03A3E'), S('70%','24%','20%','8%','2px','#F5821F'),
      S('56%','58%','7%','10%','50%','#FFFFFF'), S('36%','82%','28%','7%','4px','#EDE3D2') ]) },
  { id: 'klondike', title: 'Klondike', genre: 'Cards', pitch: 'The patient one.',
    desc: 'Solitaire as it was on every office machine in 1994, minus the office and the machine.',
    plays: '58,470', sessions: '9m 33s', best: '14,220', live: '688',
    art: A('#2C6B4E', [
      S('8%','16%','20%','30%','3px','#F7F2E6'), S('32%','16%','20%','30%','3px','#F7F2E6'),
      S('56%','16%','20%','30%','3px','#E03A3E'), S('8%','54%','20%','30%','3px','#F7F2E6'),
      S('20%','62%','20%','30%','3px','#F7F2E6'), S('32%','70%','20%','30%','3px','#1E1810') ]) },
  { id: 'mines', title: 'Mine Hunt', genre: 'Puzzle', pitch: 'Count. Flag. Breathe.',
    plays: '43,880', sessions: '7m 02s', best: '6,410', live: '241',
    desc: 'Numbers, neighbours and nerve.',
    art: A('#D6C9AE', [
      S('10%','12%','20%','22%','3px','#EDE3D2'), S('34%','12%','20%','22%','3px','#EDE3D2'),
      S('58%','12%','20%','22%','3px','#EDE3D2'), S('10%','38%','20%','22%','3px','#EDE3D2'),
      S('34%','38%','20%','22%','3px','#E03A3E'), S('58%','38%','20%','22%','3px','#EDE3D2'),
      S('10%','64%','20%','22%','3px','#EDE3D2'), S('34%','64%','20%','22%','3px','#EDE3D2'),
      S('58%','64%','20%','22%','3px','#EDE3D2') ]) },
  { id: 'sudoku', title: 'Sudoku Daily', genre: 'Puzzle', pitch: 'A new grid every morning.',
    plays: '39,140', sessions: '11m 40s', best: '3,980', live: '905', desc: 'One puzzle a day.',
    art: A('#F3E9DA', [
      S('10%','10%','80%','2%','1px','#BCAB90'), S('10%','40%','80%','2%','1px','#2B2318'),
      S('10%','70%','80%','2%','1px','#BCAB90'), S('10%','10%','2%','82%','1px','#BCAB90'),
      S('39%','10%','2%','82%','1px','#2B2318'), S('68%','10%','2%','82%','1px','#BCAB90'),
      S('16%','18%','9%','12%','2px','#F5821F'), S('45%','48%','9%','12%','2px','#009DDC'),
      S('74%','76%','9%','12%','2px','#E03A3E') ]) },
  { id: 'word', title: 'Word Ladder', genre: 'Word', pitch: 'Five letters, six tries.',
    plays: '35,700', sessions: '4m 55s', best: '2,140', live: '1,510', desc: 'Change one letter at a time.',
    art: A('#EFE2CB', [
      S('8%','62%','16%','20%','3px','#BCAB90'), S('26%','52%','16%','20%','3px','#FDB827'),
      S('44%','42%','16%','20%','3px','#61BB46'), S('62%','32%','16%','20%','3px','#61BB46'),
      S('80%','22%','14%','20%','3px','#F5821F') ]) },
  { id: 'rhythm', title: 'Tap Rhythm', genre: 'Arcade', pitch: 'Four lanes, no mercy.',
    plays: '28,905', sessions: '3m 48s', best: '998,120', live: '430', desc: 'Hit the beat.',
    art: A('#191227', [
      S('12%','0%','16%','100%','0px','#241A38'), S('32%','0%','16%','100%','0px','#2E2145'),
      S('52%','0%','16%','100%','0px','#241A38'), S('72%','0%','16%','100%','0px','#2E2145'),
      S('12%','30%','16%','7%','2px','#009DDC'), S('32%','52%','16%','7%','2px','#963D97'),
      S('52%','18%','16%','7%','2px','#E03A3E'), S('72%','66%','16%','7%','2px','#FDB827'),
      S('8%','84%','84%','4%','2px','#F7F2E6') ]) },
  { id: 'bubble', title: 'Bubble Pop', genre: 'Casual', pitch: 'Match three, clear the board.',
    plays: '22,410', sessions: '6m 12s', best: '54,300', live: '167', desc: 'Aim and shoot.',
    art: A('#E4EFF3', [
      S('12%','14%','20%','20%','50%','#E03A3E'), S('36%','14%','20%','20%','50%','#FDB827'),
      S('60%','14%','20%','20%','50%','#009DDC'), S('24%','38%','20%','20%','50%','#61BB46'),
      S('48%','38%','20%','20%','50%','#963D97'), S('36%','62%','20%','20%','50%','#F5821F'),
      S('40%','86%','12%','12%','50%','#2B2318') ]) }
];

const BOARDS = {
  '2048':     [['mira_88','186,432'],['TOKYODRIFT','171,908'],['n0va','164,220'],['pixelpham','152,776'],['bluebird','148,004']],
  'blokku':   [['R3TR0','412,880'],['kaz.','388,140'],['sunny.lee','361,520'],['quocanh','344,908'],['mochi','330,116']],
  'snake':    [['n0va','9,840'],['mira_88','9,112'],['grid_lock','8,760'],['TOKYODRIFT','8,204'],['pixelpham','7,988']],
  'brick':    [['kaz.','77,150'],['bluebird','74,330'],['mochi','71,002'],['R3TR0','68,415'],['sunny.lee','65,780']],
  'klondike': [['sunny.lee','14,220'],['quocanh','13,905'],['mira_88','13,440'],['mochi','12,870'],['grid_lock','12,330']]
};

const YOU = { '2048': ['#142','96,120'], 'blokku': ['#318','188,400'], 'snake': ['#77','6,410'],
              'brick': ['#204','41,880'], 'klondike': ['#59','10,240'] };

const SAVED = [
  { id: '2048', line: 'Score 96,120 · best tile 512', pct: '64%' },
  { id: 'blokku', line: 'Level 12 · 188,400 pts', pct: '41%' },
  { id: 'klondike', line: '38 of 52 cards home', pct: '73%' }
];
