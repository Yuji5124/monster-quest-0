import assert from "node:assert/strict";
import test from "node:test";
import { BattleSystem } from "../src/battle/BattleSystem.ts";
import { NORMAL_ATTACK, MAGIC_LIFE, MAGIC_RELIFE } from "../src/data/battleActions.ts";
import { ITEM_DEFINITIONS } from "../src/data/items.ts";

function ally(id, overrides = {}) {
  return { id, displayName: id, maxHp: 100, maxMp: 30, attack: 20, defense: 5, ...overrides };
}

test("each living party member gets a COMMAND turn before the enemy acts", () => {
  const party = [ally("a"), ally("b"), ally("c")];
  const enemy = { id: "enemy", displayName: "てき", maxHp: 999, attack: 0, defense: 0, enemyActions: [NORMAL_ATTACK] };
  // random()=>1 never triggers だいヒット (BattleSystem.ts), so the exact damage below stays predictable.
  const battle = new BattleSystem(party, enemy, () => 1);
  assert.equal(battle.getSnapshot().actingIndex, 0);
  battle.confirm("fight"); // a acts
  let s = battle.confirm(); // advance to b's COMMAND
  assert.equal(s.state, "COMMAND");
  assert.equal(s.actingIndex, 1);
  battle.confirm("fight"); // b acts
  s = battle.confirm(); // advance to c's COMMAND
  assert.equal(s.state, "COMMAND");
  assert.equal(s.actingIndex, 2);
  battle.confirm("fight"); // c acts -> now the enemy should finally act
  s = battle.confirm();
  assert.equal(s.state, "ENEMY_ACTION");
  assert.equal(s.enemy.hp, 999 - 20 * 3);
});

test("a KO'd party member is skipped and the battle only ends in DEFEAT once everyone is down", () => {
  const party = [ally("a", { maxHp: 1 }), ally("b")];
  const enemy = { id: "enemy", displayName: "てき", maxHp: 999, attack: 150, defense: 0, isBoss: true, enemyActions: [NORMAL_ATTACK] };
  // random()=>0 always targets the first living member, so "a" dies first, then "b".
  const battle = new BattleSystem(party, enemy, () => 0);
  battle.confirm("fight");
  battle.confirm();
  battle.confirm("fight");
  let s = battle.confirm(); // enemy attacks "a" (first living) for 50 -> dead
  assert.equal(s.party[0].hp, 0);
  assert.equal(s.state, "ENEMY_ACTION");
  s = battle.confirm(); // start next round
  assert.equal(s.state, "COMMAND");
  assert.equal(s.actingIndex, 1, "the dead member must be skipped; index 1 (b) acts next");
  battle.confirm("fight");
  s = battle.confirm(); // enemy attacks the only living member "b"
  assert.equal(s.party[1].hp, 0);
  assert.equal(s.state, "DEFEAT", "the whole party is down, not just one member");
});

test("ライフ auto-targets the lowest-HP living ally, not the caster", () => {
  const healer = ally("healer", { maxHp: 100, maxMp: 30, learnedMagic: [MAGIC_LIFE] });
  const hurt = ally("hurt", { maxHp: 100, defense: 5 });
  const enemy = { id: "enemy", displayName: "てき", maxHp: 999, attack: 30, defense: 0, enemyActions: [NORMAL_ATTACK] };
  // random()=>0.99 targets the *last* living member each enemy turn, i.e. "hurt".
  const battle = new BattleSystem([healer, hurt], enemy, () => 0.99);
  battle.confirm("fight"); // healer's turn
  battle.confirm();
  battle.confirm("fight"); // hurt's turn
  let s = battle.confirm(); // enemy hits "hurt" for 25
  assert.equal(s.party[1].hp, 75);
  s = battle.confirm(); // start next round; healer acts first
  assert.equal(s.actingIndex, 0);
  s = battle.confirm("magic", MAGIC_LIFE.id);
  assert.equal(s.party[0].hp, 100, "the healer itself is untouched");
  assert.equal(s.party[1].hp, 100, "the lower-HP ally receives the heal instead (capped at max HP)");
});

test("リライフ revives a fallen ally at the configured HP percentage", () => {
  const fallen = ally("fallen", { maxHp: 20, defense: 0 });
  const reviver = ally("reviver", { maxHp: 200, maxMp: 30, learnedMagic: [MAGIC_RELIFE] });
  const enemy = { id: "enemy", displayName: "てき", maxHp: 999, attack: 25, defense: 0, enemyActions: [NORMAL_ATTACK] };
  const battle = new BattleSystem([fallen, reviver], enemy, () => 0); // always targets the first living member
  battle.confirm("fight"); // fallen's turn
  battle.confirm();
  battle.confirm("fight"); // reviver's turn
  let s = battle.confirm(); // enemy attacks fallen (first living) -> KO
  assert.equal(s.party[0].hp, 0);
  assert.equal(s.state, "ENEMY_ACTION");
  s = battle.confirm(); // start round 2; fallen is dead, so reviver (index1) acts first
  assert.equal(s.state, "COMMAND");
  assert.equal(s.actingIndex, 1);
  s = battle.confirm("magic", MAGIC_RELIFE.id);
  assert.equal(s.party[0].hp, Math.round(20 * MAGIC_RELIFE.reviveHpPercent));
  assert.equal(s.state, "PLAYER_ACTION");
});

test("a valid battle item resolves through the real ITEM_DEFINITIONS (かいふくやく heals for its confirmed power)", () => {
  assert.equal(ITEM_DEFINITIONS.kaifukuyaku.power, 25, "HP25前後というユーザー確定値");
  const hero = ally("hero", { maxHp: 100, attack: 1, defense: 0 });
  const enemy = { id: "enemy", displayName: "てき", maxHp: 999, attack: 40, defense: 0, enemyActions: [NORMAL_ATTACK] };
  // random()=>1 never triggers だいヒット (BattleSystem.ts), so the exact damage below stays predictable.
  const battle = new BattleSystem(hero, enemy, () => 1);
  battle.confirm("fight");
  let s = battle.confirm(); // enemy hits hero for 40 -> hp 60
  assert.equal(s.player.hp, 60);
  s = battle.confirm(); // start round 2
  s = battle.confirm("item", undefined, "kaifukuyaku");
  assert.match(s.message, /かいふくした/);
  assert.equal(s.state, "PLAYER_ACTION");
  assert.equal(s.player.hp, 60 + 25, "かいふくやくは終盤HPを一撃全快させない小さな回復量");
});
