import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { MAPS } from "../src/config/maps.ts";
import { readImageMapEvents } from "../src/systems/ImageMapData.ts";
import { readWorldMapDestinations, readWorldMapManifest, resolveWorldMapEntryDestination } from "../src/systems/WorldMapData.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORLD_MAP_DIR = path.join(REPO_ROOT, "assets/maps/world_map");
const worldMapManifest = readWorldMapManifest(JSON.parse(readFileSync(path.join(WORLD_MAP_DIR, "map.json"), "utf-8")));
const worldMapDestinations = readWorldMapDestinations(JSON.parse(readFileSync(path.join(WORLD_MAP_DIR, "destinations.json"), "utf-8")), worldMapManifest);
const startingPlaceEvents = readImageMapEvents(JSON.parse(readFileSync(path.join(REPO_ROOT, "assets/maps/starting_place/events.json"), "utf-8")));
const startingTownEvents = readImageMapEvents(JSON.parse(readFileSync(path.join(REPO_ROOT, "assets/maps/starting_town/events.json"), "utf-8")));
const startingForestEvents = readImageMapEvents(JSON.parse(readFileSync(path.join(REPO_ROOT, "assets/maps/starting_forest/events.json"), "utf-8")));
const bieVillageEvents = readImageMapEvents(JSON.parse(readFileSync(path.join(REPO_ROOT, "assets/maps/bie_village/events.json"), "utf-8")));

test("every map has a scene key and at least the spawns its exits reference", () => {
  for (const map of Object.values(MAPS)) {
    assert.equal(typeof map.sceneKey, "string");
    assert.ok(map.sceneKey.length > 0);
  }
});

test("every exit resolves to either a local-map spawn or a world-map entry in shipped data", () => {
  for (const map of Object.values(MAPS)) {
    for (const exit of map.exits) {
      if (exit.kind === "world-map") {
        assert.ok(resolveWorldMapEntryDestination(worldMapManifest, worldMapDestinations, exit.worldMapEntryId));
        continue;
      }
      const target = MAPS[exit.targetMapId];
      assert.ok(target, `unknown targetMapId: ${exit.targetMapId}`);
      assert.ok(
        target.spawns[exit.targetSpawnId],
        `unknown targetSpawnId "${exit.targetSpawnId}" on ${exit.targetMapId}`
      );
    }
  }
});

test("exit bounds are non-empty rectangles", () => {
  for (const map of Object.values(MAPS)) {
    for (const exit of map.exits) {
      assert.ok(exit.bounds.width > 0);
      assert.ok(exit.bounds.height > 0);
    }
  }
});

test("No.01 and No.02 use the point-selection WorldMapScene as the active round-trip route", () => {
  const no01NorthGate = startingPlaceEvents.find((event) => event.id === "event_no01_north_gate");
  assert.equal(no01NorthGate.commands[0].type, "world-map");
  assert.equal(resolveWorldMapEntryDestination(worldMapManifest, worldMapDestinations, no01NorthGate.commands[0].worldMapEntryId).id, "destination_starting_place");

  const westExit02 = startingTownEvents.find((event) => event.id === "event_starting_town_west_exit");
  assert.equal(westExit02.commands[0].type, "world-map");
  assert.equal(resolveWorldMapEntryDestination(worldMapManifest, worldMapDestinations, westExit02.commands[0].worldMapEntryId).id, "destination_starting_town");

  for (const destination of worldMapDestinations) {
    const target = MAPS[destination.targetMapId];
    assert.ok(target.spawns[destination.targetSpawnId]);
  }
});

test("はじまりのまち (map_02_starting_town) is an image-map package with no direct maps.ts exits", () => {
  assert.equal(MAPS.map_02_starting_town.exits.length, 0);
  assert.equal(MAPS.map_02_starting_town.sceneKey, "StartingTownScene");
});

test("はじまりのもり (map_starting_forest) round-trips through the point-selection WorldMapScene", () => {
  const northExit = startingForestEvents.find((event) => event.id === "event_starting_forest_north_exit");
  assert.equal(northExit.commands[0].type, "world-map");
  assert.equal(resolveWorldMapEntryDestination(worldMapManifest, worldMapDestinations, northExit.commands[0].worldMapEntryId).id, "destination_starting_forest");

  const forestDestination = worldMapDestinations.find((destination) => destination.id === "destination_starting_forest");
  assert.ok(forestDestination, "destination_starting_forest must be defined");
  const target = MAPS[forestDestination.targetMapId];
  assert.equal(target.sceneKey, "StartingForestScene");
  assert.ok(target.spawns[forestDestination.targetSpawnId]);

  // 正式No.01〜No.20の番号は持たない追加フィールドであり、既存の番号付きmapIdと衝突しない。
  assert.equal(MAPS.map_starting_forest.id, "map_starting_forest");
  assert.equal(MAPS.map_starting_forest.exits.length, 0);
});

test("ビーエのむら (map_03_bie_village) round-trips through the point-selection WorldMapScene", () => {
  const northExit = bieVillageEvents.find((event) => event.id === "event_bie_village_north_exit");
  assert.equal(northExit.commands[0].type, "world-map");
  assert.equal(resolveWorldMapEntryDestination(worldMapManifest, worldMapDestinations, northExit.commands[0].worldMapEntryId).id, "destination_bie_village");

  const bieDestination = worldMapDestinations.find((destination) => destination.id === "destination_bie_village");
  assert.ok(bieDestination, "destination_bie_village must be defined");
  assert.equal(bieDestination.unlockFlag, "story.bie_village_unlocked");
  const target = MAPS[bieDestination.targetMapId];
  assert.equal(target.sceneKey, "BieVillageScene");
  assert.ok(target.spawns[bieDestination.targetSpawnId]);

  assert.equal(MAPS.map_03_bie_village.id, "map_03_bie_village");
  assert.equal(MAPS.map_03_bie_village.exits.length, 0);
});

test("legacy FieldScene still resolves its own direct No.01 <-> No.02 prototype route", () => {

  const toStartingPlace = MAPS.field_starting_region.exits.find((e) => e.id === "toStartingPlace");
  assert.equal(toStartingPlace.kind, "local-map");
  assert.equal(toStartingPlace.targetMapId, "map_01_starting_place");
  assert.ok(MAPS.map_01_starting_place.spawns[toStartingPlace.targetSpawnId]);

  const toStartingTown = MAPS.field_starting_region.exits.find((e) => e.id === "toStartingTown");
  assert.equal(toStartingTown.kind, "local-map");
  assert.equal(toStartingTown.targetMapId, "map_02_starting_town");
  assert.ok(MAPS.map_02_starting_town.spawns[toStartingTown.targetSpawnId]);

});

test("Phase 8.5 CURRENT: No.01 and No.02 have no direct connection (SUPERSEDED)", () => {
  const from01 = MAPS.map_01_starting_place.exits.some((e) => e.kind === "local-map" && e.targetMapId === "map_02_starting_town");
  const from02 = MAPS.map_02_starting_town.exits.some((e) => e.kind === "local-map" && e.targetMapId === "map_01_starting_place");
  assert.equal(from01, false);
  assert.equal(from02, false);
});

test("looking up an unknown spawn id is undefined (safe fallback signal for Scenes)", () => {
  assert.equal(MAPS.map_01_starting_place.spawns["doesNotExist"], undefined);
  assert.equal(MAPS.map_02_starting_town.spawns["doesNotExist"], undefined);
});
