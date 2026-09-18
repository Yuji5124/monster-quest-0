import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { MAPS } from "../src/config/maps.ts";
import { INTERIORS } from "../src/config/interiors.ts";

const interiorsJsonPath = new URL(
  "../assets/maps/data/no02_start_town_interiors.json", import.meta.url,
);
const designData = JSON.parse(readFileSync(interiorsJsonPath, "utf8"));
const designIds = new Set(designData.interiors.map((interior) => interior.id));

test("No.02 interior design data names the same parent map used at runtime", () => {
  assert.equal(designData.parentMapId, MAPS.map_02_starting_town.id);
});

test("every INTERIORS key matches its own id field", () => {
  for (const [key, interior] of Object.entries(INTERIORS)) {
    assert.equal(interior.id, key);
  }
});

test("INTERIORS has exactly the 6 ids confirmed in no02_start_town_interiors.json", () => {
  assert.deepEqual(Object.keys(INTERIORS).sort(), [...designIds].sort());
});

test("every building.interiorId that is not null resolves to a real INTERIORS entry", () => {
  for (const map of Object.values(MAPS)) {
    for (const building of map.buildings) {
      if (building.interiorId === null) continue;
      assert.ok(INTERIORS[building.interiorId], `${building.id} -> missing interior ${building.interiorId}`);
    }
  }
});

test("every building's frontSpawnId resolves to a real spawn on its own map", () => {
  for (const map of Object.values(MAPS)) {
    for (const building of map.buildings) {
      assert.ok(map.spawns[building.frontSpawnId], `${building.id} -> missing spawn ${building.frontSpawnId}`);
    }
  }
});

test("every No.02 interior exits to its matching building-front spawn", () => {
  const town = MAPS.map_02_starting_town;
  for (const interior of designData.interiors) {
    assert.equal(interior.exit.to, designData.parentMapId, interior.id);
    assert.ok(town.spawns[interior.exit.spawnId], `${interior.id} -> missing return spawn`);
    const building = town.buildings.find((candidate) => candidate.interiorId === interior.id);
    assert.ok(building, `${interior.id} -> missing building`);
    assert.equal(building.frontSpawnId, interior.exit.spawnId, `${interior.id} -> mismatched return spawn`);
  }
});

test("room and exit/spawn rects are positive-sized and inside the room bounds", () => {
  for (const interior of Object.values(INTERIORS)) {
    assert.ok(interior.room.width > 0 && interior.room.height > 0, interior.id);
    for (const rect of [interior.exitZone, ...interior.furniture]) {
      assert.ok(rect.width > 0 && rect.height > 0, interior.id);
      assert.ok(rect.x >= 0 && rect.x + rect.width <= interior.room.width, `${interior.id} rect x out of room`);
      assert.ok(rect.y >= 0 && rect.y + rect.height <= interior.room.height, `${interior.id} rect y out of room`);
    }
    const spawn = interior.playerSpawn;
    assert.ok(spawn.x >= 0 && spawn.x <= interior.room.width, `${interior.id} spawn x out of room`);
    assert.ok(spawn.y >= 0 && spawn.y <= interior.room.height, `${interior.id} spawn y out of room`);
  }
});

test("the player spawn does not start inside the exit zone (no instant re-trigger)", () => {
  for (const interior of Object.values(INTERIORS)) {
    const s = interior.playerSpawn;
    const e = interior.exitZone;
    const overlap = s.x >= e.x && s.x <= e.x + e.width && s.y >= e.y && s.y <= e.y + e.height;
    assert.equal(overlap, false, interior.id);
  }
});

test("the player spawn does not overlap any furniture piece", () => {
  for (const interior of Object.values(INTERIORS)) {
    const s = interior.playerSpawn;
    for (const f of interior.furniture) {
      const overlap = s.x >= f.x && s.x <= f.x + f.width && s.y >= f.y && s.y <= f.y + f.height;
      assert.equal(overlap, false, interior.id);
    }
  }
});

test("looking up an unknown interior id is undefined (safe fallback signal for InteriorScene)", () => {
  assert.equal(INTERIORS["does_not_exist"], undefined);
});

test("every interior has a parentSceneKey that matches an existing map's sceneKey", () => {
  const sceneKeys = new Set(Object.values(MAPS).map((map) => map.sceneKey));
  for (const interior of Object.values(INTERIORS)) {
    assert.ok(sceneKeys.has(interior.parentSceneKey), interior.id);
  }
});
