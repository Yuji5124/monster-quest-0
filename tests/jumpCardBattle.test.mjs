import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_JUMP_CARD_BATTLE_ID, getJumpCardBattle } from "../src/config/jumpCardBattles.ts";
import {
  JUMP_CARD_BATTLE_PRESENTATION,
  formatJumpCardBattleClock,
  formatJumpCardBattleDistance,
} from "../src/config/jumpCardBattlePresentation.ts";
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

test("the 42.195 km dash presentation remains view-only and formats a live record", () => {
  assert.equal(JUMP_CARD_BATTLE_PRESENTATION.dashDistanceKm, 42.195);
  assert.deepEqual(JUMP_CARD_BATTLE_PRESENTATION.beatProgressKm, [10.548, 21.097, 31.646]);
  assert.equal(formatJumpCardBattleDistance(10.5), "10.500 / 42.195 km");
  assert.equal(formatJumpCardBattleClock(2_340), "00:02.3");
  assert.equal(formatJumpCardBattleClock(-1), "00:00.0");
});
