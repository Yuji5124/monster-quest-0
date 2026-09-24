import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PLAYER } from "../src/config/player.ts";
import { MAPS } from "../src/config/maps.ts";
import { MAP_ENTRY_SPLASHES } from "../src/config/mapSplash.ts";
import { DEV_BATTLE_MONSTERS } from "../src/data/monsters.ts";
import { ENCOUNTER_TABLES } from "../src/data/encounterTables.ts";
import { readImageMapEvents, readImageMapManifest } from "../src/systems/ImageMapData.ts";
import { resolveWorldMapEntryDestination } from "../src/systems/WorldMapData.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REFERENCE_DIR = path.join(REPO_ROOT, "assets/maps/reference/reference");
const readJson = (file) => JSON.parse(readFileSync(file, "utf-8"));
const readPngSize = (file) => {
  const buffer = readFileSync(file);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};
const eventsOf = (dir) => readImageMapEvents(readJson(path.join(REPO_ROOT, "assets/maps", dir, "events.json")));
const overlaps = (spawn, zone) =>
  spawn.x + PLAYER.width / 2 > zone.x && spawn.x - PLAYER.width / 2 < zone.x + zone.width &&
  spawn.y + PLAYER.height / 2 > zone.y && spawn.y - PLAYER.height / 2 < zone.y + zone.height;

// いわやまのどうくつ_2.png is byte-identical to _1.png, so the user chose two floors: _1 = 1F, _3 = 2F.
for (const [dir, mapId, reference] of [
  ["iwayama_cave_1", "map_iwayama_cave_1", "いわやまのどうくつ_1.png"],
  ["iwayama_cave_2", "map_iwayama_cave_2", "いわやまのどうくつ_3.png"],
]) {
  test(`${dir} package: CURRENT manifest, four layers, background is the unmodified user reference`, () => {
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

test("the world map leads into 1F, and 1F's entrance leads back to the world map", () => {
  const exit = eventsOf("iwayama_cave_1").find((event) => event.id === "event_iwayama_cave_1_entrance_exit");
  assert.equal(exit.commands[0].type, "world-map");
  const worldMap = readJson(path.join(REPO_ROOT, "assets/maps/world_map/map.json"));
  const destinations = readJson(path.join(REPO_ROOT, "assets/maps/world_map/destinations.json")).destinations;
  const destination = resolveWorldMapEntryDestination(worldMap, destinations, exit.commands[0].worldMapEntryId);
  assert.equal(destination.id, "destination_iwayama_cave");
  assert.equal(destination.implementationStatus, "implemented");
  assert.equal(destination.targetMapId, "map_iwayama_cave_1");
  assert.equal(MAPS[destination.targetMapId].sceneKey, "IwayamaCave1Scene");
  assert.ok(MAPS[destination.targetMapId].spawns[destination.targetSpawnId]);
});

test("the 1F and 2F stairs lead to each other's spawn", () => {
  const up = eventsOf("iwayama_cave_1").find((event) => event.id === "event_iwayama_cave_1_stairs_to_2f").commands[0];
  const down = eventsOf("iwayama_cave_2").find((event) => event.id === "event_iwayama_cave_2_stairs_to_1f").commands[0];
  assert.deepEqual([up.targetMapId, up.targetSpawnId], ["map_iwayama_cave_2", "fromCaveFloor1"]);
  assert.deepEqual([down.targetMapId, down.targetSpawnId], ["map_iwayama_cave_1", "fromCaveFloor2"]);
  assert.ok(MAPS.map_iwayama_cave_2.spawns.fromCaveFloor1);
  assert.ok(MAPS.map_iwayama_cave_1.spawns.fromCaveFloor2);
});

test("no spawn's Player body starts inside an event zone (no instant re-trigger)", () => {
  for (const [dir, mapId] of [["iwayama_cave_1", "map_iwayama_cave_1"], ["iwayama_cave_2", "map_iwayama_cave_2"]]) {
    for (const [spawnId, spawn] of Object.entries(MAPS[mapId].spawns)) {
      for (const event of eventsOf(dir)) assert.equal(overlaps(spawn, event.bounds), false, `${spawnId} overlaps ${event.id}`);
    }
  }
});

test("entering from the world map plays the unmodified いわやまのどうくつ_イメージ.png splash", () => {
  const splash = MAP_ENTRY_SPLASHES.map_iwayama_cave_1;
  assert.deepEqual(splash.spawnIds, ["fromWorldMap"]);
  assert.equal(splash.caption, "いわやまのどうくつ");
  const copy = readFileSync(path.join(REPO_ROOT, "assets/maps/iwayama_cave_1/entry_splash.png"));
  assert.ok(copy.equals(readFileSync(path.join(REFERENCE_DIR, "いわやまのどうくつ_イメージ.png"))));
});

test("random encounters use こあくま・エリマキヘビ・ダイジャ with roster stats and the cave battle background", () => {
  const ids = ENCOUNTER_TABLES.iwayama_cave.entries.map((entry) => entry.enemies[0]);
  assert.deepEqual(ids, ["koakuma", "erimaki_hebi", "daija"]);
  const expected = { koakuma: ["こあくま", 58], erimaki_hebi: ["エリマキヘビ", 66], daija: ["ダイジャ", 82] };
  for (const id of ids) {
    const monster = DEV_BATTLE_MONSTERS[id];
    assert.deepEqual([monster.displayName, monster.maxHp], expected[id]);
    assert.equal(monster.background.key, "battle.bg.iwayama_cave");
  }
});
