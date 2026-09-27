import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PLAYER } from "../src/config/player.ts";
import { MAPS } from "../src/config/maps.ts";
import { findEntrySplash, MAP_ENTRY_SPLASHES } from "../src/config/mapSplash.ts";
import { readDevMapTest } from "../src/config/devMapTest.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects } from "../src/systems/ImageMapData.ts";
import { resolveWorldMapEntryDestination } from "../src/systems/WorldMapData.ts";
import { analyseBodyReachability } from "./helpers/bodyReachability.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_DIR = path.join(REPO_ROOT, "assets/maps/posaro_castle");
const REFERENCE_DIR = path.join(REPO_ROOT, "assets/maps/reference/reference/新しいフォルダー");
const readJson = (file) => JSON.parse(readFileSync(file, "utf-8"));
const readPngSize = (file) => {
  const buffer = readFileSync(file);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};

test("posaro-castle package: CURRENT four-layer map preserves both supplied source images", () => {
  const manifest = readImageMapManifest(readJson(path.join(MAP_DIR, "map.json")));
  assert.equal(manifest.id, "map_posaro_castle");
  assert.equal(manifest.assetStatus, "CURRENT");
  for (const asset of [manifest.background, manifest.collision, manifest.events, manifest.objects]) {
    assert.ok(existsSync(path.join(MAP_DIR, asset)), `${asset} must exist beside map.json`);
  }
  assert.ok(readFileSync(path.join(MAP_DIR, "background.png")).equals(readFileSync(path.join(REFERENCE_DIR, "ポサロじょうボス.png"))));
  assert.ok(readFileSync(path.join(MAP_DIR, "entry_splash.png")).equals(readFileSync(path.join(REFERENCE_DIR, "ポサロじょう_イメージ.png"))));
  assert.deepEqual(readPngSize(path.join(MAP_DIR, "background.png")), { width: manifest.width, height: manifest.height });
  assert.deepEqual(readPngSize(path.join(MAP_DIR, "collision.png")), { width: manifest.width, height: manifest.height });
  assert.deepEqual(readImageMapObjects(readJson(path.join(MAP_DIR, "objects.json"))), []);
});

test("the world map enters ポサロ城 and the south stairs return to the same point", () => {
  const worldMap = readJson(path.join(REPO_ROOT, "assets/maps/world_map/map.json"));
  const destinations = readJson(path.join(REPO_ROOT, "assets/maps/world_map/destinations.json")).destinations;
  const point = destinations.find((destination) => destination.id === "destination_posaro_castle");
  assert.deepEqual([point.implementationStatus, point.targetMapId, point.targetSpawnId], ["implemented", "map_posaro_castle", "fromWorldMap"]);
  assert.equal(MAPS[point.targetMapId].sceneKey, "PosaroCastleScene");
  assert.ok(MAPS[point.targetMapId].spawns[point.targetSpawnId]);

  const events = readImageMapEvents(readJson(path.join(MAP_DIR, "events.json")));
  const exit = events.find((event) => event.id === "event_posaro_castle_south_exit");
  assert.equal(exit.commands[0].type, "world-map");
  assert.equal(resolveWorldMapEntryDestination(worldMap, destinations, exit.commands[0].worldMapEntryId).id, "destination_posaro_castle");
});

test("the south entry is walkable, never auto-exits, and has a registered DEV route", () => {
  const events = readImageMapEvents(readJson(path.join(MAP_DIR, "events.json")));
  const exit = events.find((event) => event.id === "event_posaro_castle_south_exit").bounds;
  const spawn = MAPS.map_posaro_castle.spawns.fromWorldMap;
  const overlaps =
    spawn.x + PLAYER.width / 2 > exit.x && spawn.x - PLAYER.width / 2 < exit.x + exit.width &&
    spawn.y + PLAYER.height / 2 > exit.y && spawn.y - PLAYER.height / 2 < exit.y + exit.height;
  assert.equal(overlaps, false);
  const result = analyseBodyReachability("posaro_castle", "map_posaro_castle", { margin: 6 });
  assert.equal(result.startFits, true);
  assert.equal(result.eventResults[0].ok, true, "the south exit must be reachable from the entry stairs");
  assert.equal(result.canReach(724, 176), true, "the upper dais must be reachable from the entry stairs");
  assert.equal(readDevMapTest("?mapTest=posaro-castle"), "posaro-castle");
});

test("world-map entry plays the supplied exterior image for five seconds", () => {
  const splash = MAP_ENTRY_SPLASHES.map_posaro_castle;
  assert.equal(splash.caption, "ポサロ城");
  assert.equal(splash.fadeInMs + splash.holdMs + splash.fadeOutMs, 5000);
  assert.equal(findEntrySplash("PosaroCastleScene", "fromWorldMap")?.mapId, "map_posaro_castle");
});
