import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PLAYER } from "../src/config/player.ts";
import { MAPS } from "../src/config/maps.ts";
import { getDialogue } from "../src/data/dialogues.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects } from "../src/systems/ImageMapData.ts";
import { resolveWorldMapEntryDestination } from "../src/systems/WorldMapData.ts";
import { analyseBodyReachability } from "./helpers/bodyReachability.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_DIR = path.join(REPO_ROOT, "assets/maps/hidden_village");
const readJson = (file) => JSON.parse(readFileSync(file, "utf-8"));
const readPngSize = (file) => {
  const data = readFileSync(file);
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
};

test("hidden-village package is a CURRENT four-layer map using the unmodified user background", () => {
  const manifest = readImageMapManifest(readJson(path.join(MAP_DIR, "map.json")));
  assert.equal(manifest.id, "map_hidden_village");
  assert.equal(manifest.assetStatus, "CURRENT");
  for (const asset of [manifest.background, manifest.collision, manifest.events, manifest.objects]) {
    assert.ok(existsSync(path.join(MAP_DIR, asset)), `${asset} must exist beside map.json`);
  }
  const reference = readFileSync(path.join(REPO_ROOT, "assets/maps/reference/reference/かくれざと.png"));
  assert.ok(readFileSync(path.join(MAP_DIR, "background.png")).equals(reference), "background.png must remain byte-identical to the user artwork");
  assert.deepEqual(readPngSize(path.join(MAP_DIR, "background.png")), { width: manifest.width, height: manifest.height });
  assert.deepEqual(readPngSize(path.join(MAP_DIR, "collision.png")), { width: manifest.width, height: manifest.height });
});

test("hidden-village returns to the world map through its north-west gate and the world map returns to the village", () => {
  const events = readImageMapEvents(readJson(path.join(MAP_DIR, "events.json")));
  const exit = events.find((event) => event.id === "event_hidden_village_northwest_exit");
  assert.equal(exit?.commands[0].type, "world-map");
  const worldMap = readJson(path.join(REPO_ROOT, "assets/maps/world_map/map.json"));
  const destinations = readJson(path.join(REPO_ROOT, "assets/maps/world_map/destinations.json")).destinations;
  const destination = resolveWorldMapEntryDestination(worldMap, destinations, exit.commands[0].worldMapEntryId);
  assert.equal(destination.id, "destination_hidden_village");
  assert.equal(destination.implementationStatus, "implemented");
  assert.equal(MAPS[destination.targetMapId].sceneKey, "HiddenVillageScene");
  assert.ok(MAPS[destination.targetMapId].spawns[destination.targetSpawnId]);
  assert.deepEqual(readImageMapObjects(readJson(path.join(MAP_DIR, "objects.json"))), []);
});

test("hidden-village uses fixed villagers at homes and only plaza/garden residents wander", () => {
  const npcs = MAPS.map_hidden_village.npcs;
  assert.equal(npcs.length, 8);
  assert.equal(npcs.filter((npc) => !npc.movement).length, 6);
  assert.equal(npcs.filter((npc) => npc.movement?.kind === "wander").length, 2);
  assert.ok(npcs.every((npc) => npc.spriteId && getDialogue(npc.dialogueId)?.pages.length));
  const reachability = analyseBodyReachability("hidden_village", "map_hidden_village", { margin: 6 });
  for (const npc of npcs) assert.equal(reachability.canReach(npc.position.x, npc.position.y), true, `${npc.id} must stand on the reachable path network`);
});

test("the return spawn clears the north-west exit zone", () => {
  const exit = readImageMapEvents(readJson(path.join(MAP_DIR, "events.json"))).find((event) => event.id === "event_hidden_village_northwest_exit").bounds;
  const spawn = MAPS.map_hidden_village.spawns.fromWorldMap;
  const overlaps = spawn.x + PLAYER.width / 2 > exit.x && spawn.x - PLAYER.width / 2 < exit.x + exit.width
    && spawn.y + PLAYER.height / 2 > exit.y && spawn.y - PLAYER.height / 2 < exit.y + exit.height;
  assert.equal(overlaps, false);
});
