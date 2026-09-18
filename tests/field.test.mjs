import assert from "node:assert/strict";
import test from "node:test";
import { DISPLAY } from "../src/config/display.ts";
import { FIELD_BACKGROUND_PATCHES, FIELD_BOUNDS, FIELD_COLLISION_FEATURES } from "../src/config/field.ts";
import { MAPS } from "../src/config/maps.ts";

test("Field mapId exists in MAPS", () => {
  assert.ok(MAPS.field_starting_region);
});

test("Field sceneKey is FieldScene", () => {
  assert.equal(MAPS.field_starting_region.sceneKey, "FieldScene");
});

test("Field bounds are larger than the internal display resolution (960x720)", () => {
  assert.ok(FIELD_BOUNDS.width > DISPLAY.width);
  assert.ok(FIELD_BOUNDS.height > DISPLAY.height);
});

test("Field has exactly the 2 spawn points needed for No.01/No.02 arrival", () => {
  assert.deepEqual(
    Object.keys(MAPS.field_starting_region.spawns).sort(),
    ["fromStartingPlace", "fromStartingTown"],
  );
});

test("Field has exactly the 2 exits needed to reach No.01/No.02", () => {
  const targets = MAPS.field_starting_region.exits.filter((e) => e.kind === "local-map").map((e) => e.targetMapId).sort();
  assert.deepEqual(targets, ["map_01_starting_place", "map_02_starting_town"]);
});

test("active No.01 / No.02 routes no longer enter the legacy FieldScene", () => {
  assert.equal(MAPS.map_01_starting_place.exits.some((exit) => exit.kind === "local-map" && exit.targetMapId === "field_starting_region"), false);
  assert.equal(MAPS.map_02_starting_town.exits.some((exit) => exit.kind === "local-map" && exit.targetMapId === "field_starting_region"), false);
});

test("Field -> No.01: exit resolves to a real map_01 spawn", () => {
  const exit = MAPS.field_starting_region.exits.find((e) => e.kind === "local-map" && e.targetMapId === "map_01_starting_place");
  assert.ok(exit);
  assert.ok(MAPS.map_01_starting_place.spawns[exit.targetSpawnId]);
});

test("Field -> No.02: exit resolves to a real map_02 spawn", () => {
  const exit = MAPS.field_starting_region.exits.find((e) => e.kind === "local-map" && e.targetMapId === "map_02_starting_town");
  assert.ok(exit);
  assert.ok(MAPS.map_02_starting_town.spawns[exit.targetSpawnId]);
});

test("looking up an unknown Field spawn id is undefined (safe fallback signal for FieldScene)", () => {
  assert.equal(MAPS.field_starting_region.spawns["doesNotExist"], undefined);
});

test("Field spawns do not start inside their own map's exit zones (no instant re-trigger)", () => {
  for (const spawn of Object.values(MAPS.field_starting_region.spawns)) {
    for (const exit of MAPS.field_starting_region.exits) {
      const overlap =
        spawn.x >= exit.bounds.x && spawn.x <= exit.bounds.x + exit.bounds.width &&
        spawn.y >= exit.bounds.y && spawn.y <= exit.bounds.y + exit.bounds.height;
      assert.equal(overlap, false, `${exit.id} overlaps a Field spawn`);
    }
  }
});

test("Field spawns and exits are within Field bounds", () => {
  for (const spawn of Object.values(MAPS.field_starting_region.spawns)) {
    assert.ok(spawn.x >= 0 && spawn.x <= FIELD_BOUNDS.width);
    assert.ok(spawn.y >= 0 && spawn.y <= FIELD_BOUNDS.height);
  }
  for (const exit of MAPS.field_starting_region.exits) {
    assert.ok(exit.bounds.x >= 0 && exit.bounds.x + exit.bounds.width <= FIELD_BOUNDS.width);
    assert.ok(exit.bounds.y >= 0 && exit.bounds.y + exit.bounds.height <= FIELD_BOUNDS.height);
  }
});

test("Field collision features (mountain/water DEV_PLACEHOLDER) are positive-sized and within bounds", () => {
  for (const feature of FIELD_COLLISION_FEATURES) {
    assert.ok(feature.width > 0 && feature.height > 0);
    assert.ok(feature.x >= 0 && feature.x + feature.width <= FIELD_BOUNDS.width);
    assert.ok(feature.y >= 0 && feature.y + feature.height <= FIELD_BOUNDS.height);
  }
});

test("Field background patches (visual-only) are positive-sized and within bounds", () => {
  for (const patch of FIELD_BACKGROUND_PATCHES) {
    assert.ok(patch.width > 0 && patch.height > 0);
    assert.ok(patch.x >= 0 && patch.x + patch.width <= FIELD_BOUNDS.width);
    assert.ok(patch.y >= 0 && patch.y + patch.height <= FIELD_BOUNDS.height);
  }
});
