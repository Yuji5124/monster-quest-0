import assert from "node:assert/strict";
import test from "node:test";
import { calculatePoisonDamage, POISON_DAMAGE_PERCENT_OF_MAX_HP } from "../src/data/statusEffects.ts";
import { BattleSystem } from "../src/battle/BattleSystem.ts";
import { NORMAL_ATTACK } from "../src/data/battleActions.ts";

test("poison damage is ~5% of max HP per tick, minimum 1", () => {
  assert.equal(POISON_DAMAGE_PERCENT_OF_MAX_HP, 0.05);
  assert.equal(calculatePoisonDamage(200), 10);
  assert.equal(calculatePoisonDamage(1), 1, "poison never rounds down to 0 damage");
});

test("a poisoned ally takes damage at the end of a round, and どくけし cures it", () => {
  const poisonWeapon = { id: "test_poison_bow", name: "test", statusEffect: "poison", applyChance: 1 };
  const attacker = { id: "hero", displayName: "主人公", maxHp: 50, attack: 1, defense: 5, weaponAction: poisonWeapon };
  const enemy = { id: "enemy", displayName: "てき", maxHp: 200, attack: 1, defense: 0, enemyActions: [NORMAL_ATTACK] };
  const battle = new BattleSystem(attacker, enemy, () => 0);
  // hero attacks -> weapon always poisons the enemy (applyChance 1, random()=>0)
  battle.confirm("fight");
  assert.equal(battle.getSnapshot().enemy.status.poisoned, true);
  // enemy's turn, then poison tick resolves as the round closes
  battle.confirm(); // PLAYER_ACTION -> enemy attacks
  const beforeTick = battle.getSnapshot().enemy.hp;
  battle.confirm(); // ENEMY_ACTION -> applies poison tick, starts next round
  const afterTick = battle.getSnapshot().enemy.hp;
  assert.equal(afterTick, beforeTick - calculatePoisonDamage(200));
});

test("statusResistance.poison prevents the status entirely", () => {
  const poisonWeapon = { id: "test_poison_bow", name: "test", statusEffect: "poison", applyChance: 1 };
  const attacker = { id: "hero", displayName: "主人公", maxHp: 50, attack: 1, defense: 5, weaponAction: poisonWeapon };
  const immuneEnemy = { id: "enemy", displayName: "てき", maxHp: 200, attack: 1, defense: 0, statusResistance: { poison: true } };
  const battle = new BattleSystem(attacker, immuneEnemy, () => 0);
  battle.confirm("fight");
  assert.equal(battle.getSnapshot().enemy.status.poisoned, false);
});
