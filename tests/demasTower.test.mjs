import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PLAYER } from "../src/config/player.ts";
import { MAPS } from "../src/config/maps.ts";
import { MAP_ENTRY_SPLASHES } from "../src/config/mapSplash.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects } from "../src/systems/ImageMapData.ts";
import { resolveWorldMapEntryDestination } from "../src/systems/WorldMapData.ts";
import { analyseBodyReachability } from "./helpers/bodyReachability.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REFERENCE_DIR = path.join(REPO_ROOT, "assets/maps/reference/reference/新しいフォルダー");
const readJson = (file) => JSON.parse(readFileSync(file, "utf-8"));
const readPngSize = (file) => {
  const buffer = readFileSync(file);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};
const eventsOf = (dir) => readImageMapEvents(readJson(path.join(REPO_ROOT, "assets/maps", dir, "events.json")));
const overlaps = (spawn, zone) =>
  spawn.x + PLAYER.width / 2 > zone.x && spawn.x - PLAYER.width / 2 < zone.x + zone.width &&
  spawn.y + PLAYER.height / 2 > zone.y && spawn.y - PLAYER.height / 2 < zone.y + zone.height;

for (const [dir, mapId, reference] of [
  ["demas_tower_1", "map_demas_tower_1", "デーマスのとう1階.png"],
  ["demas_tower_2", "map_demas_tower_2", "デーマスのとう2階.png"],
  ["demas_tower_3", "map_demas_tower_3", "デーマスのとう3階.png"],
]) {
  test(`${dir} package: CURRENT four-layer map and unmodified user background`, () => {
    const mapDir = path.join(REPO_ROOT, "assets/maps", dir);
    const manifest = readImageMapManifest(readJson(path.join(mapDir, "map.json")));
    assert.equal(manifest.id, mapId);
    assert.equal(manifest.assetStatus, "CURRENT");
    for (const asset of [manifest.background, manifest.collision, manifest.events, manifest.objects]) {
      assert.ok(existsSync(path.join(mapDir, asset)), `${asset} must exist beside map.json`);
    }
    assert.ok(readFileSync(path.join(mapDir, "background.png")).equals(readFileSync(path.join(REFERENCE_DIR, reference))));
    assert.deepEqual(readPngSize(path.join(mapDir, "background.png")), { width: manifest.width, height: manifest.height });
    assert.deepEqual(readPngSize(path.join(mapDir, "collision.png")), { width: manifest.width, height: manifest.height });
  });
}

test("the world map, three floors, and their named spawns form a complete tower route", () => {
  const exit = eventsOf("demas_tower_1").find((event) => event.id === "event_demas_tower_1_world_map_exit");
  assert.equal(exit.commands[0].type, "world-map");
  const worldMap = readJson(path.join(REPO_ROOT, "assets/maps/world_map/map.json"));
  const destinations = readJson(path.join(REPO_ROOT, "assets/maps/world_map/destinations.json")).destinations;
  const destination = resolveWorldMapEntryDestination(worldMap, destinations, exit.commands[0].worldMapEntryId);
  assert.deepEqual([destination.id, destination.implementationStatus, destination.targetMapId, destination.targetSpawnId], [
    "destination_demas_tower", "implemented", "map_demas_tower_1", "fromWorldMap",
  ]);

  const transfers = [
    ["demas_tower_1", "event_demas_tower_1_stairs_to_2f", "map_demas_tower_2", "fromTower1F"],
    ["demas_tower_2", "event_demas_tower_2_stairs_to_1f", "map_demas_tower_1", "fromTower2F"],
    ["demas_tower_2", "event_demas_tower_2_stairs_to_3f", "map_demas_tower_3", "fromTower2F"],
    ["demas_tower_3", "event_demas_tower_3_stairs_to_2f", "map_demas_tower_2", "fromTower3F"],
  ];
  for (const [dir, eventId, targetMapId, targetSpawnId] of transfers) {
    const command = eventsOf(dir).find((event) => event.id === eventId).commands[0];
    assert.deepEqual([command.targetMapId, command.targetSpawnId], [targetMapId, targetSpawnId]);
    assert.ok(MAPS[targetMapId].spawns[targetSpawnId]);
  }
});

test("no tower spawn's real Player body starts inside an event zone", () => {
  for (const [dir, mapId] of [["demas_tower_1", "map_demas_tower_1"], ["demas_tower_2", "map_demas_tower_2"], ["demas_tower_3", "map_demas_tower_3"]]) {
    for (const spawn of Object.values(MAPS[mapId].spawns)) {
      for (const event of eventsOf(dir)) assert.equal(overlaps(spawn, event.bounds), false, `${mapId} spawn overlaps ${event.id}`);
    }
  }
});

test("all stairs and the third-floor centre are reachable with the real player body", () => {
  const keySpots = {
    demas_tower_1: [[724, 1008, "world-map entrance"], [724, 700, "ritual hall"], [724, 128, "stairs to 2F"]],
    demas_tower_2: [[724, 1008, "stairs from 1F"], [724, 700, "middle gallery"], [724, 128, "stairs to 3F"]],
    demas_tower_3: [[724, 1008, "stairs from 2F"], [724, 700, "red carpet"], [724, 400, "Demas dais centre"]],
  };
  for (const [dir, mapId] of [["demas_tower_1", "map_demas_tower_1"], ["demas_tower_2", "map_demas_tower_2"], ["demas_tower_3", "map_demas_tower_3"]]) {
    const result = analyseBodyReachability(dir, mapId, { margin: 6 });
    assert.equal(result.startFits, true, `${dir} default spawn must fit the Player body`);
    for (const spawn of result.spawnResults) assert.equal(spawn.ok, true, `${dir} spawn ${spawn.id} is unreachable`);
    for (const event of result.eventResults) assert.equal(event.ok, true, `${dir} event ${event.id} is unreachable`);
    for (const [x, y, name] of keySpots[dir]) assert.equal(result.canReach(x, y), true, `${dir} ${name} is unreachable`);
  }
});

test("Demas is a third-floor centre boss using the existing Demas battle id and victory flag", () => {
  const objects = readImageMapObjects(readJson(path.join(REPO_ROOT, "assets/maps/demas_tower_3/objects.json")));
  const demas = objects.find((object) => object.id === "boss_demas_tower_demas");
  assert.deepEqual(demas, {
    id: "boss_demas_tower_demas",
    type: "boss",
    label: "デーマス",
    x: 650,
    y: 328,
    width: 148,
    height: 144,
    blocking: false,
    monsterId: "demas",
    victoryFlag: "boss.demas_defeated",
    unlockFlag: "story.demas_tower_cleared",
  });
});

test("world-map entry plays the supplied exterior art unchanged", () => {
  const splash = MAP_ENTRY_SPLASHES.map_demas_tower_1;
  assert.deepEqual(splash.spawnIds, ["fromWorldMap"]);
  assert.equal(splash.caption, "デーマスのとう");
  assert.ok(readFileSync(path.join(REPO_ROOT, "assets/maps/demas_tower_1/entry_splash.png"))
    .equals(readFileSync(path.join(REFERENCE_DIR, "デーマスのとう_イメージ.png"))));
});
