import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { STARTING_TOWN_PRESENTATION } from "../src/config/startingTownPresentation.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("starting-town presentation: every visual anchor stays inside the unchanged background", () => {
  const { width, height } = STARTING_TOWN_PRESENTATION.mapSize;
  const { fountain, waterfall, riverGlints, awningHem } = STARTING_TOWN_PRESENTATION;
  assert.ok(fountain.x - fountain.radiusX - fountain.radiusGrowth >= 0);
  assert.ok(fountain.x + fountain.radiusX + fountain.radiusGrowth <= width);
  assert.ok(fountain.y - fountain.radiusY - fountain.radiusGrowth >= 0);
  assert.ok(fountain.y + fountain.radiusY + fountain.radiusGrowth <= height);
  assert.ok(waterfall.x - waterfall.width / 2 >= 0);
  assert.ok(waterfall.x + waterfall.width / 2 <= width);
  assert.ok(waterfall.y >= 0 && waterfall.y + waterfall.height <= height);
  assert.equal(riverGlints.length, 5);
  for (const glint of riverGlints) {
    assert.ok(glint.x - glint.width / 2 >= 0 && glint.x + glint.width / 2 <= width, `${glint.x},${glint.y} stays within the river edge`);
    assert.ok(glint.y >= 0 && glint.y <= height);
  }
  for (const point of [awningHem.start, awningHem.end]) assert.ok(point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height);
});

test("starting-town presentation: it remains a bounded visual layer, not a new simulation", () => {
  const presentation = STARTING_TOWN_PRESENTATION;
  assert.ok(presentation.redrawIntervalMs >= 33, "Graphics may not force a redraw every render frame");
  assert.ok(presentation.fountain.rings <= 3, "fountain effect stays sparse on mobile");
  assert.ok(presentation.waterfall.strands <= 5, "waterfall effect stays sparse on mobile");
  assert.ok(presentation.depths.water < 1000 && presentation.depths.awning < 1000, "player and NPC interaction remain visually unobscured");
});

test("starting-town scene installs the presentation layer without changing map state", () => {
  const source = readFileSync(path.join(REPO_ROOT, "src/scenes/StartingTownScene.ts"), "utf-8");
  const presentation = readFileSync(path.join(REPO_ROOT, "src/systems/StartingTownPresentation.ts"), "utf-8");
  assert.match(source, /startStartingTownPresentation\(this, worldScale, \(\) => this\.player\.visual\)/);
  assert.doesNotMatch(presentation, /GameStateRepository|setFlag|setData|\.physics\./);
  assert.doesNotMatch(presentation, /from ["']three["']/);
});
