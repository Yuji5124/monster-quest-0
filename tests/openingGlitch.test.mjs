import assert from "node:assert/strict";
import test from "node:test";
import {
  OPENING_GLITCH_DURATION_MS,
  OPENING_GLITCH_STAGES,
} from "../src/config/openingGlitch.ts";

test("duration is approximately 5 seconds", () => {
  assert.ok(OPENING_GLITCH_DURATION_MS >= 4000 && OPENING_GLITCH_DURATION_MS <= 6000);
});

test("stages cover 0..1 with no gaps or overlaps, in order", () => {
  assert.equal(OPENING_GLITCH_STAGES[0].startRatio, 0);
  assert.equal(OPENING_GLITCH_STAGES[OPENING_GLITCH_STAGES.length - 1].endRatio, 1);
  for (let i = 0; i < OPENING_GLITCH_STAGES.length; i += 1) {
    const stage = OPENING_GLITCH_STAGES[i];
    assert.ok(stage.endRatio > stage.startRatio);
    if (i > 0) {
      assert.equal(stage.startRatio, OPENING_GLITCH_STAGES[i - 1].endRatio);
    }
  }
});

test("stage ids are unique", () => {
  const ids = OPENING_GLITCH_STAGES.map((stage) => stage.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("blackIn is first and blackOut is last (starts and ends in darkness)", () => {
  assert.equal(OPENING_GLITCH_STAGES[0].id, "blackIn");
  assert.equal(OPENING_GLITCH_STAGES[OPENING_GLITCH_STAGES.length - 1].id, "blackOut");
});
