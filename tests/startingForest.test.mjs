import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { buildCollisionRects } from "../src/systems/ImageMapCollisionData.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects } from "../src/systems/ImageMapData.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_DIR = path.join(REPO_ROOT, "assets/maps/starting_forest");
const REFERENCE_PATH = path.join(REPO_ROOT, "assets/maps/reference/reference/はじまりのもり.png");

function readPngSize(filePath) {
  const buffer = readFileSync(filePath);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test("starting-forest image-map manifest points to the four required map layers", () => {
  const manifest = readImageMapManifest(JSON.parse(readFileSync(path.join(MAP_DIR, "map.json"), "utf-8")));
  assert.equal(manifest.coordinateSpace, "background-pixels");
  assert.equal(manifest.id, "map_starting_forest");
  assert.equal(manifest.assetStatus, "CURRENT");
  assert.equal(manifest.background, "background.png");
  assert.equal(manifest.collision, "collision.png");
  assert.equal(manifest.events, "events.json");
  assert.equal(manifest.objects, "objects.json");
  for (const asset of [manifest.background, manifest.collision, manifest.events, manifest.objects]) {
    assert.ok(existsSync(path.join(MAP_DIR, asset)), `${asset} must exist beside map.json`);
  }
});

test("starting-forest background is an unmodified copy of the user-supplied reference image", () => {
  assert.ok(existsSync(REFERENCE_PATH), "original reference image must still exist and not be deleted/overwritten");
  const referenceBytes = readFileSync(REFERENCE_PATH);
  const backgroundBytes = readFileSync(path.join(MAP_DIR, "background.png"));
  assert.ok(referenceBytes.equals(backgroundBytes), "background.png must be byte-identical to the reference (not redrawn)");
});

test("starting-forest background and collision share the same pixel dimensions as the manifest", () => {
  const manifest = readImageMapManifest(JSON.parse(readFileSync(path.join(MAP_DIR, "map.json"), "utf-8")));
  const backgroundSize = readPngSize(path.join(MAP_DIR, "background.png"));
  const collisionSize = readPngSize(path.join(MAP_DIR, "collision.png"));
  assert.deepEqual(backgroundSize, { width: manifest.width, height: manifest.height });
  assert.deepEqual(collisionSize, { width: manifest.width, height: manifest.height });
});

test("starting-forest package routes its north-archway event to the point-selection world map", () => {
  const events = readImageMapEvents(JSON.parse(readFileSync(path.join(MAP_DIR, "events.json"), "utf-8")));
  const objects = readImageMapObjects(JSON.parse(readFileSync(path.join(MAP_DIR, "objects.json"), "utf-8")));
  assert.equal(events.length, 1);
  assert.equal(events[0].trigger, "enter");
  assert.equal(events[0].commands[0].type, "world-map");
  assert.equal(events[0].commands[0].worldMapEntryId, "from_starting_forest");
  assert.deepEqual(objects, []);
});

test("starting-forest collision mask keeps the south gate and north archway walkable and reaches both map edges", () => {
  const manifest = readImageMapManifest(JSON.parse(readFileSync(path.join(MAP_DIR, "map.json"), "utf-8")));
  const collisionRects = buildCollisionRects(readPngAsMask(path.join(MAP_DIR, "collision.png")), manifest.collisionCellSize);
  assert.ok(collisionRects.length > 0, "the mask must contain at least one blocked rectangle (the surrounding forest)");

  // A pixel is walkable if it is not covered by any blocked rectangle.
  const isBlocked = (x, y) => collisionRects.some((rect) => x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height);
  assert.equal(isBlocked(770, 970), false, "the fromWorldMap spawn near the south gate must be walkable");
  assert.equal(isBlocked(770, 30), false, "the north archway exit zone must be walkable");
  // Deep forest corners must stay blocked.
  assert.equal(isBlocked(50, 50), true);
  assert.equal(isBlocked(1480, 970), true);
});

// Minimal PNG reader (8-bit RGBA/RGB, non-interlaced) shared only by this test file so it stays
// Node/Phaser-independent, mirroring how ImageMapCollisionData.ts consumes plain pixel arrays.
function readPngAsMask(filePath) {
  const buffer = readFileSync(filePath);
  let offset = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idatChunks = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    if (type === "IHDR") {
      width = buffer.readUInt32BE(dataStart);
      height = buffer.readUInt32BE(dataStart + 4);
      bitDepth = buffer.readUInt8(dataStart + 8);
      colorType = buffer.readUInt8(dataStart + 9);
    } else if (type === "IDAT") {
      idatChunks.push(buffer.subarray(dataStart, dataStart + length));
    }
    offset = dataStart + length + 4;
  }
  assert.equal(bitDepth, 8, "collision.png must be 8-bit for this minimal decoder");
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : (() => { throw new Error(`unsupported PNG colorType ${colorType}`); })();
  const raw = inflateSync(Buffer.concat(idatChunks));
  const stride = width * channels;
  const data = new Uint8ClampedArray(width * height * 4);
  let prevRow = new Uint8Array(stride);
  let rawOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filterType = raw[rawOffset];
    rawOffset += 1;
    const row = new Uint8Array(stride);
    for (let x = 0; x < stride; x += 1) {
      const rawByte = raw[rawOffset + x];
      const a = x >= channels ? row[x - channels] : 0;
      const b = prevRow[x];
      const c = x >= channels ? prevRow[x - channels] : 0;
      let value;
      if (filterType === 0) value = rawByte;
      else if (filterType === 1) value = rawByte + a;
      else if (filterType === 2) value = rawByte + b;
      else if (filterType === 3) value = rawByte + Math.floor((a + b) / 2);
      else if (filterType === 4) value = rawByte + paeth(a, b, c);
      else throw new Error(`unsupported PNG filter type ${filterType}`);
      row[x] = value & 0xff;
    }
    rawOffset += stride;
    for (let x = 0; x < width; x += 1) {
      const pixelOffset = (y * width + x) * 4;
      const rowOffset = x * channels;
      data[pixelOffset] = row[rowOffset];
      data[pixelOffset + 1] = row[rowOffset + 1];
      data[pixelOffset + 2] = row[rowOffset + 2];
      data[pixelOffset + 3] = channels === 4 ? row[rowOffset + 3] : 255;
    }
    prevRow = row;
  }
  return { width, height, data };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}
