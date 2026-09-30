// BRIEF.md §0 / §4
export const FPS = 30;
export const DURATION = 900; // ちょうど30.0秒
export const WIDE = { width: 1920, height: 1080 } as const;
export const TALL = { width: 1080, height: 1920 } as const;

// §4 固定点（拍スナップ対象外）
export const FIXED = {
  drop: 210,
  silence: 765,
  logo: 786,
  end: 900,
} as const;

// §7 縦型の安全領域（上下250pxの内側）
export const TALL_SAFE_MARGIN = 250;
