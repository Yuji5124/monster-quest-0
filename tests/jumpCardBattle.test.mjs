import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_JUMP_CARD_BATTLE_ID, getJumpCardBattle } from "../src/config/jumpCardBattles.ts";
import { getJumpCardDefinition } from "../src/data/jumpCards.ts";
import { canStartJumpCardBattle, resolveJanken } from "../src/systems/JumpCardBattle.ts";

test("the first card battle is a one-round Pudding mirror match gated by the owned card", () => {
  const battle = getJumpCardBattle(DEFAULT_JUMP_CARD_BATTLE_ID);
  assert.ok(battle);
  assert.equal(battle.rounds, 1);
  assert.equal(battle.requiredPlayerCardId, "card_01");
  assert.equal(battle.opponentCardId, "card_01");
  assert.equal(getJumpCardDefinition(battle.requiredPlayerCardId)?.name, "プリン");
  assert.equal(getJumpCardDefinition(battle.opponentCardId)?.name, "プリン");
  assert.equal(canStartJumpCardBattle(battle, []), false);
  assert.equal(canStartJumpCardBattle(battle, ["card_01"]), true);
  assert.equal(canStartJumpCardBattle(battle, ["card_02", "card_01"]), true);
});

test("janken resolves every pose correctly and repeats only on a tie", () => {
  assert.equal(resolveJanken("rock", "rock"), "tie");
  assert.equal(resolveJanken("scissors", "scissors"), "tie");
  assert.equal(resolveJanken("paper", "paper"), "tie");
  assert.equal(resolveJanken("rock", "scissors"), "player");
  assert.equal(resolveJanken("scissors", "paper"), "player");
  assert.equal(resolveJanken("paper", "rock"), "player");
  assert.equal(resolveJanken("scissors", "rock"), "opponent");
  assert.equal(resolveJanken("paper", "scissors"), "opponent");
  assert.equal(resolveJanken("rock", "paper"), "opponent");
});
