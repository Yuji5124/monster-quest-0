import assert from "node:assert/strict";
import test from "node:test";
import { JUMP_CARD_GACHA_PRESENTATION } from "../src/config/jumpCardGachaPresentation.ts";

test("jump card coin presentation keeps the card hidden for about five seconds", () => {
  assert.equal(JUMP_CARD_GACHA_PRESENTATION.totalDurationMs, 5_000);
  assert.ok(JUMP_CARD_GACHA_PRESENTATION.instructionHoldMs < JUMP_CARD_GACHA_PRESENTATION.coinInsertStartMs);
  assert.ok(JUMP_CARD_GACHA_PRESENTATION.coinInsertStartMs < JUMP_CARD_GACHA_PRESENTATION.finalFlashStartMs);
  assert.ok(JUMP_CARD_GACHA_PRESENTATION.finalFlashStartMs < JUMP_CARD_GACHA_PRESENTATION.totalDurationMs);
});
