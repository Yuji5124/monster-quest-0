import assert from "node:assert/strict";
import test from "node:test";
import { MONSTER_ROSTER, MONSTER_ROSTER_BY_ID, DEV_BATTLE_MONSTERS } from "../src/data/monsters.ts";
import { BATORASU, OROCHI_MAOU, MAJIN } from "../src/data/bosses.ts";

// モンスター25体のHP/攻撃/防御/素早さ/EXP/ゴールドの正本テスト(2026-09-23ユーザー確定)。
// docs/MONSTER_SPEC.mdの表と一致させる。

test("モンスターが25体存在する", () => {
  assert.equal(MONSTER_ROSTER.length, 25);
  const rosterIds = new Set(MONSTER_ROSTER.map((m) => m.rosterId));
  assert.equal(rosterIds.size, 25, "roster番号に重複がない");
  const ids = new Set(MONSTER_ROSTER.map((m) => m.id));
  assert.equal(ids.size, 25, "コードIDに重複がない");
});

test("全25体のHPは0より大きい", () => {
  for (const monster of MONSTER_ROSTER) {
    assert.ok(monster.hp > 0, `${monster.name}のHPは0より大きい`);
  }
});

test("全25体のattack / defense / speedは有効な数値(0以上の有限数)", () => {
  for (const monster of MONSTER_ROSTER) {
    for (const key of ["attack", "defense", "speed"]) {
      const value = monster[key];
      assert.ok(Number.isFinite(value) && value >= 0, `${monster.name}の${key}は有効な数値`);
    }
  }
});

test("全25体のexp / goldは0以上", () => {
  for (const monster of MONSTER_ROSTER) {
    assert.ok(Number.isFinite(monster.exp) && monster.exp >= 0, `${monster.name}のexpは0以上`);
    assert.ok(Number.isFinite(monster.gold) && monster.gold >= 0, `${monster.name}のgoldは0以上`);
  }
});

test("オロチまおうのgoldは0", () => {
  assert.equal(MONSTER_ROSTER_BY_ID.orochi_maou.gold, 0);
});

test("オロチゾンビのexpは0、goldは0", () => {
  assert.equal(MONSTER_ROSTER_BY_ID.orochi_zombie.exp, 0);
  assert.equal(MONSTER_ROSTER_BY_ID.orochi_zombie.gold, 0);
});

test("オロチゾンビのpublicNameは？？？(公開ネタバレを伏せる)", () => {
  assert.equal(MONSTER_ROSTER_BY_ID.orochi_zombie.publicName, "？？？");
  assert.equal(MONSTER_ROSTER_BY_ID.orochi_zombie.name, "オロチゾンビ", "内部正式名はオロチゾンビのまま保持する");
  assert.ok(MONSTER_ROSTER_BY_ID.orochi_zombie.spoiler);
});

test("メタルプリンキングのspeed=72 / defense=180", () => {
  assert.equal(MONSTER_ROSTER_BY_ID.metal_purin_king.speed, 72);
  assert.equal(MONSTER_ROSTER_BY_ID.metal_purin_king.defense, 180);
});

test("バトラスのHP=2200 / defense=78、BattleSystem用データ(bosses.ts)も一致する", () => {
  assert.equal(MONSTER_ROSTER_BY_ID.batorasu.hp, 2200);
  assert.equal(MONSTER_ROSTER_BY_ID.batorasu.defense, 78);
  assert.equal(BATORASU.maxHp, 2200);
  assert.equal(BATORASU.defense, 78);
});

test("デーマスのHP=1100(正本)", () => {
  assert.equal(MONSTER_ROSTER_BY_ID.demas.hp, 1100);
});

test("まじんのHP=520(正本)、bosses.tsのMAJINも一致する", () => {
  assert.equal(MONSTER_ROSTER_BY_ID.majin.hp, 520);
  assert.equal(MAJIN.maxHp, 520);
});

test("BattleSceneが正式モンスターデータを利用できる(DEV_BATTLE_MONSTERS/bosses.tsがMONSTER_ROSTERを参照する)", () => {
  // No.03ビーエのもりの通常敵(実際にBattleScene/BattleSystemが読む経路)
  assert.equal(DEV_BATTLE_MONSTERS["001"].maxHp, MONSTER_ROSTER_BY_ID.tamago_ghost.hp);
  assert.equal(DEV_BATTLE_MONSTERS["001"].attack, MONSTER_ROSTER_BY_ID.tamago_ghost.attack);
  assert.equal(DEV_BATTLE_MONSTERS["001"].defense, MONSTER_ROSTER_BY_ID.tamago_ghost.defense);
  assert.equal(DEV_BATTLE_MONSTERS["001"].reward.experience, MONSTER_ROSTER_BY_ID.tamago_ghost.exp);
  assert.equal(DEV_BATTLE_MONSTERS["001"].reward.money, MONSTER_ROSTER_BY_ID.tamago_ghost.gold);
  assert.equal(DEV_BATTLE_MONSTERS["003"].maxHp, MONSTER_ROSTER_BY_ID.purin.hp);
  assert.equal(DEV_BATTLE_MONSTERS["003"].attack, MONSTER_ROSTER_BY_ID.purin.attack);
  assert.equal(DEV_BATTLE_MONSTERS["003"].defense, MONSTER_ROSTER_BY_ID.purin.defense);
  assert.equal(DEV_BATTLE_MONSTERS["003"].reward.experience, MONSTER_ROSTER_BY_ID.purin.exp);
  assert.equal(DEV_BATTLE_MONSTERS["003"].reward.money, MONSTER_ROSTER_BY_ID.purin.gold);
  // headlessでBattleSystemへ直接渡される終盤ボス(bosses.ts)
  for (const [combatant, rosterId] of [[BATORASU, "batorasu"], [OROCHI_MAOU, "orochi_maou"], [MAJIN, "majin"]]) {
    const roster = MONSTER_ROSTER_BY_ID[rosterId];
    assert.equal(combatant.maxHp, roster.hp);
    assert.equal(combatant.attack, roster.attack);
    assert.equal(combatant.defense, roster.defense);
    assert.equal(combatant.speed, roster.speed);
    assert.equal(combatant.reward.experience, roster.exp);
    assert.equal(combatant.reward.money, roster.gold);
  }
});

test("EXP/Gの勝利報酬は、実際に接続済みのモンスターについて正式ロスターの値と一致する", () => {
  // 未接続の23体は、敵の出現場所・配置という別仕様(今回のスコープ外)が決まってから
  // BattleCombatantDefinition化する。ここでは既にBattleScene/BattleSystemへ接続済みの
  // 6体(たまゴースト・プリン・デーマスDEV・バトラス・オロチまおう・まじん正本)だけを確認する。
  assert.deepEqual({ exp: DEV_BATTLE_MONSTERS["001"].reward.experience, gold: DEV_BATTLE_MONSTERS["001"].reward.money }, { exp: 10, gold: 4 });
  assert.deepEqual({ exp: DEV_BATTLE_MONSTERS["003"].reward.experience, gold: DEV_BATTLE_MONSTERS["003"].reward.money }, { exp: 8, gold: 3 });
  assert.deepEqual({ exp: DEV_BATTLE_MONSTERS.demas.reward.experience, gold: DEV_BATTLE_MONSTERS.demas.reward.money }, { exp: 650, gold: 400 });
  assert.deepEqual({ exp: BATORASU.reward.experience, gold: BATORASU.reward.money }, { exp: 1100, gold: 650 });
  assert.deepEqual({ exp: OROCHI_MAOU.reward.experience, gold: OROCHI_MAOU.reward.money }, { exp: 3000, gold: 0 });
  assert.deepEqual({ exp: MAJIN.reward.experience, gold: MAJIN.reward.money }, { exp: 250, gold: 100 });
});
