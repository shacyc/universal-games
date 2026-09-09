import type { Strings } from './en.js';

/**
 * Vietnamese. Choices worth defending, because they are not literal:
 *
 * - `stat_session` is `TB mỗi ván` — "TB" is the everyday abbreviation for
 *   *trung bình*. The cell is one of three across a phone screen and the full
 *   phrase would wrap under a value it is meant to label.
 * - `duration` is `4:12`, not `4 phút 12 giây`. English abbreviates to `4m 12s`
 *   and Vietnamese has no equally short form, so the colon reads correctly to
 *   anyone and fits the same cell.
 * - `board_title` keeps the borrowed `TOP`, which is what Vietnamese players
 *   actually say; `Người chơi hàng đầu` is a translation nobody uses.
 * - `ios_step_add` quotes `Thêm vào MH chính`, which is the exact wording iOS
 *   ships in Vietnamese. Translating Apple's menu item ourselves would send the
 *   player looking for a row that is not there.
 * - `rank` stays `#142`. The symbol is read the same way here, and `Hạng 142`
 *   does not fit the leaderboard's rank column.
 * - `nav_install` is `Cài về máy`, not `Cài đặt`. Vietnamese uses `Cài đặt` for
 *   both *install* and *settings*, and the settings sheet over a running game
 *   needs that word more than a nav link to a marketing section does.
 */
export function vi(n: Intl.NumberFormat): Strings {
  return {
    nav_games: 'Trò chơi',
    nav_continue: 'Chơi tiếp',
    nav_install: 'Cài về máy',
    theme_group: 'Giao diện',
    theme_vintage: 'CỔ ĐIỂN',
    theme_modern: 'HIỆN ĐẠI',
    language: 'Ngôn ngữ',

    spotlight_title: 'NỔI BẬT',
    playing_now: (live) => `${n.format(live)} đang chơi`,
    show_game: (title) => `Xem ${title}`,
    prev_game: 'Trò chơi trước',
    next_game: 'Trò chơi sau',
    stat_plays: 'Lượt chơi',
    stat_session: 'TB mỗi ván',
    stat_best: 'Kỷ lục thế giới',
    play_now: 'CHƠI NGAY',
    coming_soon: 'SẮP RA MẮT',
    board_title: 'TOP NGƯỜI CHƠI',
    board_you: 'Bạn',

    all_games: 'TẤT CẢ TRÒ CHƠI',
    titles_all: (total) => `${n.format(total)} trò chơi, mỗi tháng lại có thêm`,
    titles_filtered: (shown, total) => `${n.format(shown)} trong ${n.format(total)} trò chơi`,
    search_games: 'Tìm trò chơi',
    genres: {
      all: 'Tất cả',
      puzzle: 'Giải đố',
      arcade: 'Arcade',
      cards: 'Bài',
      word: 'Chữ',
      casual: 'Giải trí',
    },
    empty_title: 'KHÔNG CÓ TRÒ NÀO KHỚP',
    empty_body: 'Thử một từ khác, hoặc bỏ bộ lọc.',
    card_play: (title) => `Chơi ${title}`,
    card_soon: (title) => `${title} — sắp ra mắt`,
    badge_soon: 'SẮP CÓ',
    plays_count: (plays) => `${n.format(plays)} lượt chơi`,

    resume_title: 'CHƠI TIẾP TỪ CHỖ ĐANG DỞ',
    resume_sub: 'Lưu trên máy này — không cần tài khoản.',
    resume_action: 'CHƠI TIẾP',

    install_title: 'MỖI TRÒ MỘT\nBIỂU TƯỢNG RIÊNG',
    install_body:
      'Thêm một trò chơi vào màn hình chính và nó tự cài — biểu tượng riêng, cửa sổ toàn màn hình riêng, và vẫn chơi được khi không có mạng. Không phải tải gì từ cửa hàng ứng dụng.',
    install_android: 'Android — một chạm ngay trong màn hình trò chơi',
    install_ios: 'iPhone — Chia sẻ, rồi Thêm vào MH chính',
    install_cta: (target) => `CÀI ${target.toUpperCase()}`,

    install_sheet_title: (target) => `Thêm ${target} vào màn hình chính`,
    ios_step_share: 'Chạm Chia sẻ, ở cuối màn hình Safari',
    ios_step_add: 'Chọn “Thêm vào MH chính”',
    ios_note: 'Nó có biểu tượng riêng và mở toàn màn hình — không phải tải gì.',
    ios_done: 'Đã hiểu',
    prompt_note: 'Biểu tượng riêng, cửa sổ toàn màn hình riêng, và chơi được khi không có mạng.',
    prompt_not_now: 'Để sau',
    prompt_install: 'Cài đặt',
    install_target: (target) => `Cài ${target}`,

    back_to_games: 'Về danh sách trò chơi',
    settings: 'Cài đặt',
    settings_back: 'Quay lại',
    close: 'Đóng',

    foot_brand: (brand) => `${brand} — TRÒ CHƠI NHỎ, KHÔNG CẦN CÀI`,
    foot_note: 'Làm cho trình duyệt · 2026',

    number: (value) => n.format(value),
    duration: (minutes, seconds) => `${n.format(minutes)}:${seconds.toString().padStart(2, '0')}`,
    rank: (position) => `#${n.format(position)}`,
  };
}
