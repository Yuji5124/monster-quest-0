import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { MAP_ENTRY_SPLASHES, findEntrySplash, getEntrySplashDurationMs } from "../src/config/mapSplash.ts";
import { MAPS } from "../src/config/maps.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("the castle town's entry splash lasts exactly 5 seconds: fade in, hold, fade out", () => {
  const splash = MAP_ENTRY_SPLASHES.map_rainland_castle_town;
  assert.ok(splash);
  assert.ok(splash.fadeInMs > 0 && splash.holdMs > 0 && splash.fadeOutMs > 0);
  assert.equal(getEntrySplashDurationMs(splash), 5000);
  assert.ok(splash.caption.length > 0);
});

test("every entry splash points at an existing image and only at spawns that exist on its map", () => {
  for (const [mapId, splash] of Object.entries(MAP_ENTRY_SPLASHES)) {
    assert.ok(MAPS[mapId], `${mapId} must be a registered map`);
    const file = new URL(splash.imageUrl);
    assert.ok(existsSync(file), `${splash.imageUrl} must exist`);
    assert.ok(readFileSync(file).length > 100_000, "the splash image must be a real high-resolution file");
    assert.ok(splash.spawnIds.length > 0);
    for (const spawnId of splash.spawnIds) assert.ok(MAPS[mapId].spawns[spawnId], `${mapId} has no spawn ${spawnId}`);
  }
});

test("entering the castle town from the world map plays the splash; other ways in or other maps do not", () => {
  const resolved = findEntrySplash("RainlandCastleTownScene", "fromWorldMap");
  assert.equal(resolved?.mapId, "map_rainland_castle_town");
  assert.equal(resolved?.splash, MAP_ENTRY_SPLASHES.map_rainland_castle_town);

  assert.equal(findEntrySplash("RainlandCastleTownScene", "someFutureBuildingFront"), undefined, "coming back from a building must not replay it");
  assert.equal(findEntrySplash("RainlandCastleTownScene", undefined), undefined);
  for (const other of ["StartingPlaceScene", "StartingTownScene", "StartingForestScene", "BieVillageScene", "RainlandForest1Scene", "RainlandForest2Scene", "WorldMapScene", "InteriorScene", "NoSuchScene"]) {
    assert.equal(findEntrySplash(other, "fromWorldMap"), undefined, `${other} must not have an entry splash`);
  }
});

test("the transition helper routes through the splash Scene and the game registers that Scene", () => {
  const transition = readFileSync(path.join(REPO_ROOT, "src/systems/MapTransition.ts"), "utf-8");
  assert.match(transition, /findEntrySplash\(targetSceneKey, data\.spawnId\)/);
  assert.match(transition, /MAP_SPLASH_SCENE_KEY/);
  const main = readFileSync(path.join(REPO_ROOT, "src/main.ts"), "utf-8");
  assert.match(main, /normalScenes = \[[^\]]*MapSplashScene[^\]]*RainlandCastleTownScene|normalScenes = \[[^\]]*RainlandCastleTownScene[^\]]*MapSplashScene/);
  assert.match(main, /\? \[WorldMapTestScene[^\]]*RainlandCastleTownScene[^\]]*MapSplashScene/);
});
