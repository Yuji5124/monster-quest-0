import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects } from "../src/systems/ImageMapData.ts";
import { MAPS } from "../src/config/maps.ts";
import { DIALOGUES } from "../src/data/dialogues.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadMap(directory) {
  const root = path.join(REPO_ROOT, "assets/maps", directory);
  const manifest = readImageMapManifest(JSON.parse(readFileSync(path.join(root, "map.json"), "utf8")));
  const events = readImageMapEvents(JSON.parse(readFileSync(path.join(root, "events.json"), "utf8")));
  const objects = readImageMapObjects(JSON.parse(readFileSync(path.join(root, "objects.json"), "utf8")));
  for (const file of [manifest.background, manifest.collision, manifest.events, manifest.objects]) {
    assert.equal(existsSync(path.join(root, file)), true, `${directory}/${file} must exist`);
  }
  return { manifest, events, objects };
}

test("mysterious tower exterior is a complete four-layer current image map with its landkeeper, entrance and world-map exit", () => {
  const { manifest, events, objects } = loadMap("mysterious_tower_exterior");
  assert.equal(manifest.id, "map_mysterious_tower_exterior");
  assert.equal(manifest.assetStatus, "CURRENT");
  assert.equal(manifest.width, 1536);
  assert.equal(manifest.height, 1024);
  assert.equal(manifest.background, "background_tower_level_1.png");
  assert.deepEqual(objects, []);
  assert.deepEqual(events.map((event) => event.commands[0]), [
    { type: "transfer", targetMapId: "map_mysterious_tower_1f", targetSpawnId: "fromExterior" },
    { type: "world-map", worldMapEntryId: "from_mysterious_tower" },
  ]);
  assert.equal(MAPS.map_mysterious_tower_exterior.spawns.fromWorldMap.facing, "up");
  assert.deepEqual(MAPS.map_mysterious_tower_exterior.spawns.fromTower1F, { x: 768, y: 416, facing: "down" });
  assert.equal(MAPS.map_mysterious_tower_exterior.spawns.fromTower1F.facing, "down");
  assert.deepEqual(MAPS.map_mysterious_tower_exterior.npcs, [{
    id: "npc_mysterious_tower_landkeeper",
    mapId: "map_mysterious_tower_exterior",
    position: { x: 640, y: 680 },
    facing: "down",
    dialogueId: "npc_mysterious_tower_landkeeper",
    spriteId: "villager_17",
    role: "resident",
  }]);
  assert.deepEqual(DIALOGUES.npc_mysterious_tower_landkeeper?.pages, [
    "おお　きたか。\nこの　さらちは　わしが\nあずかって　おる。",
    "だが　いまは　だれも\nつかう　よていが　ない。",
    "ここは　じゆうに\nつかって　かまわんぞ。",
    "すきに　しておくれ。",
  ]);
});

test("mysterious tower 1F returns outside and keeps its core in OBJECT data", () => {
  const { manifest, events, objects } = loadMap("mysterious_tower_1f");
  assert.equal(manifest.id, "map_mysterious_tower_1f");
  assert.deepEqual(events[0].commands[0], { type: "transfer", targetMapId: "map_mysterious_tower_exterior", targetSpawnId: "fromTower1F" });
  assert.deepEqual(objects, [{
    id: "object_mysterious_tower_core",
    label: "塔の核",
    type: "interactable",
    x: 436,
    y: 288,
    width: 88,
    height: 80,
    blocking: true,
    presentation: "tower-core",
    message: "……。",
  }]);
  assert.equal(MAPS.map_mysterious_tower_1f.spawns.fromExterior.facing, "up");
});
