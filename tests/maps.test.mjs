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

  const toWorldMap02 = MAPS.map_02_starting_town.exits.find((e) => e.id === "toWorldMap");
  assert.equal(toWorldMap02.kind, "world-map");
  assert.equal(resolveWorldMapEntryDestination(worldMapManifest, worldMapDestinations, toWorldMap02.worldMapEntryId).id, "destination_starting_town");

  for (const destination of worldMapDestinations) {
    const target = MAPS[destination.targetMapId];
    assert.ok(target.spawns[destination.targetSpawnId]);
  }
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
