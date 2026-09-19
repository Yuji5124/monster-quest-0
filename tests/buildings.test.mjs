import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";
import { MAPS } from "../src/config/maps.ts";

const interiorsPath = fileURLToPath(
  new URL("../assets/maps/data/no02_start_town_interiors.json", import.meta.url),
);
const interiors = JSON.parse(readFileSync(interiorsPath, "utf8"));
const interiorIds = new Set(interiors.interiors.map((interior) => interior.id));

test("every building has a non-empty footprint and door rect", () => {
  for (const map of Object.values(MAPS)) {
    for (const building of map.buildings) {
      assert.ok(building.footprint.width > 0 && building.footprint.height > 0, building.id);
      assert.ok(building.door.width > 0 && building.door.height > 0, building.id);
    }
  }
});

test("the door sits on the footprint's edge, not floating outside it", () => {
  for (const map of Object.values(MAPS)) {
    for (const building of map.buildings) {
      const { footprint: f, door: d } = building;
      assert.ok(d.x >= f.x && d.x + d.width <= f.x + f.width, `${building.id} door x out of footprint`);
      assert.ok(d.y >= f.y && d.y + d.height <= f.y + f.height, `${building.id} door y out of footprint`);
    }
  }
});

test("no two buildings on the same map overlap", () => {
  for (const map of Object.values(MAPS)) {
    const rects = map.buildings.map((b) => b.footprint);
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        const a = rects[i];
        const b = rects[j];
        const overlap = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
        assert.equal(overlap, false, `${map.buildings[i].id} overlaps ${map.buildings[j].id}`);
      }
    }
  }
});

test("no duplicate building ids within a map", () => {
  for (const map of Object.values(MAPS)) {
    const ids = map.buildings.map((b) => b.id);
    assert.equal(new Set(ids).size, ids.length);
  }
});

test("every building's mapId matches the map it is defined on", () => {
  for (const map of Object.values(MAPS)) {
    for (const building of map.buildings) {
      assert.equal(building.mapId, map.id);
    }
  }
});

test("every non-null interiorId matches a real entry in no02_start_town_interiors.json", () => {
  for (const map of Object.values(MAPS)) {
    for (const building of map.buildings) {
      if (building.interiorId === null) continue;
      assert.ok(interiorIds.has(building.interiorId), `${building.id} references unknown interior ${building.interiorId}`);
    }
  }
});

test("No.02 has exactly the 5 buildings confirmed in the interior design data (background image only shows 5)", () => {
  const ids = MAPS.map_02_starting_town.buildings.map((b) => b.interiorId).sort();
  assert.deepEqual(ids, [
    "map_02_church",
    "map_02_house_a",
    "map_02_inn",
    "map_02_item_shop",
    "map_02_weapon_shop",
  ]);
});
