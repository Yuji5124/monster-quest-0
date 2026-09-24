/**
 * Lv1〜25累積EXPテーブル。2026-09-22のユーザー確定仕様（成長／装備／経験値バランス統合）による。
 * CHARACTER_GROWTH.md §2 と同期する。Lv25を実質的な成長上限として扱い、これを超える値は返さない。
 */
export const MAX_CHARACTER_LEVEL = 25;

// index = level - 1. EXP_TABLE[0] は Lv1 の累積EXP（常に0）。
export const EXP_TABLE: readonly number[] = [
  0, 12, 35, 75, 135, 220, 340, 500, 720, 1000,
  1360, 1820, 2400, 3120, 4000, 5080, 6380, 7940, 9800, 12000,
  14600, 17600, 21100, 25100, 29700,
];

function clampLevel(level: number): number {
  return Math.min(MAX_CHARACTER_LEVEL, Math.max(1, Math.floor(level)));
}

/** そのレベルに到達するために必要な累積EXP。Lv25を超えるレベルはLv25として扱う。 */
export function getExpForLevel(level: number): number {
  return EXP_TABLE[clampLevel(level) - 1];
}

/** 次のレベルへ必要な累積EXP。Lv25(上限)では現在値のまま(それ以上上がらない)。 */
export function getExpForNextLevel(level: number): number {
  const clamped = clampLevel(level);
  return clamped >= MAX_CHARACTER_LEVEL ? EXP_TABLE[MAX_CHARACTER_LEVEL - 1] : EXP_TABLE[clamped];
}

/** 累積EXPからレベルを算出する。Lv25を超えて増え続けても上限で止まる。 */
export function getLevelForTotalExp(totalExp: number): number {
  const exp = Number.isFinite(totalExp) && totalExp > 0 ? totalExp : 0;
  let level = 1;
  while (level < MAX_CHARACTER_LEVEL && exp >= EXP_TABLE[level]) level += 1;
  return level;
}
