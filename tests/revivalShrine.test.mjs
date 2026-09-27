import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PLAYER } from "../src/config/player.ts";
import { MAPS } from "../src/config/maps.ts";
import { findEntrySplash, MAP_ENTRY_SPLASHES } from "../src/config/mapSplash.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects } from "../src/systems/ImageMapData.ts";
import { resolveWorldMapEntryDestination } from "../src/systems/WorldMapData.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_DIR = path.join(REPO_ROOT, "assets/maps/revival_shrine");
const REF_DIR = path.join(REPO_ROOT, "assets/maps/reference/reference/新しいフォルダー");
const readJson = (file) => JSON.parse(readFileSync(file, "utf-8"));
const readPngSize = (file) => {
  const buffer = readFileSync(file);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};

test("revival-shrine package: the top-down map is the background and the painting is the entry splash, both unmodified", () => {
  const manifest = readImageMapManifest(readJson(path.join(MAP_DIR, "map.json")));
  assert.equal(manifest.id, "map_revival_shrine");
  assert.equal(manifest.assetStatus, "CURRENT");
  for (const asset of [manifest.background, manifest.collision, manifest.events, manifest.objects]) {
    assert.ok(existsSync(path.join(MAP_DIR, asset)), `${asset} must exist beside map.json`);
  }
  // The user's file names are swapped relative to other maps: _イメージ is the pixel map, the plain name is the painting.
  assert.ok(readFileSync(path.join(MAP_DIR, "background.png")).equals(readFileSync(path.join(REF_DIR, "ふっかつのほこら_イメージ.png"))));
  assert.ok(readFileSync(path.join(MAP_DIR, "entry_splash.png")).equals(readFileSync(path.join(REF_DIR, "ふっかつのほこら.png"))));
  assert.deepEqual(readPngSize(path.join(MAP_DIR, "background.png")), { width: manifest.width, height: manifest.height });
  assert.deepEqual(readPngSize(path.join(MAP_DIR, "collision.png")), { width: manifest.width, height: manifest.height });
  assert.deepEqual(readImageMapObjects(readJson(path.join(MAP_DIR, "objects.json"))), []);
});

test("the world map's ふっかつのほこら point enters the shrine, and the south stairs return to that point", () => {
  const worldMap = readJson(path.join(REPO_ROOT, "assets/maps/world_map/map.json"));
  const destinations = readJson(path.join(REPO_ROOT, "assets/maps/world_map/destinations.json")).destinations;
  const point = destinations.find((destination) => destination.id === "destination_revival_shrine");
  assert.equal(point.implementationStatus, "implemented");
  assert.equal(point.targetMapId, "map_revival_shrine");
  assert.equal(MAPS[point.targetMapId].sceneKey, "RevivalShrineScene");
  assert.ok(MAPS[point.targetMapId].spawns[point.targetSpawnId]);

  const events = readImageMapEvents(readJson(path.join(MAP_DIR, "events.json")));
  const exit = events.find((event) => event.id === "event_revival_shrine_south_exit");
  assert.equal(exit.commands[0].type, "world-map");
  assert.equal(resolveWorldMapEntryDestination(worldMap, destinations, exit.commands[0].worldMapEntryId).id, "destination_revival_shrine");
  // The crown's acquisition is TBD: the altar only shows a DEV notice and never grants an item or sets a flag.
  const altar = events.find((event) => event.id === "event_revival_shrine_altar");
  assert.equal(altar.commands[0].type, "message");
});

test("entering ふっかつのほこら from the world map shows its 5-second painting first", () => {
  const splash = MAP_ENTRY_SPLASHES.map_revival_shrine;
  assert.equal(splash.caption, "ふっかつのほこら");
  assert.equal(splash.fadeInMs + splash.holdMs + splash.fadeOutMs, 5000);
  assert.equal(findEntrySplash("RevivalShrineScene", "fromWorldMap")?.mapId, "map_revival_shrine");
});

test("the fromWorldMap spawn's Player body clears the south exit zone (no instant re-trigger)", () => {
  const events = readImageMapEvents(readJson(path.join(MAP_DIR, "events.json")));
  const exit = events.find((event) => event.id === "event_revival_shrine_south_exit").bounds;
  const spawn = MAPS.map_revival_shrine.spawns.fromWorldMap;
  const overlaps =
    spawn.x + PLAYER.width / 2 > exit.x && spawn.x - PLAYER.width / 2 < exit.x + exit.width &&
    spawn.y + PLAYER.height / 2 > exit.y && spawn.y - PLAYER.height / 2 < exit.y + exit.height;
  assert.equal(overlaps, false);
});
