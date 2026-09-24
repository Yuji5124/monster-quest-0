/**
 * View-only tuning for No.08. None of these values take part in floor generation,
 * turn resolution, save data, or battle balance.
 */
export const MAJIN_CAVE_PRESENTATION = {
  cameraZoom: 2,
  worldTop: 46,
  worldBottom: 616,
  hudTopHeight: 46,
  hudBottomY: 616,
  hudBottomHeight: 104,
  minimap: {
    x: 824,
    y: 61,
    cellSize: 5,
  },
  fog: {
    unseenAlpha: 0.92,
    exploredAlpha: 0.58,
    visibleAlpha: 0,
  },
  movement: {
    playerMs: 110,
    lungeDistance: 9,
    lungeMs: 70,
  },
} as const;

/**
 * No.08 の主人公による通常近接攻撃だけで使う、画像不要の斬撃表示値。
 * TurnSystem・当たり判定・敵AIから独立した、Scene 側の純粋な見た目用設定。
 */
export const MAJIN_CAVE_SLASH_PRESENTATION = {
  hitDelayMs: 40,
  durationMs: 100,
  bossDurationMs: 120,
  bossLungeMs: 80,
  radius: 16,
  bossScale: 1.18,
} as const;

export type MajinCaveSlashDirection = "up" | "down" | "left" | "right";

/** Graphics の基本形を右向きに描き、攻撃方向へ回すための角度。 */
export function getMajinCaveSlashRotation(direction: MajinCaveSlashDirection): number {
  if (direction === "left") return Math.PI;
  if (direction === "up") return -Math.PI / 2;
  if (direction === "down") return Math.PI / 2;
  return 0;
}

/** Shared by the main world fog and the large explored-map overlay. */
export function isMajinCavePointVisible(
  origin: { readonly x: number; readonly y: number },
  point: { readonly x: number; readonly y: number },
  radius: number,
): boolean {
  return Math.abs(point.x - origin.x) + Math.abs(point.y - origin.y) <= radius;
}

export function getMajinCaveFogAlpha(explored: boolean, visible: boolean): number {
  if (visible) return MAJIN_CAVE_PRESENTATION.fog.visibleAlpha;
  return explored ? MAJIN_CAVE_PRESENTATION.fog.exploredAlpha : MAJIN_CAVE_PRESENTATION.fog.unseenAlpha;
}
