import type { Strings } from './en.js';

/**
 * Vietnamese. Two entries are deliberately not literal:
 *
 * - `best_label` is "CAO NHẤT" rather than the shorter "KỶ LỤC"; the HUD puts
 *   it beside SCORE at 320px and the longer word still fits, while the shorter
 *   one reads as a leaderboard rank the game does not have.
 * - `ad_badge` is "QC", the ordinary Vietnamese abbreviation for advertising.
 *   "AD" would be read as English and the badge is two characters wide.
 */
export function vi(n: Intl.NumberFormat): Strings {
  return {
    score_label: 'ĐIỂM',
    best_label: 'CAO NHẤT',
    new_short: 'Mới',
    undo: 'Hoàn tác',
    ad_badge: 'QC',

    win_title: 'Bạn đã đạt 2048',
    win_note: 'Chơi tiếp để ghép ô lớn hơn.',
    keep_going: 'Chơi tiếp',

    stuck_title: 'Hết nước đi',
    stuck_note: 'Xem một quảng cáo ngắn để xoá bốn ô nhỏ nhất và chơi tiếp.',
    watch_ad: 'Xem quảng cáo',
    no_thanks: 'Không, cảm ơn',

    game_over: 'Kết thúc',
    new_game: 'Ván mới',
    final_score: (score, best) => `Điểm ${n.format(score)} · Cao nhất ${n.format(best)}`,

    boot_error: (message) => `Không khởi động được: ${message}`,

    number: (value) => n.format(value),
  };
}
