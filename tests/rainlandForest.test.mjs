import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { MAPS } from "../src/config/maps.ts";
import { PLAYER } from "../src/config/player.ts";
import { buildCollisionRects } from "../src/systems/ImageMapCollisionData.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects } from "../src/systems/ImageMapData.ts";
import { readWorldMapDestinations, readWorldMapManifest, resolveWorldMapEntryDestination } from "../src/systems/WorldMapData.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REFERENCE_DIR = path.join(REPO_ROOT, "assets/maps/reference/reference");

const FORESTS = {
  1: { mapId: "map_rainland_forest_1", dir: "rainland_forest_1", reference: "レインランドのもり　その１.png", sceneKey: "RainlandForest1Scene", defaultSpawn: "fromWorldMap" },
  2: { mapId: "map_rainland_forest_2", dir: "rainland_forest_2", reference: "レインランドのもり　その2.png", sceneKey: "RainlandForest2Scene", defaultSpawn: "fromForest1" },
};

const mapDir = (n) => path.join(REPO_ROOT, "assets/maps", FORESTS[n].dir);
const readJson = (file) => JSON.parse(readFileSync(file, "utf-8"));
const loadManifest = (n) => readImageMapManifest(readJson(path.join(mapDir(n), "map.json")));
const loadEvents = (n) => readImageMapEvents(readJson(path.join(mapDir(n), "events.json")));

function readPngSize(filePath) {
  const buffer = readFileSync(filePath);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function loadCollision(n) {
  const manifest = loadManifest(n);
  const rects = buildCollisionRects(readPngAsMask(path.join(mapDir(n), "collision.png")), manifest.collisionCellSize);
  const isBlocked = (x, y) => rects.some((rect) => x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height);
  return { manifest, isBlocked };
}

/** Walkable cells of the runtime grid (one centre sample per cell, exactly what buildCollisionRects uses). */
function walkableCells(n) {
  const { manifest, isBlocked } = loadCollision(n);
  const size = manifest.collisionCellSize;
  const columns = Math.ceil(manifest.width / size);
  const rows = Math.ceil(manifest.height / size);
  const cells = new Set();
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = column * size + Math.floor((Math.min(size, manifest.width - column * size) - 1) / 2);
      const y = row * size + Math.floor((Math.min(size, manifest.height - row * size) - 1) / 2);
      if (!isBlocked(x, y)) cells.add(row * columns + column);
    }
  }
  return { cells, columns, rows, size };
}

function reachableFrom(n, startX, startY) {
  const { cells, columns, rows, size } = walkableCells(n);
  const start = Math.floor(startY / size) * columns + Math.floor(startX / size);
  assert.ok(cells.has(start), "the start cell must be walkable");
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
      if (cells.has(next) && !reached.has(next)) {
        reached.add(next);
        queue.push(next);
      }
    }
  }
  return { reached, total: cells.size, columns, size };
}

const overlapsBody = (spawn, bounds) =>
  spawn.x + PLAYER.width / 2 > bounds.x && spawn.x - PLAYER.width / 2 < bounds.x + bounds.width &&
  spawn.y + PLAYER.height / 2 > bounds.y && spawn.y - PLAYER.height / 2 < bounds.y + bounds.height;

for (const n of [1, 2]) {
  const forest = FORESTS[n];

  test(`rainland forest ${n}: manifest points to the four required map layers`, () => {
    const manifest = loadManifest(n);
    assert.equal(manifest.coordinateSpace, "background-pixels");
    assert.equal(manifest.id, forest.mapId);
    assert.equal(manifest.assetStatus, "CURRENT");
    assert.equal(manifest.background, "background.png");
    assert.equal(manifest.collision, "collision.png");
    assert.equal(manifest.events, "events.json");
    assert.equal(manifest.objects, "objects.json");
    assert.deepEqual(readImageMapObjects(readJson(path.join(mapDir(n), "objects.json"))), []);
    for (const asset of [manifest.background, manifest.collision, manifest.events, manifest.objects]) {
      assert.ok(existsSync(path.join(mapDir(n), asset)), `${asset} must exist beside map.json`);
    }
  });

  test(`rainland forest ${n}: background is an unmodified copy of the user-supplied reference image`, () => {
    const referencePath = path.join(REFERENCE_DIR, forest.reference);
    assert.ok(existsSync(referencePath), "original reference image must still exist and not be deleted/overwritten");
    assert.ok(readFileSync(referencePath).equals(readFileSync(path.join(mapDir(n), "background.png"))), "background.png must be byte-identical to the reference (not redrawn)");
  });

  test(`rainland forest ${n}: background and collision share the same pixel dimensions as the manifest`, () => {
    const manifest = loadManifest(n);
    assert.deepEqual(readPngSize(path.join(mapDir(n), "background.png")), { width: manifest.width, height: manifest.height });
    assert.deepEqual(readPngSize(path.join(mapDir(n), "collision.png")), { width: manifest.width, height: manifest.height });
  });

  test(`rainland forest ${n}: is registered in MAPS with its own scene key and default spawn`, () => {
    assert.equal(MAPS[forest.mapId].id, forest.mapId);
    assert.equal(MAPS[forest.mapId].sceneKey, forest.sceneKey);
    assert.ok(MAPS[forest.mapId].spawns[forest.defaultSpawn]);
    assert.equal(MAPS[forest.mapId].exits.length, 0);
  });

  test(`rainland forest ${n}: every default spawn clears its own event zones (no instant re-trigger)`, () => {
    for (const [spawnId, spawn] of Object.entries(MAPS[forest.mapId].spawns)) {
      for (const event of loadEvents(n)) {
        assert.equal(overlapsBody(spawn, event.bounds), false, `spawn ${spawnId} overlaps ${event.id}`);
      }
    }
  });

  test(`rainland forest ${n}: spawns and event zones are walkable, and everything walkable is reachable from the default spawn`, () => {
    const { isBlocked } = loadCollision(n);
    for (const [spawnId, spawn] of Object.entries(MAPS[forest.mapId].spawns)) {
      assert.equal(isBlocked(spawn.x, spawn.y), false, `spawn ${spawnId} must be walkable`);
    }
    for (const event of loadEvents(n)) {
      assert.equal(isBlocked(event.bounds.x + event.bounds.width / 2, event.bounds.y + event.bounds.height / 2), false, `${event.id} must sit on the walkable trail`);
    }

    const defaultSpawn = MAPS[forest.mapId].spawns[forest.defaultSpawn];
    const { reached, total, columns, size } = reachableFrom(n, defaultSpawn.x, defaultSpawn.y);
    assert.equal(reached.size, total, `${total - reached.size} walkable cells are unreachable from the default spawn`);
    for (const event of loadEvents(n)) {
      const cell = Math.floor((event.bounds.y + event.bounds.height / 2) / size) * columns + Math.floor((event.bounds.x + event.bounds.width / 2) / size);
      assert.ok(reached.has(cell), `${event.id} must be reachable on foot`);
    }
  });
}

test("rainland forest 1: south gate returns to the world map, north stairs lead to forest 2 and forest 2's south exit leads back", () => {
  const events1 = loadEvents(1);
  const south = events1.find((event) => event.id === "event_rainland_forest_1_south_exit");
  assert.equal(south.commands[0].type, "world-map");
  assert.equal(south.commands[0].worldMapEntryId, "from_rainland_forest");

  const north = events1.find((event) => event.id === "event_rainland_forest_1_north_exit");
  assert.deepEqual(north.commands[0], { type: "transfer", targetMapId: "map_rainland_forest_2", targetSpawnId: "fromForest1" });
  assert.ok(MAPS.map_rainland_forest_2.spawns.fromForest1);

  const back = loadEvents(2).find((event) => event.id === "event_rainland_forest_2_south_exit");
  assert.deepEqual(back.commands[0], { type: "transfer", targetMapId: "map_rainland_forest_1", targetSpawnId: "fromForest2" });
  assert.ok(MAPS.map_rainland_forest_1.spawns.fromForest2);
});

test("rainland forest is a point on the world map that lands at forest 1's world-map spawn", () => {
  const worldDir = path.join(REPO_ROOT, "assets/maps/world_map");
  const manifest = readWorldMapManifest(readJson(path.join(worldDir, "map.json")));
  const destinations = readWorldMapDestinations(readJson(path.join(worldDir, "destinations.json")), manifest);
  const entry = resolveWorldMapEntryDestination(manifest, destinations, "from_rainland_forest");
  assert.equal(entry.id, "destination_rainland_forest");
  assert.equal(entry.targetMapId, "map_rainland_forest_1");
  assert.equal(entry.targetSpawnId, "fromWorldMap");
  assert.equal(entry.name, "レインランドのもり");
  assert.equal(entry.implementationStatus, "implemented");
  assert.equal(entry.positionStatus, "FINAL_POSITION");
  assert.ok(MAPS[entry.targetMapId].spawns[entry.targetSpawnId]);
});

test("rainland forest 1: the ruin altar, all three bridges and the east stairs are walkable; water, waterfall, cliffs and forest are blocked", () => {
  const { isBlocked } = loadCollision(1);
  for (const [name, x, y] of [
    ["ruin altar platform", 656, 165], ["ruin stone stairs", 656, 215],
    ["west bridge", 620, 458], ["east bridge", 935, 497], ["east wooden stairs", 1360, 580],
    ["north trail top", 1122, 10], ["south trail bottom", 395, 1080], ["west trail end", 130, 275], ["lake loop east side", 1080, 850],
  ]) assert.equal(isBlocked(x, y), false, `${name} (${x},${y}) must be walkable`);
  for (const [name, x, y] of [
    ["waterfall pool", 250, 150], ["lake", 850, 850], ["river", 1000, 580], ["cliff face", 180, 650], ["dense forest", 100, 900],
    ["ruin statue", 668, 110], ["campsite stump beyond the trail", 1245, 255],
  ]) assert.equal(isBlocked(x, y), true, `${name} (${x},${y}) must be blocked`);
});

test("rainland forest 2: both ruin altars, the stone stairs and the bridges are walkable; water and cliffs are blocked", () => {
  const { isBlocked } = loadCollision(2);
  for (const [name, x, y] of [
    ["ruin 1 altar platform", 150, 232], ["ruin 1 stone stairs", 245, 320], ["mid stone stairs", 447, 540],
    ["ruin 2 altar platform", 818, 752], ["ruin 2 arch passage", 826, 680], ["ruin 2 stairs", 825, 860], ["ruin 2 south trail", 700, 935],
    ["north bridge", 590, 378], ["east bridge", 1195, 745], ["north trail top", 765, 10], ["south trail bottom", 376, 1080],
    ["west trail end", 5, 688], ["east trail end", 1442, 535],
  ]) assert.equal(isBlocked(x, y), false, `${name} (${x},${y}) must be walkable`);
  for (const [name, x, y] of [
    ["pond", 950, 450], ["waterfall", 440, 60], ["stream", 620, 520], ["cliff face", 250, 500], ["dense forest", 60, 900], ["pier over the pond", 1195, 495],
  ]) assert.equal(isBlocked(x, y), true, `${name} (${x},${y}) must be blocked`);
});

test("rainland forests: only their trail ends touch the map border, with no walkable frame", () => {
  const limits = {
    // The runtime samples 16px cells, so an opening is cell-aligned and can be up to one cell wider than the trail.
    1: { top: [1075, 1170], bottom: [345, 445], left: null, right: null },
    2: { top: [725, 810], bottom: [325, 425], left: [640, 735], right: [490, 580] },
  };
  for (const n of [1, 2]) {
    const { manifest, isBlocked } = loadCollision(n);
    const open = { top: [], bottom: [], left: [], right: [] };
    for (let x = 0; x < manifest.width; x += 1) {
      if (!isBlocked(x, 0)) open.top.push(x);
      if (!isBlocked(x, manifest.height - 1)) open.bottom.push(x);
    }
    for (let y = 0; y < manifest.height; y += 1) {
      if (!isBlocked(0, y)) open.left.push(y);
      if (!isBlocked(manifest.width - 1, y)) open.right.push(y);
    }
    for (const side of ["top", "bottom", "left", "right"]) {
      const range = limits[n][side];
      if (!range) {
        assert.equal(open[side].length, 0, `forest ${n} ${side} border must be fully blocked`);
      } else {
        assert.ok(open[side].length > 0, `forest ${n} ${side} trail must reach the border`);
        assert.ok(open[side].every((v) => v >= range[0] && v <= range[1]), `forest ${n} ${side} border opens outside ${range}`);
      }
    }
  }
});

// Minimal PNG reader (8-bit RGBA/RGB, non-interlaced), mirrors tests/startingPlace.test.mjs so this
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
