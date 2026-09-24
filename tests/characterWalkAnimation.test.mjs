import assert from "node:assert/strict";
import test from "node:test";
import { walkFrames } from "../src/config/characterWalkSprite.ts";
import { PROTAGONIST_SPRITE } from "../src/config/protagonistSprite.ts";
import { TAROSA_SPRITE } from "../src/config/tarosaSprite.ts";
import { MIREI_SPRITE } from "../src/config/mireiSprite.ts";

test("the protagonist walk keeps the three-pose yoyo cycle but advances at a smooth, movement-matched rate", () => {
  assert.deepEqual(walkFrames("down"), [0, 1, 2]);
  assert.deepEqual(walkFrames("left"), [3, 4, 5]);
  assert.deepEqual(walkFrames("right"), [6, 7, 8]);
  assert.deepEqual(walkFrames("up"), [9, 10, 11]);
  assert.equal(PROTAGONIST_SPRITE.walkFrameRate, 12);
});

test("party members retain their existing walk tempo", () => {
  assert.equal(TAROSA_SPRITE.walkFrameRate, 7);
  assert.equal(MIREI_SPRITE.walkFrameRate, 7);
});
