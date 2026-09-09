import type { Strings } from './en.js';

/**
 * Vietnamese. One entry is deliberately not literal:
 *
 * - `best` is "Cao nhất" (highest) rather than "Kỷ lục" (record). Beside the
 *   trophy on the game-over card the shorter "Kỷ lục" reads as a leaderboard
 *   rank this game does not have; "Cao nhất" is plainly the player's own best.
 *   Same call the 2048 HUD makes.
 */
export function vi(n: Intl.NumberFormat): Strings {
  return {
    play: 'Chơi',
    settings: 'Cài đặt',
    language: 'Ngôn ngữ',
    back_to_hub: 'Về trang chủ',
    back: 'Quay lại',

    swipe_to_start: 'Vuốt hoặc nhấn phím mũi tên để bắt đầu',
    tap_to_resume: 'Chạm để tiếp tục',

    game_over: 'Kết thúc',
    new_game: 'Ván mới',
    continue_with_ad: 'Xem quảng cáo để chơi tiếp',

    score: (v) => `Điểm ${n.format(v)}`,
    best: (v) => `Cao nhất ${n.format(v)}`,

    number: (v) => n.format(v),
  };
}
