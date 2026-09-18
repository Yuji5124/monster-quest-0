import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { DEV_BATTLE_PLAYER, readDevBattleMonsterId } from "../src/config/battle.ts";
import { calculateDamage, BattleSystem } from "../src/battle/BattleSystem.ts";
import { DEV_BATTLE_MONSTERS, getDevBattleMonster } from "../src/data/monsters.ts";

test("both DEV battle monsters have usable images and positive DEV stats", () => {
  for (const monster of [DEV_BATTLE_MONSTERS["003"], DEV_BATTLE_MONSTERS["006"]]) {
    assert.match(monster.displayName, /^MONSTER 00[36]$/);
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
  const battle = new BattleSystem({ ...DEV_BATTLE_PLAYER, attack: 99 }, DEV_BATTLE_MONSTERS["003"]);
  const playerHp = battle.getSnapshot().player.hp;
  battle.confirm();
  assert.equal(battle.getSnapshot().enemy.hp, 0);
  assert.equal(battle.getSnapshot().player.hp, playerHp);
  battle.confirm();
  assert.equal(battle.getSnapshot().state, "VICTORY");
  assert.equal(battle.getSnapshot().player.hp, playerHp);
});

test("a player at zero HP reaches DEFEAT", () => {
  const battle = new BattleSystem({ ...DEV_BATTLE_PLAYER, maxHp: 1, defense: 0 }, { ...DEV_BATTLE_MONSTERS["003"], attack: 9 });
  battle.confirm();
  battle.confirm();
  assert.equal(battle.getSnapshot().player.hp, 0);
  assert.equal(battle.getSnapshot().state, "DEFEAT");
});

test("invalid battle query safely chooses monster 003", () => {
  assert.equal(readDevBattleMonsterId("?battleTest=003"), "003");
  assert.equal(readDevBattleMonsterId("?battleTest=006"), "006");
  assert.equal(readDevBattleMonsterId("?battleTest=invalid"), "003");
  assert.equal(getDevBattleMonster("unknown"), undefined);
});
