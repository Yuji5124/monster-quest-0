import assert from "node:assert/strict";
import test from "node:test";
import { JUMP_CARD_GACHA_PRESENTATION } from "../src/config/jumpCardGachaPresentation.ts";

test("jump card rare presentation runs coin insert then turn and hides the card for about six seconds", () => {
  const p = JUMP_CARD_GACHA_PRESENTATION;
  assert.equal(p.totalDurationMs, 6_000);
  const order = [
    p.coinShowStartMs,
    p.coinPushStartMs,
    p.coinDropMs,
    p.turnStartMs,
    ...p.turnClickMs,
    p.rareGlowStartMs,
    p.finalFlashStartMs,
    p.totalDurationMs,
  ];
  for (let i = 1; i < order.length; i += 1) assert.ok(order[i - 1] < order[i], `timeline step ${i} out of order`);
  assert.equal(p.turnClickMs.length, 3);
});
