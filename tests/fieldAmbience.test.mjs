import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { FIELD_AMBIENCE_BY_MAP, FIELD_AMBIENCE_DEPTH, FIELD_AMBIENCE_PROFILES } from "../src/config/fieldAmbience.ts";
import { MAPS } from "../src/config/maps.ts";
import {
  WRAP_MARGIN,
  advanceMote,
  createMote,
  gustStrengthAt,
  planGust,
  poseMote,
  scaledCount,
  wrap,
} from "../src/systems/FieldAmbiencePlan.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VIEW = { width: 960, height: 720 };

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

const rangeKeys = ["size", "alpha", "velocityX", "velocityY", "swayAmplitude", "swayPeriodMs", "twinklePeriodMs"];

test("field ambience profiles stay subtle and have ordered ranges", () => {
  for (const profile of Object.values(FIELD_AMBIENCE_PROFILES)) {
    for (const mote of profile.motes) {
      for (const key of rangeKeys) assert.ok(mote[key].min <= mote[key].max, `${profile.id}.${mote.kind}.${key}`);
      assert.ok(mote.alpha.max <= 0.9, `${profile.id} motes must stay faint`);
      assert.ok(mote.count > 0 && mote.count <= 16, `${profile.id} mote count stays small for iPhone`);
      assert.ok(mote.colors.length > 0);
    }
    if (profile.cloudShadows) {
      assert.ok(profile.cloudShadows.alpha.max <= 0.2, `${profile.id} cloud shadows must be thin`);
      assert.ok(profile.cloudShadows.count <= 4);
    }
    if (profile.mist) assert.ok(profile.mist.alpha.max <= 0.12, `${profile.id} mist must be thin`);
    if (profile.sunRays) assert.ok(profile.sunRays.alpha.max <= 0.14, `${profile.id} sun rays must be thin`);
    if (profile.gusts) assert.ok(profile.gusts.intervalMs.min >= 5000, "gusts are occasional, not constant");
  }
});

test("field ambience is assigned only to known outdoor/indoor walking maps, not caves or tower", () => {
  for (const mapId of Object.keys(FIELD_AMBIENCE_BY_MAP)) assert.ok(MAPS[mapId], `${mapId} must be a MapId`);
  for (const mapId of ["map_iwayama_cave_1", "map_iwayama_cave_2", "map_08_majin_cave", "map_mysterious_tower_1f"]) {
    assert.equal(FIELD_AMBIENCE_BY_MAP[mapId], undefined, `${mapId} keeps its own dark mood`);
  }
});

test("field ambience draws above characters but below DEV text, dialogue and menu", () => {
  for (const depth of Object.values(FIELD_AMBIENCE_DEPTH)) {
    assert.ok(depth > 1000 && depth < 1900, `depth ${depth}`);
  }
});

test("wrap keeps values inside the span, including negatives", () => {
  assert.equal(wrap(5, 10), 5);
  assert.equal(wrap(12, 10), 2);
  assert.equal(wrap(-3, 10), 7);
  assert.equal(scaledCount(14, 0.6), 8);
  assert.equal(scaledCount(4, 0), 0);
});

test("motes always stay within the screen plus margin while drifting and scrolling", () => {
  const random = seeded(7);
  for (const config of [FIELD_AMBIENCE_PROFILES.forest.motes[0], FIELD_AMBIENCE_PROFILES.meadow.motes[0]]) {
    const mote = createMote(random, config, VIEW);
    for (let step = 0; step < 600; step += 1) {
      advanceMote(mote, 16, step % 200 < 60 ? 40 : 0, 1);
      const pose = poseMote(mote, step * 16, step * 3.7, -step * 2.1, config.parallax, VIEW);
      assert.ok(pose.x >= -WRAP_MARGIN && pose.x < VIEW.width + WRAP_MARGIN, `x ${pose.x}`);
      assert.ok(pose.y >= -WRAP_MARGIN && pose.y < VIEW.height + WRAP_MARGIN, `y ${pose.y}`);
      assert.ok(pose.alpha >= 0 && pose.alpha <= config.alpha.max);
    }
  }
});

test("gusts rise and settle smoothly and are zero outside their window", () => {
  const plan = planGust(seeded(3), FIELD_AMBIENCE_PROFILES.meadow.gusts);
  assert.equal(gustStrengthAt(-1, plan), 0);
  assert.equal(gustStrengthAt(plan.durationMs, plan), 0);
  const peak = Math.abs(gustStrengthAt(plan.durationMs / 2, plan));
  assert.ok(Math.abs(peak - plan.strength) < 1e-9);
  assert.ok(Math.abs(gustStrengthAt(plan.durationMs * 0.1, plan)) < peak);
});

test("walking-map scenes start the field ambience", () => {
  for (const file of ["StartingPlaceScene", "StartingTownScene", "StartingForestScene", "BieVillageScene", "RainlandForestScene"]) {
    const source = readFileSync(path.join(REPO_ROOT, `src/scenes/${file}.ts`), "utf-8");
    assert.match(source, /startFieldAmbience\(this, (MAP_ID|mapId)\)/, file);
  }
});
