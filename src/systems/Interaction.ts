import type { Facing } from "./PlayerMovement.ts";

/** 左上基準の矩形。Phaser非依存にして単体テストしやすくする。 */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** 主人公中心から向いている方向へ伸びる小さな判定領域。NPC/宝箱/扉等、対象を問わず使える。 */
export function facingZone(
  center: { readonly x: number; readonly y: number },
  facing: Facing,
  reach: number,
  span: number,
): Rect {
  switch (facing) {
    case "up":
      return { x: center.x - span / 2, y: center.y - reach, width: span, height: reach };
    case "down":
      return { x: center.x - span / 2, y: center.y, width: span, height: reach };
    case "left":
      return { x: center.x - reach, y: center.y - span / 2, width: reach, height: span };
    case "right":
      return { x: center.x, y: center.y - span / 2, width: reach, height: span };
  }
}

/** 主人公が向いている方向の目の前に対象があるかどうか。離れている/背を向けている場合はfalse。 */
export function canInteract(
  center: { readonly x: number; readonly y: number },
  facing: Facing,
  target: Rect,
  reach: number,
  span: number,
): boolean {
  return rectsOverlap(facingZone(center, facing, reach, span), target);
}
