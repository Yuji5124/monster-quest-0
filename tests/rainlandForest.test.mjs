import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { bodyOffset } from "../src/config/characterWalkSprite.ts";
import { INTERACTION_REACH, INTERACTION_SPAN } from "../src/config/interaction.ts";
import { MAPS } from "../src/config/maps.ts";
import { PLAYER } from "../src/config/player.ts";
import { STORY_FLAGS } from "../src/config/storyFlags.ts";
import { VILLAGER_SPRITES } from "../src/config/villagerSprites.ts";
import { DIALOGUES, getDialogue } from "../src/data/dialogues.ts";
import { ITEM_DEFINITIONS } from "../src/data/items.ts";
import { isStoryFlagsDialogueEvent } from "../src/events/BattleEventData.ts";
import { canInteract } from "../src/systems/Interaction.ts";
import { buildCollisionRects } from "../src/systems/ImageMapCollisionData.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects } from "../src/systems/ImageMapData.ts";
import { readInterimUnlockedFlags, readWorldMapDestinations, readWorldMapManifest, resolveWorldMapDestinations, resolveWorldMapEntryDestination } from "../src/systems/WorldMapData.ts";
import { analyseBodyReachability } from "./helpers/bodyReachability.mjs";

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
    // 2026-09-27: その2だけ遺跡の宝箱を持つ。その1は引き続きObjectなし。
    assert.deepEqual(readImageMapObjects(readJson(path.join(mapDir(n), "objects.json"))).map((object) => object.id), n === 2 ? ["chest_rainland_forest_2_ruin"] : []);
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

test("rainland forest 2: the user-marked north, west, and east trail ends return to the world map", () => {
  const events = loadEvents(2);
  const expectedBounds = {
    event_rainland_forest_2_north_exit: { x: 720, y: 0, width: 96, height: 32 },
    event_rainland_forest_2_west_exit: { x: 0, y: 640, width: 32, height: 96 },
    event_rainland_forest_2_east_exit: { x: 1416, y: 488, width: 32, height: 96 },
  };
  for (const [id, bounds] of Object.entries(expectedBounds)) {
    const event = events.find((candidate) => candidate.id === id);
    assert.deepEqual(event?.bounds, bounds, `${id} covers its trail end`);
    assert.deepEqual(event?.commands, [{ type: "world-map", worldMapEntryId: "from_rainland_forest" }]);
  }
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

// 2026-10-01 ユーザー指示: 注釈画像(レインランドのもり その2)の青丸 = かいふくやくの宝箱。
// 注釈画像をbackground.pngへ重ねて位置合わせし、印の中心を測ったネイティブ背景ピクセル。
const ORANGE_MARKER = { x: 651, y: 298.7 };
const BLUE_MARKER = { x: 133.5, y: 195.1 };
const WOODCUTTER = "npc_rainland_forest_woodcutter";
const CHEST_ID = "chest_rainland_forest_2_ruin";

const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const centerOf = (rect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
const blockedRects = (n) => buildCollisionRects(readPngAsMask(path.join(mapDir(n), "collision.png")), loadManifest(n).collisionCellSize);
const forest2Chest = () => readImageMapObjects(readJson(path.join(mapDir(2), "objects.json"))).find((object) => object.id === CHEST_ID);

/** 木こりの足元Body(ネイティブ背景ピクセル)。Npc.tsと同じくスプライト中心+bodyOffsetから求める。 */
function woodcutterBodyNative() {
  const npc = MAPS.map_rainland_forest_2.npcs.find((candidate) => candidate.id === WOODCUTTER);
  const scale = loadManifest(2).worldScale;
  const sprite = VILLAGER_SPRITES[npc.spriteId];
  const offset = bodyOffset(sprite, PLAYER.width, PLAYER.height);
  return {
    x: (npc.position.x * scale - sprite.frameWidth / 2 + offset.x) / scale,
    y: (npc.position.y * scale - sprite.frameHeight / 2 + offset.y) / scale,
    width: PLAYER.width / scale,
    height: PLAYER.height / scale,
  };
}

test("rainland forest 2: the woodcutter stands still on the orange marker, on free ground; forest 1 has no NPC", () => {
  assert.deepEqual(MAPS.map_rainland_forest_1.npcs, []);
  const npcs = MAPS.map_rainland_forest_2.npcs;
  assert.deepEqual(npcs.map((npc) => npc.id), [WOODCUTTER]);
  const [woodcutter] = npcs;
  assert.equal(woodcutter.mapId, "map_rainland_forest_2");
  assert.equal(woodcutter.role, "story");
  assert.equal(woodcutter.movement, undefined, "he stands still so the player can always find him");
  assert.ok(VILLAGER_SPRITES[woodcutter.spriteId], "he uses a user-supplied villager sheet");
  assert.ok(DIALOGUES[woodcutter.dialogueId], "his dialogue exists");

  const body = woodcutterBodyNative();
  const center = centerOf(body);
  assert.ok(Math.hypot(center.x - ORANGE_MARKER.x, center.y - ORANGE_MARKER.y) <= 3, `his feet sit on the orange marker (got ${center.x.toFixed(1)},${center.y.toFixed(1)})`);
  assert.equal(blockedRects(2).some((rect) => overlaps(body, rect)), false, "his foot body is on walkable ground");
});

test("rainland forest 2: the woodcutter's first talk unlocks Rainland castle town on the world map, later talks only repeat", () => {
  const party = { hasMember: () => false };
  const base = DIALOGUES[WOODCUTTER];
  const first = getDialogue(WOODCUTTER, party, { hasFlag: () => false });
  assert.ok(first);
  assert.equal(isStoryFlagsDialogueEvent(first.afterDialogue), true);
  assert.deepEqual(first.afterDialogue.flags, [STORY_FLAGS.rainlandCastleTownUnlocked]);
  assert.equal(STORY_FLAGS.rainlandCastleTownUnlocked, "story.rainland_castle_town_unlocked", "the world map's own castle-town flag, not a synonym");
  assert.equal(first.pages.length, base.pages.length + 1, "the first talk only adds one closing notice page");
  assert.deepEqual(first.pages.slice(0, base.pages.length), base.pages);
  assert.match(first.pages.at(-1), /レインランドじょうへ　いけるように/);
  for (const page of first.pages) {
    assert.ok(page.split("\n").length <= 3, "each page fits the dialogue box");
    assert.doesNotMatch(page, /ジャンカード|あいことば|かいぶんしょ|ミレイ/, "no story secrets in an early NPC's talk");
  }
  const repeat = getDialogue(WOODCUTTER, party, { hasFlag: (flag) => flag === STORY_FLAGS.rainlandCastleTownUnlocked });
  assert.equal(repeat.afterDialogue, undefined);
  assert.deepEqual(repeat.pages, base.pages);

  const worldDir = path.join(REPO_ROOT, "assets/maps/world_map");
  const manifest = readWorldMapManifest(readJson(path.join(worldDir, "map.json")));
  const destinations = readWorldMapDestinations(readJson(path.join(worldDir, "destinations.json")), manifest);
  const castleTown = (flags) => resolveWorldMapDestinations(destinations, new Set([...readInterimUnlockedFlags(manifest), ...flags]))
    .find((destination) => destination.id === "destination_rainland_castle_town");
  assert.equal(castleTown([]).unlocked, false);
  assert.equal(castleTown([STORY_FLAGS.rainlandForestUnlocked]).unlocked, false, "reaching the forest alone does not open the castle town");
  assert.equal(castleTown([STORY_FLAGS.rainlandCastleTownUnlocked]).unlocked, true);
  assert.equal(castleTown([STORY_FLAGS.rainlandCastleTownUnlocked]).displayName, "レインランドじょうかまち");
});

test("rainland forest 2: the ruin chest sits on the blue marker and can be opened from the stone floor right below it", () => {
  const chest = forest2Chest();
  assert.equal(chest.type, "chest");
  assert.equal(chest.blocking, true);
  assert.ok(Object.hasOwn(ITEM_DEFINITIONS, chest.itemId), `${chest.itemId} is a real item`);
  assert.match(chest.openedFlag, /^chest\./, "chest flags live under chest.*(SAVE_FLAG_SPEC.md)");
  const center = centerOf(chest);
  assert.ok(Math.hypot(center.x - BLUE_MARKER.x, center.y - BLUE_MARKER.y) <= 3, `the chest is centred on the blue marker (got ${center.x},${center.y})`);

  const scale = loadManifest(2).worldScale;
  const standing = { x: center.x - PLAYER.width / scale / 2, y: chest.y + chest.height, width: PLAYER.width / scale, height: PLAYER.height / scale };
  assert.equal(blockedRects(2).some((rect) => overlaps(standing, rect)), false, "the player can stand flush below the chest");
  const player = centerOf(standing);
  const target = { x: chest.x * scale, y: chest.y * scale, width: chest.width * scale, height: chest.height * scale };
  assert.equal(canInteract({ x: player.x * scale, y: player.y * scale }, "up", target, INTERACTION_REACH, INTERACTION_SPAN), true, "facing up from there reaches the chest");
});

test("rainland forest 2: with the woodcutter and the chest in place the player body still reaches every spawn, exit and key spot", () => {
  const result = analyseBodyReachability("rainland_forest_2", "map_rainland_forest_2", { margin: 6, blockers: [woodcutterBodyNative(), forest2Chest()] });
  assert.equal(result.startFits, true);
  for (const spawn of result.spawnResults) assert.equal(spawn.ok, true, `spawn ${spawn.id} stays reachable`);
  for (const event of result.eventResults) assert.equal(event.ok, true, `${event.id} stays reachable`);
  for (const [x, y, name] of [
    [651, 335, "just south of the woodcutter"], [766, 22, "north trail end, past the woodcutter"], [1100, 290, "pond-side branch"],
    [150, 232, "ruin 1 altar"], [134, 232, "in front of the chest"],
  ]) assert.equal(result.canReach(x, y), true, `${name} (${x},${y}) stays reachable`);
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
