import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { MAPS } from "../src/config/maps.ts";
import { PLAYER } from "../src/config/player.ts";
import { buildCollisionRects } from "../src/systems/ImageMapCollisionData.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects } from "../src/systems/ImageMapData.ts";
import { readWorldMapDestinations, readWorldMapManifest, resolveWorldMapEntryDestination } from "../src/systems/WorldMapData.ts";
import { readPngAsMask } from "./helpers/bodyReachability.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_DIR = path.join(REPO_ROOT, "assets/maps/rainland_castle_town");
const REFERENCE_DIR = path.join(REPO_ROOT, "assets/maps/reference/reference");
const TOWN_REFERENCE = path.join(REFERENCE_DIR, "レインランドじょうかまち.png");
const SPLASH_REFERENCE = path.join(REFERENCE_DIR, "レインランドじょう_イメージ.png");
const MAP = MAPS.map_rainland_castle_town;

const readJson = (file) => JSON.parse(readFileSync(file, "utf-8"));
const manifest = () => readImageMapManifest(readJson(path.join(MAP_DIR, "map.json")));
const events = () => readImageMapEvents(readJson(path.join(MAP_DIR, "events.json")));
const pngSize = (file) => { const b = readFileSync(file); return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) }; };

function collision() {
  const m = manifest();
  const rects = buildCollisionRects(readPngAsMask(path.join(MAP_DIR, "collision.png")), m.collisionCellSize);
  return (x, y) => rects.some((r) => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height);
}

test("castle town: manifest points to the four map layers and runs at 150% like the other maps", () => {
  const m = manifest();
  assert.equal(m.id, "map_rainland_castle_town");
  assert.equal(m.name, "レインランドじょうかまち");
  assert.equal(m.coordinateSpace, "background-pixels");
  assert.equal(m.assetStatus, "CURRENT");
  assert.equal(m.worldScale, 1.5);
  assert.equal(m.collisionCellSize, 8);
  for (const file of [m.background, m.collision, m.events, m.objects]) assert.ok(existsSync(path.join(MAP_DIR, file)), `${file} must exist`);
  assert.deepEqual(readImageMapObjects(readJson(path.join(MAP_DIR, "objects.json"))), []);
});

test("castle town: background and entry splash are unmodified copies of the user-supplied images", () => {
  assert.ok(existsSync(TOWN_REFERENCE) && existsSync(SPLASH_REFERENCE), "the original reference images must still exist");
  assert.ok(readFileSync(TOWN_REFERENCE).equals(readFileSync(path.join(MAP_DIR, "background.png"))), "background.png must be byte-identical to レインランドじょうかまち.png");
  assert.ok(readFileSync(SPLASH_REFERENCE).equals(readFileSync(path.join(MAP_DIR, "entry_splash.png"))), "entry_splash.png must be byte-identical to レインランドじょう_イメージ.png");
});

test("castle town: background and collision have the same pixel dimensions as the manifest", () => {
  const m = manifest();
  assert.deepEqual(pngSize(path.join(MAP_DIR, "background.png")), { width: m.width, height: m.height });
  assert.deepEqual(pngSize(path.join(MAP_DIR, "collision.png")), { width: m.width, height: m.height });
});

test("castle town: registered in MAPS; the south gate returns to the world map and the spawn clears its zone", () => {
  assert.equal(MAP.sceneKey, "RainlandCastleTownScene");
  assert.equal(MAP.exits.length, 0);
  const [gate, ...others] = events();
  // the only other event is the north castle gate, which leads into No.05 レインランドじょう (see rainlandCastle.test.mjs)
  assert.deepEqual(others.map((event) => event.id), ["event_rainland_castle_town_castle_gate"]);
  assert.equal(gate.commands[0].type, "world-map");
  assert.equal(gate.commands[0].worldMapEntryId, "from_rainland_castle_town");
  const spawn = MAP.spawns.fromWorldMap;
  const overlaps = spawn.x + PLAYER.width / 2 > gate.bounds.x && spawn.x - PLAYER.width / 2 < gate.bounds.x + gate.bounds.width &&
    spawn.y + PLAYER.height / 2 > gate.bounds.y && spawn.y - PLAYER.height / 2 < gate.bounds.y + gate.bounds.height;
  assert.equal(overlaps, false, "the spawned Player body must not overlap the south gate zone (no instant re-trigger)");
});

test("castle town: the world map lists it as a point that lands at the south gate spawn", () => {
  const dir = path.join(REPO_ROOT, "assets/maps/world_map");
  const worldManifest = readWorldMapManifest(readJson(path.join(dir, "map.json")));
  const destinations = readWorldMapDestinations(readJson(path.join(dir, "destinations.json")), worldManifest);
  const entry = resolveWorldMapEntryDestination(worldManifest, destinations, "from_rainland_castle_town");
  assert.equal(entry.id, "destination_rainland_castle_town");
  assert.equal(entry.name, "レインランドじょうかまち");
  assert.equal(entry.targetMapId, "map_rainland_castle_town");
  assert.equal(entry.targetSpawnId, "fromWorldMap");
  assert.equal(entry.positionStatus, "DEV_PLACEHOLDER_POSITION");
  assert.ok(MAPS[entry.targetMapId].spawns[entry.targetSpawnId]);
});

test("castle town: roads, plaza, castle steps and bridge decks are walkable; houses, fountain, stalls, moat and pier are blocked", () => {
  const isBlocked = collision();
  for (const [name, x, y] of [
    ["spawn", MAP.spawns.fromWorldMap.x, MAP.spawns.fromWorldMap.y], ["south gate zone", 728, 1068], ["gate road", 728, 900], ["plaza west", 560, 420], ["plaza east", 880, 420],
    ["castle landing", 725, 160], ["castle steps", 730, 225], ["west road", 235, 500], ["east road", 1225, 500], ["east street", 1010, 620],
    ["west bridge deck", 140, 262], ["east bridge deck", 1305, 264], ["market alley", 400, 560], ["north cobble strip", 1100, 366],
  ]) assert.equal(isBlocked(x, y), false, `${name} (${x},${y}) must be walkable`);
  for (const [name, x, y] of [
    ["fountain", 725, 490], ["market stall", 335, 570], ["red house", 410, 255], ["blue house", 1050, 420], ["moat (west)", 160, 420], ["moat (east)", 1300, 420],
    ["wooden pier", 1140, 900], ["castle wall", 500, 100], ["castle door", 725, 100], ["south wall", 500, 940], ["outer forest", 40, 900],
  ]) assert.equal(isBlocked(x, y), true, `${name} (${x},${y}) must be blocked`);
});

test("castle town: only the south gate road touches the map border", () => {
  const isBlocked = collision();
  const m = manifest();
  const open = { top: [], bottom: [], left: [], right: [] };
  for (let x = 0; x < m.width; x += 1) {
    if (!isBlocked(x, 0)) open.top.push(x);
    if (!isBlocked(x, m.height - 1)) open.bottom.push(x);
  }
  for (let y = 0; y < m.height; y += 1) {
    if (!isBlocked(0, y)) open.left.push(y);
    if (!isBlocked(m.width - 1, y)) open.right.push(y);
  }
  assert.deepEqual([open.top.length, open.left.length, open.right.length], [0, 0, 0]);
  assert.ok(open.bottom.length > 0 && open.bottom.every((x) => x >= 650 && x <= 800), "only the south gate road may reach the bottom border");
});
