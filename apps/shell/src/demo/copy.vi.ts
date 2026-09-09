import type { DemoCopy } from './copy.en.js';

/**
 * PLACEHOLDER COPY — deleted together with `demoData.ts`.
 *
 * `season` is abbreviated (`4N 12G` for *4 ngày 12 giờ*) because it renders at
 * 11px in the leaderboard header next to the title, where the spelled-out form
 * pushes the row onto two lines.
 */
export function demoVi(n: Intl.NumberFormat): DemoCopy {
  return {
    tagline: {
      blokku: 'Xếp gọn. Phá hàng. Toát mồ hôi.',
      snake: 'Đừng cắn vào chính mình.',
      brick: 'Một quả bóng. Bốn mươi viên gạch.',
      klondike: 'Trò của người kiên nhẫn.',
      mines: 'Đếm, cắm cờ, thở đều.',
      sudoku: 'Mỗi sáng một bảng số mới.',
      word: 'Năm chữ cái, sáu lượt đoán.',
      rhythm: 'Bốn làn, không khoan nhượng.',
      bubble: 'Ghép ba, dọn sạch bảng.',
    },

    blurb: {
      '2048':
        'Trò ai cũng đã biết chơi. Lưới bốn nhân bốn, hai ô mở đầu, và thêm một cơ hội để cuối cùng cũng thấy 4096.',
      blokku:
        'Bảy khối rơi xuống, một giếng hẹp, và tốc độ rơi thôi tử tế đâu đó quanh cấp chín.',
      snake:
        'Một lưới ô, một cái đuôi mỗi lúc một dài, và đúng một quyết định sai giữa bạn và kỷ lục của chính mình.',
      brick:
        'Chỉnh góc thanh đỡ, phá bức tường, và cố đừng để viên gạch cuối phá hỏng một ván hoàn hảo.',
      klondike:
        'Solitaire như trên mọi máy tính văn phòng năm 1994, trừ cái văn phòng và cái máy.',
      mines: 'Những con số, những ô bên cạnh, và thần kinh thép.',
      sudoku: 'Mỗi ngày một câu đố.',
      word: 'Mỗi lần đổi một chữ cái.',
      rhythm: 'Chạm đúng nhịp.',
      bubble: 'Ngắm và bắn.',
    },

    saved: {
      '2048': `Điểm ${n.format(96120)} · ô lớn nhất 512`,
      blokku: `Cấp 12 · ${n.format(188400)} điểm`,
      klondike: '38/52 lá đã về nhà',
    },

    season: 'MÙA 3 · CÒN 4N 12G',
  };
}
