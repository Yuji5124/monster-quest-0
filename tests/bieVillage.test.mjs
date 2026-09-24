import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { PLAYER } from "../src/config/player.ts";
import { MAPS } from "../src/config/maps.ts";
import { buildCollisionRects } from "../src/systems/ImageMapCollisionData.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects } from "../src/systems/ImageMapData.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_DIR = path.join(REPO_ROOT, "assets/maps/bie_village");
const REFERENCE_PATH = path.join(REPO_ROOT, "assets/maps/reference/reference/ビーエのむら更新.png");

function readPngSize(filePath) {
  const buffer = readFileSync(filePath);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test("bie-village image-map manifest points to the four required map layers", () => {
  const manifest = readImageMapManifest(JSON.parse(readFileSync(path.join(MAP_DIR, "map.json"), "utf-8")));
  assert.equal(manifest.coordinateSpace, "background-pixels");
  assert.equal(manifest.id, "map_03_bie_village");
  assert.equal(manifest.assetStatus, "CURRENT");
  assert.equal(manifest.background, "background.png");
  assert.equal(manifest.collision, "collision.png");
  assert.equal(manifest.events, "events.json");
  assert.equal(manifest.objects, "objects.json");
  for (const asset of [manifest.background, manifest.collision, manifest.events, manifest.objects]) {
    assert.ok(existsSync(path.join(MAP_DIR, asset)), `${asset} must exist beside map.json`);
  }
});

test("bie-village background is an unmodified copy of the user-supplied reference image", () => {
  assert.ok(existsSync(REFERENCE_PATH), "original reference image must still exist and not be deleted/overwritten");
  const referenceBytes = readFileSync(REFERENCE_PATH);
  const backgroundBytes = readFileSync(path.join(MAP_DIR, "background.png"));
  assert.ok(referenceBytes.equals(backgroundBytes), "background.png must be byte-identical to the reference (not redrawn)");
});

test("bie-village background and collision share the same pixel dimensions as the manifest", () => {
  const manifest = readImageMapManifest(JSON.parse(readFileSync(path.join(MAP_DIR, "map.json"), "utf-8")));
  const backgroundSize = readPngSize(path.join(MAP_DIR, "background.png"));
  const collisionSize = readPngSize(path.join(MAP_DIR, "collision.png"));
  assert.deepEqual(backgroundSize, { width: manifest.width, height: manifest.height });
  assert.deepEqual(collisionSize, { width: manifest.width, height: manifest.height });
});

test("bie-village package routes its north-gate event to the point-selection world map", () => {
  const events = readImageMapEvents(JSON.parse(readFileSync(path.join(MAP_DIR, "events.json"), "utf-8")));
  const objects = readImageMapObjects(JSON.parse(readFileSync(path.join(MAP_DIR, "objects.json"), "utf-8")));
  assert.equal(events.length, 1);
  assert.equal(events[0].trigger, "enter");
  assert.equal(events[0].commands[0].type, "world-map");
  assert.equal(events[0].commands[0].worldMapEntryId, "from_bie_village");
  // No NPCs yet: docs/NPC/02_bie_no_mura.md is still SOURCE_DRAFT_EXISTS / REDUCING.
  assert.deepEqual(objects, []);
});

test("bie-village collision mask keeps the gate, spawn and plaza walkable while blocking buildings/forest/water", () => {
  const manifest = readImageMapManifest(JSON.parse(readFileSync(path.join(MAP_DIR, "map.json"), "utf-8")));
  const collisionRects = buildCollisionRects(readPngAsMask(path.join(MAP_DIR, "collision.png")), manifest.collisionCellSize);
  assert.ok(collisionRects.length > 0);

  const isBlocked = (x, y) => collisionRects.some((rect) => x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height);

  assert.equal(isBlocked(710, 150), false, "the fromWorldMap spawn just inside the north gate must be walkable");
  assert.equal(isBlocked(710, 30), false, "the north gate exit zone must be walkable");
  assert.equal(isBlocked(950, 420), false, "the stone plaza must be walkable");
  assert.equal(isBlocked(700, 90), false, "the north gate stairs must be walkable");
  assert.equal(isBlocked(390, 815), false, "the south-west river bridge must be walkable");
  assert.equal(isBlocked(560, 700), false, "the stone stairs by the south-west road must be walkable");
  assert.equal(isBlocked(850, 530), true, "the big tree's stone ring in the plaza must be blocked");

  assert.equal(isBlocked(300, 280), true, "the watermill house footprint must be blocked");
  assert.equal(isBlocked(950, 250), true, "the garden house footprint must be blocked");
  assert.equal(isBlocked(1200, 470), true, "the blue house near the plaza must be blocked");
  assert.equal(isBlocked(950, 680), true, "the woodcutter house footprint must be blocked");
  assert.equal(isBlocked(50, 50), true, "deep forest corners must stay blocked");
  assert.equal(isBlocked(150, 300), true, "the river must stay blocked");
});

test("the fromWorldMap spawn's full Player body clears the north-gate event zone (no instant re-trigger)", () => {
  const events = readImageMapEvents(JSON.parse(readFileSync(path.join(MAP_DIR, "events.json"), "utf-8")));
  const gate = events.find((event) => event.id === "event_bie_village_north_exit");
  const spawn = MAPS.map_03_bie_village.spawns.fromWorldMap;
  const halfW = PLAYER.width / 2;
  const halfH = PLAYER.height / 2;
  const bodyOverlapsGate =
    spawn.x + halfW > gate.bounds.x && spawn.x - halfW < gate.bounds.x + gate.bounds.width &&
    spawn.y + halfH > gate.bounds.y && spawn.y - halfH < gate.bounds.y + gate.bounds.height;
  assert.equal(bodyOverlapsGate, false, "the spawned Player body must not overlap the gate's world-map trigger zone");
});

// Minimal PNG reader (8-bit RGBA/RGB, non-interlaced), mirrors tests/startingForest.test.mjs so this
// file stays Node/Phaser-independent instead of depending on the browser Canvas the runtime uses.
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
