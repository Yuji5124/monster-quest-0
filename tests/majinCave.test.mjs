import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { MAP_ENTRY_SPLASHES, getEntrySplashDurationMs } from "../src/config/mapSplash.ts";
import { MAPS } from "../src/config/maps.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects } from "../src/systems/ImageMapData.ts";
import { readWorldMapDestinations, readWorldMapManifest, resolveWorldMapEntryDestination } from "../src/systems/WorldMapData.ts";
import { analyseBodyReachability } from "./helpers/bodyReachability.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REFERENCE_DIR = path.join(REPO_ROOT, "assets/maps/reference/reference");
const WORLD_MAP_DIR = path.join(REPO_ROOT, "assets/maps/world_map");
const CAVES = [
  { directory: "majin_cave_1", mapId: "map_08_majin_cave_1", reference: "まじんのどうくつ_その１.png" },
  { directory: "majin_cave_2", mapId: "map_08_majin_cave_2", reference: "まじんのどうくつ_その2.png" },
  { directory: "majin_cave_3", mapId: "map_08_majin_cave_3", reference: "まじんのどうくつ_その3.png" },
];

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const pngSize = (file) => {
  const png = readFileSync(file);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
};

for (const cave of CAVES) {
  test(`${cave.directory}: complete CURRENT image-map package uses its matching user source`, () => {
    const directory = path.join(REPO_ROOT, "assets/maps", cave.directory);
    const manifest = readImageMapManifest(readJson(path.join(directory, "map.json")));
    assert.equal(manifest.id, cave.mapId);
    assert.equal(manifest.coordinateSpace, "background-pixels");
    assert.equal(manifest.assetStatus, "CURRENT");
    assert.equal(manifest.worldScale, 1.5);
    assert.equal(manifest.collisionCellSize, 8);
    for (const file of [manifest.background, manifest.collision, manifest.events, manifest.objects]) assert.ok(existsSync(path.join(directory, file)), `${file} must exist`);
    assert.ok(readFileSync(path.join(REFERENCE_DIR, cave.reference)).equals(readFileSync(path.join(directory, "background.png"))), "background must be an unmodified source copy");
    assert.deepEqual(pngSize(path.join(directory, "background.png")), { width: manifest.width, height: manifest.height });
    assert.deepEqual(pngSize(path.join(directory, "collision.png")), { width: manifest.width, height: manifest.height });
    assert.deepEqual(readImageMapObjects(readJson(path.join(directory, "objects.json"))), []);
    assert.equal(MAPS[cave.mapId].exits.length, 0);
  });

  test(`${cave.directory}: real player body can reach every configured spawn and exit`, () => {
    const result = analyseBodyReachability(cave.directory, cave.mapId, { margin: 6 });
    assert.equal(result.startFits, true);
    for (const spawn of result.spawnResults) assert.equal(spawn.ok, true, `${spawn.id} must be reachable`);
    for (const event of result.eventResults) assert.equal(event.ok, true, `${event.id} must be reachable`);
  });
}

test("majin cave pages connect WorldMap -> 1 -> 2 -> 3 and back without an immediate re-trigger", () => {
  const events = (directory) => readImageMapEvents(readJson(path.join(REPO_ROOT, "assets/maps", directory, "events.json")));
  const cave1Events = events("majin_cave_1");
  assert.equal(cave1Events[0].commands[0].type, "world-map");
  assert.equal(cave1Events[0].commands[0].worldMapEntryId, "from_majin_cave");
  assert.deepEqual(cave1Events[1].commands[0], { type: "transfer", targetMapId: "map_08_majin_cave_2", targetSpawnId: "fromCave1" });
  assert.deepEqual(events("majin_cave_2")[0].commands[0], { type: "transfer", targetMapId: "map_08_majin_cave_1", targetSpawnId: "fromCave2" });
  assert.deepEqual(events("majin_cave_2")[1].commands[0], { type: "transfer", targetMapId: "map_08_majin_cave_3", targetSpawnId: "fromCave2" });
  assert.deepEqual(events("majin_cave_3")[0].commands[0], { type: "transfer", targetMapId: "map_08_majin_cave_2", targetSpawnId: "fromCave3" });

  const manifest = readWorldMapManifest(readJson(path.join(WORLD_MAP_DIR, "map.json")));
  const destinations = readWorldMapDestinations(readJson(path.join(WORLD_MAP_DIR, "destinations.json")), manifest);
  const entry = resolveWorldMapEntryDestination(manifest, destinations, "from_majin_cave");
  assert.equal(entry.id, "destination_majin_cave");
  assert.equal(entry.name, "まじんのどうくつ");
  assert.equal(entry.targetMapId, "map_08_majin_cave_1");
  assert.equal(entry.targetSpawnId, "fromWorldMap");
});

test("majin cave world-map entry plays its key art for under four seconds with a lower-right caption", () => {
  const splash = MAP_ENTRY_SPLASHES.map_08_majin_cave_1;
  assert.ok(splash);
  assert.equal(getEntrySplashDurationMs(splash), 3500);
  assert.ok(getEntrySplashDurationMs(splash) <= 4000);
  assert.equal(splash.caption, "まじんのどうくつ");
  assert.equal(splash.captionPosition, "bottom-right");
  assert.ok(readFileSync(path.join(REFERENCE_DIR, "まじんのどうくつ.png")).equals(readFileSync(path.join(REPO_ROOT, "assets/maps/majin_cave_1/entry_splash.png"))));
});
