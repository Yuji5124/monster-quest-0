import assert from "node:assert/strict";
import test from "node:test";
import { canInteract, facingZone } from "../src/systems/Interaction.ts";

const REACH = 8;
const SPAN = 12;

test("player facing an adjacent target to the right can interact", () => {
  const player = { x: 100, y: 100 };
  const target = { x: 105, y: 93, width: 12, height: 16 };
  assert.equal(canInteract(player, "right", target, REACH, SPAN), true);
});

test("player facing away from an adjacent target cannot interact", () => {
  const player = { x: 100, y: 100 };
  const target = { x: 105, y: 93, width: 12, height: 16 };
  assert.equal(canInteract(player, "left", target, REACH, SPAN), false);
});

test("a target far away cannot be interacted with", () => {
  const player = { x: 100, y: 100 };
  const target = { x: 300, y: 93, width: 12, height: 16 };
  assert.equal(canInteract(player, "right", target, REACH, SPAN), false);
});

test("facing up/down resolve independently of left/right", () => {
  const player = { x: 100, y: 100 };
  const below = { x: 94, y: 105, width: 12, height: 16 };
  assert.equal(canInteract(player, "down", below, REACH, SPAN), true);
  assert.equal(canInteract(player, "up", below, REACH, SPAN), false);
});

test("facingZone stays centered on the span axis", () => {
  const zone = facingZone({ x: 50, y: 50 }, "right", REACH, SPAN);
  assert.deepEqual(zone, { x: 50, y: 50 - SPAN / 2, width: REACH, height: SPAN });
});
