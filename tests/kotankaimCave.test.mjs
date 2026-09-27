import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PLAYER } from "../src/config/player.ts";
import { MAPS } from "../src/config/maps.ts";
import { MAP_ENTRY_SPLASHES } from "../src/config/mapSplash.ts";
import { readDevMapTest } from "../src/config/devMapTest.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects } from "../src/systems/ImageMapData.ts";
import { resolveWorldMapEntryDestination } from "../src/systems/WorldMapData.ts";
import { analyseBodyReachability } from "./helpers/bodyReachability.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REFERENCE_DIR = path.join(REPO_ROOT, "assets/maps/reference/reference");
const FLOORS = [
  ["kotankaim_cave_1", "map_kotankaim_cave_1", "コタンカイムのどうくつ1.png"],
  ["kotankaim_cave_2", "map_kotankaim_cave_2", "コタンカイムのどうくつ2.png"],
  ["kotankaim_cave_3", "map_kotankaim_cave_3", "コタンカイムのどうくつ3.png"],
];
const readJson = (file) => JSON.parse(readFileSync(file, "utf-8"));
const readPngSize = (file) => {
  const buffer = readFileSync(file);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};
const eventsOf = (dir) => readImageMapEvents(readJson(path.join(REPO_ROOT, "assets/maps", dir, "events.json")));
const overlaps = (spawn, zone) =>
  spawn.x + PLAYER.width / 2 > zone.x && spawn.x - PLAYER.width / 2 < zone.x + zone.width &&
  spawn.y + PLAYER.height / 2 > zone.y && spawn.y - PLAYER.height / 2 < zone.y + zone.height;

for (const [dir, mapId, reference] of FLOORS) {
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
    assert.deepEqual(readImageMapObjects(readJson(path.join(mapDir, "objects.json"))), []);
  });
}

test("the world map and the three floors form a 1 -> 2 -> 3 route that can be walked back", () => {
  const exit = eventsOf("kotankaim_cave_1").find((event) => event.id === "event_kotankaim_cave_1_world_map_exit");
  assert.equal(exit.commands[0].type, "world-map");
  const worldMap = readJson(path.join(REPO_ROOT, "assets/maps/world_map/map.json"));
  const destinations = readJson(path.join(REPO_ROOT, "assets/maps/world_map/destinations.json")).destinations;
  const destination = resolveWorldMapEntryDestination(worldMap, destinations, exit.commands[0].worldMapEntryId);
  assert.deepEqual([destination.id, destination.implementationStatus, destination.targetMapId, destination.targetSpawnId], [
    "destination_kotankaim_cave", "implemented", "map_kotankaim_cave_1", "fromWorldMap",
  ]);

  const transfers = [
    ["kotankaim_cave_1", "event_kotankaim_cave_1_door_to_2", "map_kotankaim_cave_2", "fromCave1"],
    ["kotankaim_cave_2", "event_kotankaim_cave_2_stairs_to_1", "map_kotankaim_cave_1", "fromCave2"],
    ["kotankaim_cave_2", "event_kotankaim_cave_2_door_to_3", "map_kotankaim_cave_3", "fromCave2"],
    ["kotankaim_cave_3", "event_kotankaim_cave_3_stairs_to_2", "map_kotankaim_cave_2", "fromCave3"],
  ];
  for (const [dir, eventId, targetMapId, targetSpawnId] of transfers) {
    const command = eventsOf(dir).find((event) => event.id === eventId).commands[0];
    assert.deepEqual([command.type, command.targetMapId, command.targetSpawnId], ["transfer", targetMapId, targetSpawnId]);
    assert.ok(MAPS[targetMapId].spawns[targetSpawnId], `${targetMapId}.${targetSpawnId} must exist`);
  }
});

test("no cave spawn's real Player body starts inside an event zone", () => {
  for (const [dir, mapId] of FLOORS) {
    for (const [spawnId, spawn] of Object.entries(MAPS[mapId].spawns)) {
      for (const event of eventsOf(dir)) assert.equal(overlaps(spawn, event.bounds), false, `${mapId}.${spawnId} overlaps ${event.id}`);
    }
  }
});

test("every spawn, door, stairs and the sigil is reachable with the real player body", () => {
  const keySpots = {
    kotankaim_cave_1: [[760, 1000, "south entrance"], [180, 450, "west stone stairs"], [512, 350, "wooden ladder bridge"], [1050, 504, "east wooden bridge"], [1200, 90, "door to (2)"]],
    kotankaim_cave_2: [[728, 1000, "south stairs"], [728, 600, "centre path"], [510, 256, "north bridge"], [192, 70, "door to (3)"]],
    kotankaim_cave_3: [[728, 1000, "south stairs"], [728, 660, "stairs to the central plaza"], [728, 380, "stairs to the middle ledge"], [724, 132, "sigil"]],
  };
  for (const [dir, mapId] of FLOORS) {
    const result = analyseBodyReachability(dir, mapId, { margin: 4 });
    assert.equal(result.startFits, true, `${dir} default spawn must fit the Player body`);
    for (const spawn of result.spawnResults) assert.equal(spawn.ok, true, `${dir} spawn ${spawn.id} is unreachable`);
    for (const event of result.eventResults) assert.equal(event.ok, true, `${dir} event ${event.id} is unreachable`);
    for (const [x, y, name] of keySpots[dir]) assert.equal(result.canReach(x, y), true, `${dir} ${name} is unreachable`);
  }
});

test("floor (1) cannot skip the west stairs: the south plaza is walled off from the east side by the drawn cliff", () => {
  const result = analyseBodyReachability("kotankaim_cave_1", "map_kotankaim_cave_1", {
    margin: 4,
    blockers: [{ x: 160, y: 424, width: 40, height: 64 }],
  });
  assert.equal(result.canReach(1200, 90), false);
});

test("the sigil only shows the shield placeholder: acquisition is TBD and no item flag is written", () => {
  const sigil = eventsOf("kotankaim_cave_3").find((event) => event.id === "event_kotankaim_cave_3_sigil");
  assert.equal(sigil.commands.length, 1);
  assert.equal(sigil.commands[0].type, "message");
  assert.match(sigil.commands[0].text, /^\[DEV\] ゆうしゃのたて/);
});

test("world-map entry plays the supplied cave artwork unchanged, and the DEV map test is registered", () => {
  const splash = MAP_ENTRY_SPLASHES.map_kotankaim_cave_1;
  assert.deepEqual(splash.spawnIds, ["fromWorldMap"]);
  assert.equal(splash.caption, "コタンカイムの洞窟");
  assert.ok(readFileSync(path.join(REPO_ROOT, "assets/maps/kotankaim_cave_1/entry_splash.png"))
    .equals(readFileSync(path.join(REFERENCE_DIR, "コタンカイムのどうくつ_イメージ.png"))));
  assert.equal(readDevMapTest("?mapTest=kotankaim-cave"), "kotankaim-cave");
});
