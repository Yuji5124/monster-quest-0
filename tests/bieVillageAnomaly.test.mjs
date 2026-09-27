import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { BIE_VILLAGE_ANOMALY, BIE_VILLAGER_GLITCH } from "../src/config/bieVillageAnomaly.ts";
import { planVillagerGlitch } from "../src/systems/MapAnomalyPlan.ts";
import { pickHotspot, planBlock, planSparks, planTear } from "../src/systems/MapAnomalyPlan.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP = JSON.parse(readFileSync(path.join(REPO_ROOT, "assets/maps/bie_village/map.json"), "utf-8"));

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

const inside = (x, y, w, h) => x >= 0 && y >= 0 && x + w <= MAP.width && y + h <= MAP.height;

test("bie-village anomaly hotspots lie inside the background and ranges are ordered", () => {
  for (const hotspot of BIE_VILLAGE_ANOMALY.hotspots) {
    assert.ok(inside(hotspot.area.x, hotspot.area.y, hotspot.area.width, hotspot.area.height), `${hotspot.id} must be on the map`);
    assert.ok(hotspot.weight > 0);
  }
  for (const key of ["sparkIntervalMs", "sparkCount", "sparkSize", "sparkDurationMs", "tearIntervalMs", "tearHeight", "tearShift", "tearDurationMs", "blockIntervalMs", "blockSize", "blockDurationMs"]) {
    assert.ok(BIE_VILLAGE_ANOMALY[key].min <= BIE_VILLAGE_ANOMALY[key].max, `${key} min <= max`);
  }
});

test("bie-village anomaly stays a brief flicker (never a long freeze-like disturbance)", () => {
  // GLITCH_SPEC.md: no real freeze / long control loss. Each visible disturbance ends well within a quarter second.
  assert.ok(BIE_VILLAGE_ANOMALY.sparkDurationMs.max <= 250);
  assert.ok(BIE_VILLAGE_ANOMALY.tearDurationMs.max <= 250);
  assert.ok(BIE_VILLAGE_ANOMALY.blockDurationMs.max <= 250);
  // disturbances are occasional, not constant
  assert.ok(BIE_VILLAGE_ANOMALY.tearIntervalMs.min >= 2000);
  assert.ok(BIE_VILLAGE_ANOMALY.blockIntervalMs.min >= 2000);
});

test("planned sparks, tears and blocks always stay inside the background", () => {
  const random = seeded(42);
  for (let round = 0; round < 500; round += 1) {
    for (const spark of planSparks(random, BIE_VILLAGE_ANOMALY)) {
      assert.ok(inside(spark.x, spark.y, spark.size, spark.size));
      assert.ok(BIE_VILLAGE_ANOMALY.sparkColors.includes(spark.color));
    }
    const tear = planTear(random, BIE_VILLAGE_ANOMALY, MAP);
    assert.ok(inside(0, tear.y, MAP.width, tear.height));
    assert.ok(Math.abs(tear.shift) >= BIE_VILLAGE_ANOMALY.tearShift.min && Math.abs(tear.shift) <= BIE_VILLAGE_ANOMALY.tearShift.max);
    const block = planBlock(random, BIE_VILLAGE_ANOMALY, MAP);
    assert.ok(inside(block.targetX, block.targetY, block.size, block.size));
    assert.ok(inside(block.sourceX, block.sourceY, block.size, block.size));
  }
});

test("hotspot picking follows the weights (the woodcutter house is the densest spot)", () => {
  const random = seeded(7);
  const counts = {};
  for (let i = 0; i < 10000; i += 1) {
    const id = pickHotspot(random, BIE_VILLAGE_ANOMALY.hotspots).id;
    counts[id] = (counts[id] ?? 0) + 1;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  assert.equal(top, "woodcutter_house");
  assert.equal(pickHotspot(() => 0, BIE_VILLAGE_ANOMALY.hotspots).id, BIE_VILLAGE_ANOMALY.hotspots[0].id);
  assert.equal(pickHotspot(() => 0.999999, BIE_VILLAGE_ANOMALY.hotspots).id, BIE_VILLAGE_ANOMALY.hotspots.at(-1).id);
});

test("villager glitch is noticeable but brief, stays next to the villager and targets an existing villager", () => {
  assert.ok(BIE_VILLAGER_GLITCH.durationMs.min >= 150, "long enough to notice");
  assert.ok(BIE_VILLAGER_GLITCH.durationMs.max <= 400, "a stutter, never a freeze");
  assert.ok(BIE_VILLAGER_GLITCH.shift.max <= 16, "the ghost stays next to the villager");
  assert.ok(BIE_VILLAGER_GLITCH.intervalMs.min >= 1500, "occasional, not constant");
  assert.ok(BIE_VILLAGER_GLITCH.jitterSteps >= 2 && BIE_VILLAGER_GLITCH.jitterSteps <= 4);
  for (let seed = 1; seed < 200; seed += 1) {
    let value = seed;
    const random = () => { value = (value * 16807) % 2147483647; return (value - 1) / 2147483646; };
    const plan = planVillagerGlitch(random, BIE_VILLAGER_GLITCH, 6);
    assert.ok(plan.index >= 0 && plan.index < 6);
    assert.ok(Math.abs(plan.shift) >= BIE_VILLAGER_GLITCH.shift.min && Math.abs(plan.shift) <= BIE_VILLAGER_GLITCH.shift.max);
    assert.ok(plan.durationMs >= BIE_VILLAGER_GLITCH.durationMs.min && plan.durationMs <= BIE_VILLAGER_GLITCH.durationMs.max);
    assert.ok(BIE_VILLAGER_GLITCH.ghostColors.includes(plan.color));
  }
  assert.equal(planVillagerGlitch(Math.random, BIE_VILLAGER_GLITCH, 0), undefined);
});
