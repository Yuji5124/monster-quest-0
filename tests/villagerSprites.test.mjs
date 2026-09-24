import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { VILLAGER_SPRITES } from "../src/config/villagerSprites.ts";

test("all supplied villager appearances resolve to normalized 3-by-4 runtime sheets", () => {
  const entries = Object.entries(VILLAGER_SPRITES);
  assert.equal(entries.length, 10);
  for (const [id, sprite] of entries) {
    assert.match(id, /^villager_\d{2}$/);
    assert.equal(sprite.frameWidth, 70);
    assert.equal(sprite.frameHeight, 70);
    assert.equal(sprite.baselineY, 67);
    assert.ok(existsSync(new URL(sprite.path)), `${id} runtime sheet is missing`);
  }
});
