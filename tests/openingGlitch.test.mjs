import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  OPENING_CORRUPTION_FRAGMENTS,
  OPENING_DEBUG_BOOT_LINES,
  OPENING_DEBUG_ERROR_LINES,
  OPENING_GLITCH_DURATION_MS,
  OPENING_GLITCH_STAGES,
} from "../src/config/openingGlitch.ts";

test("the hidden-program glitch lasts exactly five seconds", () => {
  assert.equal(OPENING_GLITCH_DURATION_MS, 5000);
});

test("stages follow boot, overlap, corruption, recovery, and a final pure-black hold", () => {
  assert.deepEqual(OPENING_GLITCH_STAGES.map((stage) => stage.id), [
    "boot", "debugOverlap", "corruption", "recovery", "blackOut",
  ]);
  assert.ok(OPENING_GLITCH_STAGES.every((stage) => stage.durationMs > 0));
  assert.equal(OPENING_GLITCH_STAGES.reduce((total, stage) => total + stage.durationMs, 0), OPENING_GLITCH_DURATION_MS);
  assert.equal(OPENING_GLITCH_STAGES.at(-1)?.durationMs, 400);
});

test("the visible text stays limited to short boot, error, and corrupted-data fragments", () => {
  const ids = OPENING_GLITCH_STAGES.map((stage) => stage.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(OPENING_DEBUG_BOOT_LINES.includes("> INIT_PLAYER..."));
  assert.ok(OPENING_DEBUG_BOOT_LINES.includes("> LOAD_MAP..."));
  assert.ok(OPENING_DEBUG_ERROR_LINES.includes("> DATA MISMATCH"));
  assert.ok(OPENING_CORRUPTION_FRAGMENTS.includes("???"));
});

test("the glitch scene does not load or render RPG artwork, people, or a title", () => {
  const sceneSource = readFileSync(new URL("../src/scenes/OpeningGlitchScene.ts", import.meta.url), "utf8");

  for (const prohibitedFragment of [
    "preloadWalkSprite",
    "PROTAGONIST_SPRITE",
    "sourceMap",
    "sourceNpc",
    "add.image",
    "add.sprite",
    "ＭＱ ０",
    "MONSTER QUEST 0",
  ]) {
    assert.equal(sceneSource.includes(prohibitedFragment), false, prohibitedFragment);
  }
});
