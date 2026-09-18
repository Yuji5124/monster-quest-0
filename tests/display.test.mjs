import assert from "node:assert/strict";
import test from "node:test";
import { BASE_HEIGHT, BASE_WIDTH, DISPLAY, SCALE_FACTOR } from "../src/config/display.ts";

test("render resolution is the base resolution scaled by SCALE_FACTOR", () => {
  assert.equal(DISPLAY.width, BASE_WIDTH * SCALE_FACTOR);
  assert.equal(DISPLAY.height, BASE_HEIGHT * SCALE_FACTOR);
});

test("resolution is 960x720 and keeps the 4:3 aspect ratio", () => {
  assert.equal(DISPLAY.width, 960);
  assert.equal(DISPLAY.height, 720);
  assert.equal(DISPLAY.width / DISPLAY.height, BASE_WIDTH / BASE_HEIGHT);
});
