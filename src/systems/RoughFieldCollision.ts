import type { ReferencePolygon } from "../config/fieldTerrain.ts";

function contains(polygon: ReferencePolygon, x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[i];
    const [bx, by] = polygon[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

/** 手指定の輪郭をArcadeの矩形へ変換するだけ。画像解析やTiled本実装ではない。 */
export function buildRoughCollision(
  width: number, height: number, cell: number, land: ReferencePolygon,
  barriers: readonly { kind: string; polygon: ReferencePolygon }[],
  bridges: readonly { x: number; y: number; width: number; height: number }[],
): { x: number; y: number; width: number; height: number }[] {
  const blocked = (x: number, y: number): boolean =>
    !contains(land, x, y) || barriers.some(({ kind, polygon }) =>
      contains(polygon, x, y) && !(kind === "river" && bridges.some(b =>
        x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height)));
  const rectangles = [];
  // 行の連続セルを結合してStatic Body数を抑える。
  for (let y = 0; y < height; y += cell) {
    let start: number | null = null;
    for (let x = 0; x < width; x += cell) {
      const hit = blocked(Math.min(x + cell / 2, width), Math.min(y + cell / 2, height));
      if (hit && start === null) start = x;
      if (!hit && start !== null) {
        rectangles.push({ x: start, y, width: x - start, height: Math.min(cell, height - y) });
        start = null;
      }
    }
    if (start !== null) rectangles.push({ x: start, y, width: width - start, height: Math.min(cell, height - y) });
  }
  return rectangles;
}
