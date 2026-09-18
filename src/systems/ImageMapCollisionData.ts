/**
 * BACKGROUND座標系の白=歩行可能 / 黒=歩行不可マスクを、物理エンジンに依存しない矩形へ変換する。
 * NodeテストとPhaser実行時の両方で同一の判定を使う。
 */
export interface CollisionMaskImageData {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export interface CollisionRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface MutableCollisionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Converts a mask to merged blocked rectangles at the requested runtime resolution. */
export function buildCollisionRects(mask: CollisionMaskImageData, cellSize: number): CollisionRect[] {
  if (!Number.isInteger(cellSize) || cellSize <= 0) throw new Error("collision cellSize must be a positive integer");
  if (mask.width <= 0 || mask.height <= 0 || mask.data.length !== mask.width * mask.height * 4) {
    throw new Error("collision mask dimensions and RGBA data length must match");
  }

  const columns = Math.ceil(mask.width / cellSize);
  const rows = Math.ceil(mask.height / cellSize);
  const rectangles: MutableCollisionRect[] = [];
  let active = new Map<string, MutableCollisionRect>();

  for (let row = 0; row < rows; row += 1) {
    const y = row * cellSize;
    const cellHeight = Math.min(cellSize, mask.height - y);
    const runs: Array<{ x: number; width: number }> = [];
    let runStart: number | null = null;

    for (let column = 0; column < columns; column += 1) {
      const x = column * cellSize;
      const cellWidth = Math.min(cellSize, mask.width - x);
      if (isBlockedAtCellCenter(mask, x, y, cellWidth, cellHeight)) {
        if (runStart === null) runStart = x;
      } else if (runStart !== null) {
        runs.push({ x: runStart, width: x - runStart });
        runStart = null;
      }
    }
    if (runStart !== null) runs.push({ x: runStart, width: mask.width - runStart });

    const nextActive = new Map<string, MutableCollisionRect>();
    for (const run of runs) {
      const key = `${run.x}:${run.width}`;
      const previous = active.get(key);
      if (previous) {
        previous.height += cellHeight;
        nextActive.set(key, previous);
      } else {
        const rect = { x: run.x, y, width: run.width, height: cellHeight };
        rectangles.push(rect);
        nextActive.set(key, rect);
      }
    }
    active = nextActive;
  }

  return rectangles;
}

function isBlockedAtCellCenter(mask: CollisionMaskImageData, x: number, y: number, width: number, height: number): boolean {
  const sampleX = x + Math.floor((width - 1) / 2);
  const sampleY = y + Math.floor((height - 1) / 2);
  const offset = (sampleY * mask.width + sampleX) * 4;
  const red = mask.data[offset];
  const green = mask.data[offset + 1];
  const blue = mask.data[offset + 2];
  const alpha = mask.data[offset + 3];
  return alpha > 0 && red < 128 && green < 128 && blue < 128;
}
