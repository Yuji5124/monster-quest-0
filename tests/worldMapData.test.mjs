import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { MAPS } from "../src/config/maps.ts";
import {
  readWorldMapDestinations,
  readWorldMapManifest,
  resolveWorldMapDestinations,
  resolveWorldMapEntryDestination,
} from "../src/systems/WorldMapData.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_DIRECTORY = path.join(REPO_ROOT, "assets/maps/world_map");

test("world-map manifest uses an original high-resolution background and destinations file", () => {
  const manifest = readWorldMapManifest(JSON.parse(readFileSync(path.join(MAP_DIRECTORY, "map.json"), "utf-8")));
  assert.equal(manifest.type, "point-selection-world-map");
  assert.equal(manifest.coordinateSpace, "background-pixels");
  assert.equal(manifest.assetStatus, "CURRENT");
  assert.equal(manifest.width / manifest.height, 4 / 3);
  assert.ok(manifest.width >= 1440);
  assert.ok(existsSync(path.join(MAP_DIRECTORY, manifest.background)));
  assert.ok(existsSync(path.join(MAP_DIRECTORY, manifest.destinations)));
});

test("world-map destinations declare visibility and flag-based unlock conditions", () => {
  const manifest = readWorldMapManifest(JSON.parse(readFileSync(path.join(MAP_DIRECTORY, "map.json"), "utf-8")));
  const definitions = readWorldMapDestinations(JSON.parse(readFileSync(path.join(MAP_DIRECTORY, "destinations.json"), "utf-8")), manifest);
  assert.equal(definitions.length, 2);
  assert.equal(definitions[0].unlockFlag, null);
  assert.equal(definitions[1].unlockFlag, null);
  assert.deepEqual(manifest.developmentUnlockedFlags, []);
  assert.equal(manifest.entryDestinationIds.from_starting_place, "destination_starting_place");
  assert.equal(manifest.entryDestinationIds.from_starting_town, "destination_starting_town");

  const defaultView = resolveWorldMapDestinations(definitions, new Set(manifest.developmentUnlockedFlags));
  assert.deepEqual(defaultView.map((destination) => destination.unlocked), [true, true]);
  assert.deepEqual(defaultView.map((destination) => destination.displayName), ["はじまりのばしょ", "はじまりのまち"]);

  const lockedFixture = [{ ...definitions[1], unlockFlag: "world.starting_town_unlocked" }];
  const noProgressView = resolveWorldMapDestinations(lockedFixture, new Set());
  assert.equal(noProgressView[0].unlocked, false);
  assert.equal(noProgressView[0].displayName, "？？？");
  assert.equal(resolveWorldMapDestinations([{ ...definitions[1], visible: false }], new Set()).length, 0);
});

test("currently unlockable world-map destinations resolve to registered local scenes and spawns", () => {
  const manifest = readWorldMapManifest(JSON.parse(readFileSync(path.join(MAP_DIRECTORY, "map.json"), "utf-8")));
  const definitions = readWorldMapDestinations(JSON.parse(readFileSync(path.join(MAP_DIRECTORY, "destinations.json"), "utf-8")), manifest);
  const destinations = resolveWorldMapDestinations(definitions, new Set(manifest.developmentUnlockedFlags));
  assert.equal(resolveWorldMapEntryDestination(manifest, definitions, "from_starting_place").id, "destination_starting_place");
  assert.equal(resolveWorldMapEntryDestination(manifest, definitions, "from_starting_town").id, "destination_starting_town");
  for (const destination of destinations.filter((candidate) => candidate.unlocked)) {
    assert.equal(destination.unlocked, true);
    assert.equal(destination.positionStatus, "DEV_PLACEHOLDER_POSITION");
    const target = MAPS[destination.targetMapId];
    assert.ok(target, `${destination.id} target map must exist`);
    assert.ok(target.spawns[destination.targetSpawnId], `${destination.id} target spawn must exist`);
    assert.equal(destination.targetSpawnId, "fromWorldMap");
  }
});
