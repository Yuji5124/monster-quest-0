import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { DEV_BATTLE_PLAYER, readDevBattleMonsterId } from "../src/config/battle.ts";
import { calculateDamage, BattleSystem, rollBattleReward } from "../src/battle/BattleSystem.ts";
import { DEV_BATTLE_MONSTERS, getDevBattleMonster } from "../src/data/monsters.ts";
import { MAGIC_HEAT } from "../src/data/battleActions.ts";

test("starting-forest enemies keep their confirmed names, assets, and DEV stats", () => {
  assert.equal(DEV_BATTLE_MONSTERS["001"].displayName, "たまゴースト");
  assert.equal(DEV_BATTLE_MONSTERS["003"].displayName, "プリン");
  for (const monster of [DEV_BATTLE_MONSTERS["001"], DEV_BATTLE_MONSTERS["003"], DEV_BATTLE_MONSTERS["006"]]) {
    assert.ok(monster.maxHp > 0 && monster.attack > 0 && monster.defense >= 0);
    const url = new URL(monster.portraitUrl);
    assert.ok(existsSync(url));
    const bytes = readFileSync(url);
    assert.ok(bytes.length > 0);
  }
});

test("damage is deterministic and has a minimum of one", () => {
  assert.equal(calculateDamage({ attack: 8 }, { defense: 3 }), 5);
  assert.equal(calculateDamage({ attack: 1 }, { defense: 99 }), 1);
});

test("battle state advances command, player action, enemy action, and command", () => {
  const battle = new BattleSystem(DEV_BATTLE_PLAYER, DEV_BATTLE_MONSTERS["006"]);
  assert.equal(battle.getSnapshot().state, "COMMAND");
  battle.confirm(); assert.equal(battle.getSnapshot().state, "PLAYER_ACTION");
  battle.confirm(); assert.equal(battle.getSnapshot().state, "ENEMY_ACTION");
  battle.confirm(); assert.equal(battle.getSnapshot().state, "COMMAND");
});

test("a defeated enemy does not counterattack and reaches VICTORY after acknowledgement", () => {
  const battle = new BattleSystem({ ...DEV_BATTLE_PLAYER, attack: 99 }, DEV_BATTLE_MONSTERS["003"], () => 0);
  const playerHp = battle.getSnapshot().player.hp;
  battle.confirm();
  assert.equal(battle.getSnapshot().enemy.hp, 0);
  assert.equal(battle.getSnapshot().player.hp, playerHp);
  battle.confirm();
  assert.equal(battle.getSnapshot().state, "VICTORY");
  assert.equal(battle.getSnapshot().player.hp, playerHp);
  assert.deepEqual(battle.getSnapshot().reward, { experience: 8, money: 3, itemId: "dokukeshi" });
  assert.match(battle.getSnapshot().message, /8 EXPと　3G/);
});

test("battle rewards sanitize values and make an item drop probabilistic through an injected roll", () => {
  const definition = { experience: 3.9, money: -2, drops: [{ itemId: "kaifukuyaku", chance: 0.25 }] };
  assert.deepEqual(rollBattleReward(definition, () => 0.24), { experience: 3, money: 0, itemId: "kaifukuyaku" });
  assert.deepEqual(rollBattleReward(definition, () => 0.25), { experience: 3, money: 0 });
});

test("a player at zero HP reaches DEFEAT", () => {
  const battle = new BattleSystem({ ...DEV_BATTLE_PLAYER, maxHp: 1, defense: 0 }, { ...DEV_BATTLE_MONSTERS["003"], attack: 9 });
  battle.confirm();
  battle.confirm();
  assert.equal(battle.getSnapshot().player.hp, 0);
  assert.equal(battle.getSnapshot().state, "DEFEAT");
});

test("ヒート deals damage through the generic magic_damage pipeline and spends its MP (MAGIC_SPEC.md §5.1)", () => {
  const caster = { id: "hero", displayName: "主人公", maxHp: 50, maxMp: 20, attack: 5, defense: 0, learnedMagic: [MAGIC_HEAT] };
  const enemy = { id: "enemy", displayName: "てき", maxHp: 999, attack: 0, defense: 0 };
  const battle = new BattleSystem(caster, enemy, () => 1); // no だいヒット interference; magic damage never crits
  const s = battle.confirm("magic", MAGIC_HEAT.id);
  assert.match(s.message, /ヒート/);
  assert.equal(s.enemy.hp, enemy.maxHp - MAGIC_HEAT.power);
  assert.equal(s.player.mp, caster.maxMp - MAGIC_HEAT.mpCost);
});

test("invalid battle query safely chooses monster 003", () => {
  assert.equal(readDevBattleMonsterId("?battleTest=003"), "003");
  assert.equal(readDevBattleMonsterId("?battleTest=006"), "006");
  assert.equal(readDevBattleMonsterId("?battleTest=invalid"), "003");
  assert.equal(getDevBattleMonster("unknown"), undefined);
});
