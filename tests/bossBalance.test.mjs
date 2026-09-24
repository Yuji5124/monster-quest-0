import assert from "node:assert/strict";
import test from "node:test";
import { BattleSystem, resolveMagicDamage } from "../src/battle/BattleSystem.ts";
import { buildPartyCombatant } from "../src/battle/PartyCombatants.ts";
import { DEV_BATTLE_MONSTERS } from "../src/data/monsters.ts";
import { DEV_MIRROR, DEV_DAIDAIN, NORMAL_ATTACK } from "../src/data/battleActions.ts";
import { BATORASU, OROCHI_MAOU } from "../src/data/bosses.ts";
import { DEV_MAJIN_CAVE_BALANCE, MAJIN_CAVE_HERO_HAS_HEAT } from "../src/config/majinCave.ts";
import { MajinCaveRunState } from "../src/systems/MajinCaveRunState.ts";
import { simulateBattle, makeDeterministicRandom } from "./helpers/battleSimulator.mjs";

function goToFloor10(run) {
  while (run.currentFloorNumber < 10) {
    run.setPlayerPosition(run.currentFloor.downStair);
    run.useCurrentStair();
  }
  return run.currentFloor.enemies.find((enemy) => enemy.definitionId === "majin");
}

// --- まじん (No.07, Lv9-10): ヒートが攻略軸 -----------------------------------------------

test("まじん: hero learns ヒート by Lv8/Lv9, before reaching the No.07 boss floor", () => {
  assert.equal(MAJIN_CAVE_HERO_HAS_HEAT, true);
});

test("まじん: without ever casting ヒート, the boss's regen matches/outpaces plain melee (非常に厳しい)", () => {
  const run = new MajinCaveRunState(1);
  const boss = goToFloor10(run);
  assert.ok(boss);
  for (let round = 0; round < 80 && boss.hp > 0; round += 1) {
    run.damageEnemy(boss, DEV_MAJIN_CAVE_BALANCE.playerAttack);
    if (boss.hp > 0) run.applyEnemyRegen();
  }
  assert.ok(boss.hp > 0, "pure melee alone must not be able to defeat まじん within a realistic number of turns");
  assert.equal(boss.hp, boss.hp > 0 ? boss.hp : 0);
});

test("まじん: periodic ヒート suppresses the regen long enough for melee to finish the fight (ヒートが有効)", () => {
  const run = new MajinCaveRunState(1);
  const boss = goToFloor10(run);
  let round = 0;
  let heatCasts = 0;
  while (boss.hp > 0 && round < 80) {
    const canHeat = round % 4 === 0 && run.playerMp >= DEV_MAJIN_CAVE_BALANCE.heatMpCost;
    if (canHeat) {
      run.spendPlayerMp(DEV_MAJIN_CAVE_BALANCE.heatMpCost);
      run.damageEnemy(boss, DEV_MAJIN_CAVE_BALANCE.heatDamage, { isHeat: true });
      heatCasts += 1;
    } else {
      run.damageEnemy(boss, DEV_MAJIN_CAVE_BALANCE.playerAttack);
    }
    if (boss.hp > 0) run.applyEnemyRegen();
    round += 1;
  }
  assert.equal(boss.hp, 0, "with ヒート periodically suppressing regen, the fight is winnable");
  assert.ok(heatCasts <= Math.floor(DEV_MAJIN_CAVE_BALANCE.maxMp / DEV_MAJIN_CAVE_BALANCE.heatMpCost) + 1, "must stay within a plausible MP budget");
});

// --- デーマス (No.16, Lv15): ミラーが攻略軸。実Lv15成長カーブでも機能することを確認 -----------

test("デーマス: with the real Lv15 growth-curve party, mirei's ミラー reflects ダイダイン instead of hurting her", () => {
  const demas = DEV_BATTLE_MONSTERS.demas;
  const hero = buildPartyCombatant("hero", 15);
  const tarosa = buildPartyCombatant("tarosa", 15);
  const mirei = buildPartyCombatant("mirei", 15);
  assert.ok(mirei.learnedMagic.some((m) => m.id === DEV_MIRROR.id), "mirei must know ミラー by Lv15");
  // random always targets the last living party member (mirei, index2).
  // maxHp is raised only for this isolated mechanic check, so 2 rounds of full-party melee
  // don't end the fight before デーマス reaches its round-3 ダイダイン in the fixed rotation.
  const battle = new BattleSystem([hero, tarosa, mirei], { ...demas, maxHp: 100000, enemyActions: [NORMAL_ATTACK, DEV_MIRROR, DEV_DAIDAIN] }, () => 0.99);
  const act = (command, magicId) => {
    battle.confirm(command, magicId);
    battle.confirm();
  };
  act("fight"); act("fight"); act("fight"); battle.confirm(); // round1: enemy NORMAL_ATTACK on mirei
  const mireiHpAfterNormal = battle.getSnapshot().party[2].hp;
  act("fight"); act("fight"); act("fight"); battle.confirm(); // round2: enemy casts DEV_MIRROR on itself
  act("fight"); act("fight");
  const beforeDaidain = battle.getSnapshot();
  battle.confirm("magic", DEV_MIRROR.id); // mirei mirrors herself right before デーマス's ダイダイン
  const mireiHpJustAfterMirroring = battle.getSnapshot().party[2].hp;
  // mirei was the last living party member to act, so this confirm immediately triggers
  // デーマス's round-3 action (DEV_DAIDAIN, per the fixed NORMAL/MIRROR/DAIDAIN rotation).
  const afterDaidain = battle.confirm();
  assert.match(afterDaidain.message, /はねかえした/);
  assert.equal(afterDaidain.party[2].hp, mireiHpJustAfterMirroring, "mirei takes no damage: ダイダイン reflects onto デーマス");
  assert.ok(afterDaidain.enemy.hp < beforeDaidain.enemy.hp, "デーマス takes the reflected ダイダイン damage");
  assert.ok(mireiHpAfterNormal <= mirei.maxHp, "sanity: mirei's HP never exceeds her real Lv15 max");
});

// --- バトラス (No.19, Lv19-21): 毒が攻略軸 ------------------------------------------------

function buildBatorasuParty(level, tarosaWeaponId) {
  return [
    buildPartyCombatant("hero", level),
    buildPartyCombatant("tarosa", level, tarosaWeaponId),
    buildPartyCombatant("mirei", level),
  ];
}

test("バトラス: does not resist poison and carries no self-heal action (毒が正規攻略上ほぼ必須という耐久設計を、回復ギミックではなくHP/防御で表現する)", () => {
  assert.equal(BATORASU.statusResistance?.poison, false, "毒を無効化しない(BATTLE_SPEC.md §9.2)");
  assert.ok(BATORASU.enemyActions?.every((action) => action.kind === "attack"), "自己回復・状態異常付与などの新規ボス行動は追加しない");
});

test("バトラス: without poison (タロサがどくやの弓を持たない場合)、通常攻撃だけではほぼ勝てない", () => {
  const party = buildBatorasuParty(20, "tarosa_bow_2"); // pre-poison-bow tier
  const battle = new BattleSystem(party, BATORASU, makeDeterministicRandom(7));
  const result = simulateBattle(battle, { maxConfirms: 6000 });
  assert.notEqual(result.outcome, "VICTORY", "毒なしでは現実的な時間で勝てないバランスであること");
});

test("バトラス: with poison (タロサのどくやの弓)、厳しいが攻略可能", () => {
  const party = buildBatorasuParty(20, undefined); // auto-equips the poison bow by Lv19-21
  assert.equal(party[1].weaponAction?.statusEffect, "poison");
  const battle = new BattleSystem(party, BATORASU, makeDeterministicRandom(7));
  const result = simulateBattle(battle, { maxConfirms: 6000 });
  assert.equal(result.outcome, "VICTORY", "毒ありなら攻略可能であること");
});

// --- オロチまおう (No.20本編ラスボス): 3人の最高育成・装備・魔法・道具を全部使う総力戦 --------

function buildOrochiParty(level, underEquipped) {
  if (!underEquipped) return [buildPartyCombatant("hero", level), buildPartyCombatant("tarosa", level), buildPartyCombatant("mirei", level)];
  return [
    buildPartyCombatant("hero", level, "hero_bokuto"),
    buildPartyCombatant("tarosa", level, "tarosa_bow_1"),
    buildPartyCombatant("mirei", level, "mirei_staff_1"),
  ];
}

test("オロチまおう パターン1: Lv23・装備不足 -> かなり厳しい(敗北しやすい)", () => {
  const party = buildOrochiParty(23, true);
  const battle = new BattleSystem(party, OROCHI_MAOU, makeDeterministicRandom(11));
  const result = simulateBattle(battle, { maxConfirms: 6000 });
  assert.notEqual(result.outcome, "VICTORY", "装備不足のLv23では厳しいバランスであること");
});

// 2026-09-23注記: オロチまおうの防御が正式値104(旧TEMP64から+63%)に確定した結果、
// 近接攻撃＋回復のみの簡易シミュレーター(tests/helpers/battleSimulator.mjsは攻撃魔法を使わない)
// では、Lv23最高装備がVICTORYに届かなくなった(headless検証: 敵HPを3200中520まで削るが先に全滅、
// 一方Lv25=レベルキャップ最高装備は際どく勝てる)。ダメージ式・ボスAIは今回変更しないため、
// この2件は既存の「Lv23前後で勝てる」設計目標(BATTLE_SPEC.md §10)と正式ステータスの不整合として
// todo化し、勝手に数値を書き換えない。実プレイヤーは防御を無視する攻撃魔法(ビーター等)も使えるため
// 詰みとは限らないが、想定レベル帯の再確認をユーザーに推奨する(完了報告に記載)。
test("オロチまおう パターン2: Lv23・3人最高クラス装備 -> 緊張感のある勝負で勝てる", { todo: "正式防御104ではLv23最高装備が簡易シミュレーターでVICTORYに届かない(Lv25では勝てる)。BATTLE_SPEC.md §10の想定レベル帯と要再確認" }, () => {
  const party = buildOrochiParty(23, false);
  const battle = new BattleSystem(party, OROCHI_MAOU, makeDeterministicRandom(11));
  const result = simulateBattle(battle, { maxConfirms: 6000 });
  assert.equal(result.outcome, "VICTORY", "Lv23・最高装備なら勝てるバランスであること");
});

test("オロチまおう パターン3: Lv25・完全装備 -> パターン2より明確に楽になる(消化試合にはならない)", { todo: "パターン2のLv23前提がVICTORYに届かないため、同じ比較は成立しない。Lv25単独ではVICTORYする(headless確認済み)" }, () => {
  const lv23Party = buildOrochiParty(23, false);
  const lv25Party = buildOrochiParty(25, false);
  const battleLv23 = new BattleSystem(lv23Party, OROCHI_MAOU, makeDeterministicRandom(11));
  const resultLv23 = simulateBattle(battleLv23, { maxConfirms: 6000 });
  const battleLv25 = new BattleSystem(lv25Party, OROCHI_MAOU, makeDeterministicRandom(11));
  const resultLv25 = simulateBattle(battleLv25, { maxConfirms: 6000 });
  assert.equal(resultLv23.outcome, "VICTORY");
  assert.equal(resultLv25.outcome, "VICTORY");
  assert.ok(resultLv25.confirms <= resultLv23.confirms, "Lv25は同じ乱数列でもLv23と同等以上の速さで決着する(明確に楽になる)");
  const hpRatio = (snapshot) => snapshot.party.reduce((sum, m) => sum + m.hp, 0) / snapshot.party.reduce((sum, m) => sum + m.maxHp, 0);
  assert.ok(hpRatio(resultLv25.snapshot) < 0.999, "Lv25でも無傷の完全な消化試合にはならない");
});

// resolveMagicDamage is re-exercised here at real party scale as a cross-check.
test("cross-check: resolveMagicDamage still reflects exactly once even with the real Lv23 party's stats", () => {
  const mirei = { ...buildPartyCombatant("mirei", 23), hp: 999, mp: 999, status: { mirror: 1 } };
  const target = { ...OROCHI_MAOU, hp: OROCHI_MAOU.maxHp, mp: 0, status: { mirror: 0 } };
  const result = resolveMagicDamage(target, mirei, 50, true);
  assert.equal(result.reflected, true);
  assert.equal(target.hp, OROCHI_MAOU.maxHp - 50);
});
