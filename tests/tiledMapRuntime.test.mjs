import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { findGidByLabel, findPlayerSpawn, formatTiledProperties } from "../src/systems/TiledMapRuntime.ts";
import { NO01_DAY_COLLISION_MARKER_LABEL } from "../src/config/no01TiledMap.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("findGidByLabel resolves a labeled tile's GID from a tileset's tileProperties", () => {
  const tilesets = [
    { firstgid: 1, tileProperties: { 2: { mq0Label: "path_dirt" }, 16: { mq0Label: "collision_solid_marker" } } },
    { firstgid: 19, tileProperties: { 0: { mq0Label: "grass_base" } } },
  ];
  assert.equal(findGidByLabel(tilesets, "collision_solid_marker"), 17);
  assert.equal(findGidByLabel(tilesets, "grass_base"), 19);
});

test("findGidByLabel returns null when no tileset has the label", () => {
  const tilesets = [{ firstgid: 1, tileProperties: { 0: { mq0Label: "grass_base" } } }];
  assert.equal(findGidByLabel(tilesets, "does_not_exist"), null);
});

test("findGidByLabel skips tilesets with no tileProperties instead of throwing", () => {
  const tilesets = [{ firstgid: 1 }, { firstgid: 19, tileProperties: { 5: { mq0Label: "water_a" } } }];
  assert.equal(findGidByLabel(tilesets, "water_a"), 24);
});

test("findPlayerSpawn resolves the center point of the playerSpawn object (not its top-left corner)", () => {
  const eventsLayer = {
    objects: [
      { name: "event_campfire", type: "event", x: 512, y: 608, width: 32, height: 32 },
      { name: "spawn_starting_place_day", type: "playerSpawn", x: 584, y: 648, width: 16, height: 16 },
    ],
  };
  const spawn = findPlayerSpawn(eventsLayer);
  assert.equal(spawn.x, 592);
  assert.equal(spawn.y, 656);
  assert.equal(spawn.object.name, "spawn_starting_place_day");
});

test("findPlayerSpawn throws a clear error when no playerSpawn object exists", () => {
  assert.throws(() => findPlayerSpawn({ objects: [] }), /playerSpawn/);
});

test("formatTiledProperties renders Tiled's name/type/value property array as key=value pairs", () => {
  const obj = {
    properties: [
      { name: "targetMap", type: "string", value: "" },
      { name: "id", type: "string", value: "exit_north" },
    ],
  };
  assert.equal(formatTiledProperties(obj), 'targetMap="", id="exit_north"');
});

test("formatTiledProperties returns an empty string when there are no properties", () => {
  assert.equal(formatTiledProperties({}), "");
  assert.equal(formatTiledProperties({ properties: [] }), "");
});

test("NO01_DAY_COLLISION_MARKER_LABEL matches a real tile label in the shipped DEV_PLACEHOLDER tileset", () => {
  const tsjPath = path.join(REPO_ROOT, "tiled/tilesets/mq0_dev_placeholder_outdoor.tsj");
  const tsj = JSON.parse(readFileSync(tsjPath, "utf-8"));
  const labels = tsj.tiles.flatMap((t) => t.properties ?? []).filter((p) => p.name === "mq0Label").map((p) => p.value);
  assert.ok(labels.includes(NO01_DAY_COLLISION_MARKER_LABEL), `"${NO01_DAY_COLLISION_MARKER_LABEL}" not found in shipped tileset labels`);
});
