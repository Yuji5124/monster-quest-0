import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PLAYER } from "../src/config/player.ts";
import { MAPS } from "../src/config/maps.ts";
import { findEntrySplash, MAP_ENTRY_SPLASHES } from "../src/config/mapSplash.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects } from "../src/systems/ImageMapData.ts";
import { resolveWorldMapEntryDestination } from "../src/systems/WorldMapData.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_DIR = path.join(REPO_ROOT, "assets/maps/dakoha_port");
const readJson = (file) => JSON.parse(readFileSync(file, "utf-8"));
const readPngSize = (file) => {
  const buffer = readFileSync(file);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};

test("dakoha-port package: CURRENT manifest, four layers, background and splash are the unmodified user references", () => {
  const manifest = readImageMapManifest(readJson(path.join(MAP_DIR, "map.json")));
  assert.equal(manifest.id, "map_dakoha_port");
  assert.equal(manifest.assetStatus, "CURRENT");
  for (const asset of [manifest.background, manifest.collision, manifest.events, manifest.objects]) {
    assert.ok(existsSync(path.join(MAP_DIR, asset)), `${asset} must exist beside map.json`);
  }
  const reference = readFileSync(path.join(REPO_ROOT, "assets/maps/reference/reference/港町ダコハ.png"));
  assert.ok(readFileSync(path.join(MAP_DIR, "background.png")).equals(reference), "background.png must be byte-identical to the reference");
  const splashReference = readFileSync(path.join(REPO_ROOT, "assets/maps/reference/reference/港町ダコハ_イメージ.png"));
  assert.ok(readFileSync(path.join(MAP_DIR, "entry_splash.png")).equals(splashReference), "entry_splash.png must be byte-identical to the reference");
  assert.deepEqual(readPngSize(path.join(MAP_DIR, "background.png")), { width: manifest.width, height: manifest.height });
  assert.deepEqual(readPngSize(path.join(MAP_DIR, "collision.png")), { width: manifest.width, height: manifest.height });
  assert.deepEqual(readImageMapObjects(readJson(path.join(MAP_DIR, "objects.json"))), []);
});

test("the world map's 港町ダコハ point enters the port, and the north gate returns to that point", () => {
  const worldMap = readJson(path.join(REPO_ROOT, "assets/maps/world_map/map.json"));
  const destinations = readJson(path.join(REPO_ROOT, "assets/maps/world_map/destinations.json")).destinations;
  const point = destinations.find((destination) => destination.id === "destination_dakoha_port");
  assert.equal(point.implementationStatus, "implemented");
  assert.equal(point.targetMapId, "map_dakoha_port");
  assert.equal(MAPS[point.targetMapId].sceneKey, "DakohaPortScene");
  assert.ok(MAPS[point.targetMapId].spawns[point.targetSpawnId]);

  const events = readImageMapEvents(readJson(path.join(MAP_DIR, "events.json")));
  const gate = events.find((event) => event.id === "event_dakoha_port_north_gate");
  assert.equal(gate.commands[0].type, "world-map");
  assert.equal(resolveWorldMapEntryDestination(worldMap, destinations, gate.commands[0].worldMapEntryId).id, "destination_dakoha_port");
});

test("entering 港町ダコハ from the world map shows its 5-second image first", () => {
  const splash = MAP_ENTRY_SPLASHES.map_dakoha_port;
  assert.equal(splash.caption, "港町ダコハ");
  assert.equal(splash.fadeInMs + splash.holdMs + splash.fadeOutMs, 5000);
  assert.equal(findEntrySplash("DakohaPortScene", "fromWorldMap")?.mapId, "map_dakoha_port");
});

test("the fromWorldMap spawn's Player body clears the north gate zone (no instant re-trigger)", () => {
  const events = readImageMapEvents(readJson(path.join(MAP_DIR, "events.json")));
  const gate = events.find((event) => event.id === "event_dakoha_port_north_gate").bounds;
  const spawn = MAPS.map_dakoha_port.spawns.fromWorldMap;
  const overlaps =
    spawn.x + PLAYER.width / 2 > gate.x && spawn.x - PLAYER.width / 2 < gate.x + gate.width &&
    spawn.y + PLAYER.height / 2 > gate.y && spawn.y - PLAYER.height / 2 < gate.y + gate.height;
  assert.equal(overlaps, false);
});
