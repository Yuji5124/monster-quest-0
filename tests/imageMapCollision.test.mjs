import assert from "node:assert/strict";
import test from "node:test";
import { buildCollisionRects } from "../src/systems/ImageMapCollisionData.ts";

function maskFromCells(rows) {
  const height = rows.length;
  const width = rows[0].length;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = rows[y][x] === "#" ? 0 : 255;
      const offset = (y * width + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  return { width, height, data };
}

test("black collision cells become one vertically merged static rectangle", () => {
  const mask = maskFromCells([
    ".##.",
    ".##.",
    ".##.",
  ]);
  assert.deepEqual(buildCollisionRects(mask, 1), [{ x: 1, y: 0, width: 2, height: 3 }]);
});

test("white cells remain walkable and split collision runs", () => {
  const mask = maskFromCells(["#.#"]);
  assert.deepEqual(buildCollisionRects(mask, 1), [
    { x: 0, y: 0, width: 1, height: 1 },
    { x: 2, y: 0, width: 1, height: 1 },
  ]);
});

test("collision cells use the mask center sample for each runtime cell", () => {
  const mask = maskFromCells([
    "#...",
    "....",
    "....",
    "....",
  ]);
  assert.deepEqual(buildCollisionRects(mask, 2), [{ x: 0, y: 0, width: 2, height: 2 }]);
});

test("invalid collision masks fail before runtime bodies are created", () => {
  assert.throws(() => buildCollisionRects({ width: 2, height: 2, data: new Uint8ClampedArray(3) }, 1), /dimensions/);
  assert.throws(() => buildCollisionRects(maskFromCells([["."]]), 0), /cellSize/);
});
