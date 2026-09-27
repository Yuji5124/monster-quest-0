import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { WORLD_MAP_CLOUDS } from "../src/config/worldMapPresentation.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("world-map clouds stay between the background and the destination markers", () => {
  for (const depth of Object.values(WORLD_MAP_CLOUDS.depth)) {
    assert.ok(depth > 0 && depth < 19, `depth ${depth} must stay under the map hit area and markers (19-22)`);
  }
  assert.ok(WORLD_MAP_CLOUDS.depth.shadow < WORLD_MAP_CLOUDS.depth.underside);
  assert.ok(WORLD_MAP_CLOUDS.depth.underside < WORLD_MAP_CLOUDS.depth.cloud);
});

test("world-map clouds are translucent, few and slow", () => {
  for (const layer of [WORLD_MAP_CLOUDS.clouds, WORLD_MAP_CLOUDS.wisps]) {
    for (const key of ["width", "aspect", "alpha", "speed"]) assert.ok(layer[key].min <= layer[key].max, key);
    assert.ok(layer.alpha.max <= 0.6, "clouds must not hide the map");
    assert.ok(layer.count <= 5, "few objects for iPhone Safari");
    assert.ok(layer.speed.max <= 20, "slow drift");
  }
  assert.ok(WORLD_MAP_CLOUDS.shadowAlpha <= 0.25);
  assert.ok(WORLD_MAP_CLOUDS.gustAmount < 1, "clouds never stop or reverse");
});

test("WorldMapScene starts the clouds and keeps them off the HUD camera", () => {
  const source = readFileSync(path.join(REPO_ROOT, "src/scenes/WorldMapScene.ts"), "utf-8");
  assert.match(source, /const clouds = startWorldMapClouds\(this,/);
  assert.match(source, /const worldObjects = \[background, \.\.\.clouds,/);
});
