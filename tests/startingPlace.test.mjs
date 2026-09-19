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
const MAP_DIR = path.join(REPO_ROOT, "assets/maps/starting_place");
const REFERENCE_DIR = path.join(REPO_ROOT, "assets/maps/reference/reference");
const NIGHT_REFERENCE_PATH = path.join(REFERENCE_DIR, "はじまりのばしょ_夜.png");
const DAY_REFERENCE_PATH = path.join(REFERENCE_DIR, "はじまりのばしょ.png");

function readPngSize(filePath) {
  const buffer = readFileSync(filePath);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function loadManifest() {
  return readImageMapManifest(JSON.parse(readFileSync(path.join(MAP_DIR, "map.json"), "utf-8")));
}

function loadCollision() {
  const manifest = loadManifest();
  const rects = buildCollisionRects(readPngAsMask(path.join(MAP_DIR, "collision.png")), manifest.collisionCellSize);
  const isBlocked = (x, y) => rects.some((rect) => x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height);
  return { manifest, rects, isBlocked };
}

test("starting-place image-map manifest points to the four required map layers", () => {
  const manifest = loadManifest();
  assert.equal(manifest.coordinateSpace, "background-pixels");
  assert.equal(manifest.id, "map_01_starting_place");
  assert.equal(manifest.assetStatus, "CURRENT");
  assert.equal(manifest.background, "background.png");
  assert.equal(manifest.collision, "collision.png");
  assert.equal(manifest.events, "events.json");
  assert.equal(manifest.objects, "objects.json");
  for (const asset of [manifest.background, manifest.collision, manifest.events, manifest.objects]) {
    assert.ok(existsSync(path.join(MAP_DIR, asset)), `${asset} must exist beside map.json`);
  }
});

test("No.01 alone uses its native 100% scale while every other current image map remains 150%", () => {
  assert.equal(loadManifest().worldScale, 1);
  for (const mapDirectory of ["starting_town", "starting_forest", "bie_village", "rainland_forest_1", "rainland_forest_2"]) {
    const otherManifest = readImageMapManifest(JSON.parse(readFileSync(path.join(REPO_ROOT, "assets/maps", mapDirectory, "map.json"), "utf-8")));
    assert.equal(otherManifest.worldScale, 1.5, `${mapDirectory} must remain at 150%`);
  }
});

test("starting-place background is an unmodified copy of the user-supplied night reference image", () => {
  assert.ok(existsSync(NIGHT_REFERENCE_PATH), "original night reference image must still exist and not be deleted/overwritten");
  const referenceBytes = readFileSync(NIGHT_REFERENCE_PATH);
  const backgroundBytes = readFileSync(path.join(MAP_DIR, "background.png"));
  assert.ok(referenceBytes.equals(backgroundBytes), "background.png must be byte-identical to the reference (not redrawn)");
});

test("the day reference shares the night image's dimensions, so this collision can be reused for a day background", () => {
  assert.ok(existsSync(DAY_REFERENCE_PATH), "day reference image must still exist");
  assert.deepEqual(readPngSize(DAY_REFERENCE_PATH), readPngSize(NIGHT_REFERENCE_PATH));
});

test("starting-place background and collision share the same pixel dimensions as the manifest", () => {
  const manifest = loadManifest();
  const backgroundSize = readPngSize(path.join(MAP_DIR, "background.png"));
  const collisionSize = readPngSize(path.join(MAP_DIR, "collision.png"));
  assert.deepEqual(backgroundSize, { width: manifest.width, height: manifest.height });
  assert.deepEqual(collisionSize, { width: manifest.width, height: manifest.height });
});

test("starting-place package routes its north-trail event to the point-selection world map", () => {
  const events = readImageMapEvents(JSON.parse(readFileSync(path.join(MAP_DIR, "events.json"), "utf-8")));
  const objects = readImageMapObjects(JSON.parse(readFileSync(path.join(MAP_DIR, "objects.json"), "utf-8")));
  assert.equal(events.length, 1);
  assert.equal(events[0].id, "event_no01_north_gate");
  assert.equal(events[0].trigger, "enter");
  assert.equal(events[0].commands[0].type, "world-map");
  assert.equal(events[0].commands[0].worldMapEntryId, "from_starting_place");
  assert.deepEqual(objects, []);
});

test("starting-place collision keeps the trails, spawns and exit zone walkable while blocking the campfire, water, forest and cliff", () => {
  const { isBlocked } = loadCollision();
  const events = readImageMapEvents(JSON.parse(readFileSync(path.join(MAP_DIR, "events.json"), "utf-8")));
  const gate = events[0].bounds;

  const opening = MAPS.map_01_starting_place.spawns.opening;
  const fromWorldMap = MAPS.map_01_starting_place.spawns.fromWorldMap;
  const fromField = MAPS.map_01_starting_place.spawns.fromField;
  assert.equal(isBlocked(opening.x, opening.y), false, "the opening spawn south of the campfire must be walkable");
  assert.equal(isBlocked(fromWorldMap.x, fromWorldMap.y), false, "the fromWorldMap spawn at the top of the stone steps must be walkable");
  assert.equal(isBlocked(fromField.x, fromField.y), false, "the legacy fromField spawn must be walkable");
  assert.equal(isBlocked(gate.x + gate.width / 2, gate.y + gate.height / 2), false, "the north exit zone must sit on the walkable trail");
  assert.equal(isBlocked(700, 1070), false, "the south trail (continues off-screen) must be walkable");

  assert.equal(isBlocked(725, 515), true, "the campfire stone ring must be blocked");
  assert.equal(isBlocked(745, 452), true, "the log beside the campfire must be blocked");
  assert.equal(isBlocked(646, 468), true, "the left stump must be blocked");
  assert.equal(isBlocked(250, 350), true, "the pond below the waterfall must be blocked");
  assert.equal(isBlocked(210, 220), true, "the waterfall must be blocked");
  assert.equal(isBlocked(50, 50), true, "the dense forest corner must stay blocked");
  assert.equal(isBlocked(1100, 800), true, "the pines / cliff on the lower right must stay blocked");
  assert.equal(isBlocked(1350, 300), true, "the valley beyond the cliff edge must stay blocked");
});

test("no walkable frame runs along the map border; only the two trail ends touch it", () => {
  const { manifest, isBlocked } = loadCollision();
  const openAtBorder = { left: 0, right: 0, top: [], bottom: [] };
  for (let y = 0; y < manifest.height; y += 1) {
    if (!isBlocked(0, y)) openAtBorder.left += 1;
    if (!isBlocked(manifest.width - 1, y)) openAtBorder.right += 1;
  }
  for (let x = 0; x < manifest.width; x += 1) {
    if (!isBlocked(x, 0)) openAtBorder.top.push(x);
    if (!isBlocked(x, manifest.height - 1)) openAtBorder.bottom.push(x);
  }
  assert.equal(openAtBorder.left, 0, "left border must be blocked");
  assert.equal(openAtBorder.right, 0, "right border must be blocked");
  assert.ok(openAtBorder.top.length > 0 && openAtBorder.top.every((x) => x >= 640 && x <= 760), "only the north trail may reach the top border");
  assert.ok(openAtBorder.bottom.length > 0 && openAtBorder.bottom.every((x) => x >= 620 && x <= 800), "only the south trail may reach the bottom border");
});

test("every walkable collision cell is reachable from the opening spawn, including the north exit (no isolated pockets)", () => {
  const { manifest, isBlocked } = loadCollision();
  const size = manifest.collisionCellSize;
  const columns = Math.ceil(manifest.width / size);
  const rows = Math.ceil(manifest.height / size);
  const open = (column, row) => {
    const x = column * size + Math.floor((Math.min(size, manifest.width - column * size) - 1) / 2);
    const y = row * size + Math.floor((Math.min(size, manifest.height - row * size) - 1) / 2);
    return !isBlocked(x, y);
  };

  const walkable = new Set();
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) if (open(column, row)) walkable.add(row * columns + column);

  const opening = MAPS.map_01_starting_place.spawns.opening;
  const start = Math.floor(opening.y / size) * columns + Math.floor(opening.x / size);
  assert.ok(walkable.has(start), "the opening spawn cell must be walkable");

  const reached = new Set([start]);
  const queue = [start];
  while (queue.length > 0) {
    const cell = queue.pop();
    const column = cell % columns;
    const row = Math.floor(cell / columns);
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = column + dc;
      const nr = row + dr;
      if (nc < 0 || nr < 0 || nc >= columns || nr >= rows) continue;
      const next = nr * columns + nc;
      if (walkable.has(next) && !reached.has(next)) {
        reached.add(next);
        queue.push(next);
      }
    }
  }
  assert.equal(reached.size, walkable.size, `${walkable.size - reached.size} walkable cells are unreachable from the opening spawn`);

  const events = readImageMapEvents(JSON.parse(readFileSync(path.join(MAP_DIR, "events.json"), "utf-8")));
  const gate = events[0].bounds;
  const gateCell = Math.floor((gate.y + gate.height / 2) / size) * columns + Math.floor((gate.x + gate.width / 2) / size);
  assert.ok(reached.has(gateCell), "the north exit zone must be reachable on foot from the opening spawn");
});

test("the fromWorldMap spawn's full Player body clears the north-trail event zone (no instant re-trigger)", () => {
  const events = readImageMapEvents(JSON.parse(readFileSync(path.join(MAP_DIR, "events.json"), "utf-8")));
  const gate = events.find((event) => event.id === "event_no01_north_gate");
  const spawn = MAPS.map_01_starting_place.spawns.fromWorldMap;
  const halfW = PLAYER.width / 2;
  const halfH = PLAYER.height / 2;
  const bodyOverlapsGate =
    spawn.x + halfW > gate.bounds.x && spawn.x - halfW < gate.bounds.x + gate.bounds.width &&
    spawn.y + halfH > gate.bounds.y && spawn.y - halfH < gate.bounds.y + gate.bounds.height;
  assert.equal(bodyOverlapsGate, false, "the spawned Player body must not overlap the north trail's world-map trigger zone");
});

// Minimal PNG reader (8-bit RGBA/RGB, non-interlaced), mirrors tests/bieVillage.test.mjs so this
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
