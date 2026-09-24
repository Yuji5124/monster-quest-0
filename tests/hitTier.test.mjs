import assert from "node:assert/strict";
import test from "node:test";
import { BattleSystem, DAI_HIT_MULTIPLIER, TOKUDAI_HIT_MULTIPLIER } from "../src/battle/BattleSystem.ts";
import { NORMAL_ATTACK } from "../src/data/battleActions.ts";

// BATTLE_SPEC.md §5/§6/§13: 表示は「だいヒット」「とくだいヒット」のみで、「クリティカル」「会心」は使わない。
// 発生率・倍率はTBDのためTEMP_TEST_VALUE(BattleSystem.tsのDAI_HIT_RATE等)を使い、ここではその
// 定数を直接検証する(最終値の断定はしない)。

function combatant(id, overrides = {}) {
  return { id, displayName: id, maxHp: 999, maxMp: 0, attack: 20, defense: 0, enemyActions: [NORMAL_ATTACK], ...overrides };
}

test("だいヒット: a forced roll multiplies attack damage and shows the confirmed BATTLE_SPEC.md message text", () => {
  const attacker = combatant("hero");
  const enemy = combatant("enemy");
  // random()=>0 always beats any TEMP_TEST_VALUE rate in (0, 1).
  const battle = new BattleSystem(attacker, enemy, () => 0);
  const s = battle.confirm("fight");
  assert.match(s.message, /だいヒット/);
  assert.doesNotMatch(s.message, /(critical|Critical|CRITICAL|クリティカル|会心)/);
  assert.equal(s.enemy.hp, enemy.maxHp - Math.round(20 * DAI_HIT_MULTIPLIER));
});

test("だいヒット: a roll at/above the rate never triggers, and damage/message stay ordinary", () => {
  const attacker = combatant("hero");
  const enemy = combatant("enemy");
  // random()=>1 never beats any rate below 1.
  const battle = new BattleSystem(attacker, enemy, () => 1);
  const s = battle.confirm("fight");
  assert.doesNotMatch(s.message, /だいヒット/);
  assert.equal(s.enemy.hp, enemy.maxHp - 20);
});

test("とくだいヒット: only a combatant flagged canUseTokudaiHit (ワタベ想定) can trigger it, and it out-damages だいヒット", () => {
  const watabeLike = combatant("watabe", { canUseTokudaiHit: true });
  const enemy = combatant("enemy");
  const battle = new BattleSystem(watabeLike, enemy, () => 0);
  const s = battle.confirm("fight");
  assert.match(s.message, /とくだいヒット/);
  assert.equal(s.enemy.hp, enemy.maxHp - Math.round(20 * TOKUDAI_HIT_MULTIPLIER));
  assert.ok(TOKUDAI_HIT_MULTIPLIER > DAI_HIT_MULTIPLIER, "BATTLE_SPEC.md §6: とくだいヒットはだいヒットより強い特別な攻撃");
});

test("とくだいヒット: hero/tarosa/mirei-shaped combatants without the flag fall back to plain だいヒット, never とくだいヒット", () => {
  const hero = combatant("hero"); // 現状どの正式パーティメンバーにもcanUseTokudaiHitは設定しない
  const enemy = combatant("enemy");
  const battle = new BattleSystem(hero, enemy, () => 0);
  const s = battle.confirm("fight");
  assert.match(s.message, /だいヒット/);
  assert.doesNotMatch(s.message, /とくだいヒット/);
});

test("とくだいヒット: an enemy without the flag can never trigger it on its own attack either", () => {
  const hero = combatant("hero", { maxHp: 500 });
  const enemy = combatant("enemy", { attack: 20, defense: 0 });
  const battle = new BattleSystem(hero, enemy, () => 0);
  battle.confirm("fight");
  const s = battle.confirm(); // enemy's counterattack
  assert.doesNotMatch(s.message, /とくだいヒット/);
});
