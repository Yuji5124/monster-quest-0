import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PLAYER } from "../src/config/player.ts";
import { MAPS } from "../src/config/maps.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects } from "../src/systems/ImageMapData.ts";
import { resolveWorldMapEntryDestination } from "../src/systems/WorldMapData.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_DIR = path.join(REPO_ROOT, "assets/maps/zabon_village");
const readJson = (file) => JSON.parse(readFileSync(file, "utf-8"));
const readPngSize = (file) => {
  const buffer = readFileSync(file);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};

test("zabon-village package: CURRENT manifest, four layers, background is the unmodified user reference", () => {
  const manifest = readImageMapManifest(readJson(path.join(MAP_DIR, "map.json")));
  assert.equal(manifest.id, "map_zabon_village");
  assert.equal(manifest.assetStatus, "CURRENT");
  for (const asset of [manifest.background, manifest.collision, manifest.events, manifest.objects]) {
    assert.ok(existsSync(path.join(MAP_DIR, asset)), `${asset} must exist beside map.json`);
  }
  const reference = readFileSync(path.join(REPO_ROOT, "assets/maps/reference/reference/ザボンのむら　新.png"));
  assert.ok(readFileSync(path.join(MAP_DIR, "background.png")).equals(reference), "background.png must be byte-identical to the reference");
  assert.deepEqual(readPngSize(path.join(MAP_DIR, "background.png")), { width: manifest.width, height: manifest.height });
  assert.deepEqual(readPngSize(path.join(MAP_DIR, "collision.png")), { width: manifest.width, height: manifest.height });
});

test("zabon-village north exit leads to the world map and the world map leads back to the village", () => {
  const events = readImageMapEvents(readJson(path.join(MAP_DIR, "events.json")));
  const exit = events.find((event) => event.id === "event_zabon_village_north_exit");
  assert.equal(exit.commands[0].type, "world-map");
  const worldMap = readJson(path.join(REPO_ROOT, "assets/maps/world_map/map.json"));
  const destinations = readJson(path.join(REPO_ROOT, "assets/maps/world_map/destinations.json")).destinations;
  const destination = resolveWorldMapEntryDestination(worldMap, destinations, exit.commands[0].worldMapEntryId);
  assert.equal(destination.id, "destination_zabon_village");
  assert.equal(destination.implementationStatus, "implemented");
  assert.equal(MAPS[destination.targetMapId].sceneKey, "ZabonVillageScene");
  assert.ok(MAPS[destination.targetMapId].spawns[destination.targetSpawnId]);
  // No NPCs yet: docs/NPC_SPEC.md still lists ザボンのむら's NPC layout as under review.
  assert.deepEqual(readImageMapObjects(readJson(path.join(MAP_DIR, "objects.json"))), []);
});

test("the fromWorldMap spawn's Player body clears the north exit zone (no instant re-trigger)", () => {
  const events = readImageMapEvents(readJson(path.join(MAP_DIR, "events.json")));
  const gate = events.find((event) => event.id === "event_zabon_village_north_exit").bounds;
  const spawn = MAPS.map_zabon_village.spawns.fromWorldMap;
  const overlaps =
    spawn.x + PLAYER.width / 2 > gate.x && spawn.x - PLAYER.width / 2 < gate.x + gate.width &&
    spawn.y + PLAYER.height / 2 > gate.y && spawn.y - PLAYER.height / 2 < gate.y + gate.height;
  assert.equal(overlaps, false);
});
