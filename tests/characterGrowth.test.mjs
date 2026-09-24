import assert from "node:assert/strict";
import test from "node:test";
import { EXP_TABLE, getExpForLevel, getExpForNextLevel, getLevelForTotalExp, MAX_CHARACTER_LEVEL } from "../src/data/expTable.ts";
import { getCharacterBaseStatsAtLevel, getLearnedMagicAtLevel, getMagicLearnTable } from "../src/config/characterGrowth.ts";
import { PARTY_MEMBER_IDS } from "../src/systems/PartySystem.ts";
import { getDefaultWeaponForLevel, getWeaponById, WEAPON_PROGRESSION } from "../src/data/weapons.ts";
import { buildPartyCombatant } from "../src/battle/PartyCombatants.ts";

test("EXP table matches the 2026-09-22 confirmed Lv1-25 curve exactly", () => {
  assert.equal(EXP_TABLE.length, 25);
  assert.deepEqual(EXP_TABLE, [
    0, 12, 35, 75, 135, 220, 340, 500, 720, 1000,
    1360, 1820, 2400, 3120, 4000, 5080, 6380, 7940, 9800, 12000,
    14600, 17600, 21100, 25100, 29700,
  ]);
  assert.equal(MAX_CHARACTER_LEVEL, 25);
  for (let i = 1; i < EXP_TABLE.length; i += 1) assert.ok(EXP_TABLE[i] > EXP_TABLE[i - 1], `EXP must strictly increase at index ${i}`);
});

test("level lookups round-trip against the EXP table and clamp at Lv25", () => {
  assert.equal(getExpForLevel(1), 0);
  assert.equal(getExpForLevel(23), 21100);
  assert.equal(getLevelForTotalExp(0), 1);
  assert.equal(getLevelForTotalExp(11), 1);
  assert.equal(getLevelForTotalExp(12), 2);
  assert.equal(getLevelForTotalExp(21100), 23);
  assert.equal(getLevelForTotalExp(29700), 25);
  assert.equal(getLevelForTotalExp(999999), 25, "EXP beyond Lv25 never levels further");
  assert.equal(getExpForNextLevel(25), getExpForLevel(25), "Lv25 has no further threshold");
});

test("Lv23 base stats land on the user-confirmed target ranges (before weapon bonus)", () => {
  const hero = getCharacterBaseStatsAtLevel("hero", 23);
  const tarosa = getCharacterBaseStatsAtLevel("tarosa", 23);
  const mirei = getCharacterBaseStatsAtLevel("mirei", 23);
  assert.equal(hero.maxHp, 220);
  assert.ok(hero.maxMp >= 90 && hero.maxMp <= 100, `hero MP ${hero.maxMp} should be ~90-100`);
  assert.equal(hero.attack, 70);
  assert.equal(tarosa.maxHp, 200);
  assert.ok(tarosa.maxMp >= 45 && tarosa.maxMp <= 55, `tarosa MP ${tarosa.maxMp} should be ~45-55`);
  assert.ok(tarosa.attack >= 75 && tarosa.attack <= 80, `tarosa attack ${tarosa.attack} should be ~75-80`);
  assert.ok(mirei.maxHp >= 155 && mirei.maxHp <= 165, `mirei HP ${mirei.maxHp} should be ~155-165`);
  assert.ok(mirei.maxMp >= 135 && mirei.maxMp <= 150, `mirei MP ${mirei.maxMp} should be ~135-150`);
  assert.ok(mirei.attack >= 40 && mirei.attack <= 45, `mirei attack ${mirei.attack} should be ~40-45`);
});

test("Lv23 fully-equipped final attack lands on the user-confirmed target ranges", () => {
  const hero = buildPartyCombatant("hero", 23);
  const tarosa = buildPartyCombatant("tarosa", 23);
  const mirei = buildPartyCombatant("mirei", 23);
  assert.ok(hero.attack >= 105 && hero.attack <= 110, `hero final attack ${hero.attack} should be ~105-110`);
  assert.ok(tarosa.attack >= 110 && tarosa.attack <= 120, `tarosa final attack ${tarosa.attack} should be ~110-120`);
  assert.ok(mirei.attack >= 50 && mirei.attack <= 60, `mirei final attack ${mirei.attack} should be ~50-60`);
});

test("HP/MP/attack orderings hold at every level from 1 to 25 (物理: タロサ>主人公>ミレイ / MP: ミレイ>主人公>タロサ / HP: 主人公>タロサ>ミレイ)", () => {
  for (let level = 1; level <= 25; level += 1) {
    const hero = getCharacterBaseStatsAtLevel("hero", level);
    const tarosa = getCharacterBaseStatsAtLevel("tarosa", level);
    const mirei = getCharacterBaseStatsAtLevel("mirei", level);
    assert.ok(hero.maxHp > tarosa.maxHp && tarosa.maxHp > mirei.maxHp, `HP order broken at Lv${level}`);
    assert.ok(mirei.maxMp > hero.maxMp && hero.maxMp > tarosa.maxMp, `MP order broken at Lv${level}`);
    assert.ok(tarosa.attack > hero.attack && hero.attack > mirei.attack, `attack order broken at Lv${level}`);
  }
});

test("stats never decrease as level increases", () => {
  for (const id of PARTY_MEMBER_IDS) {
    let previous = getCharacterBaseStatsAtLevel(id, 1);
    for (let level = 2; level <= 25; level += 1) {
      const current = getCharacterBaseStatsAtLevel(id, level);
      assert.ok(current.maxHp >= previous.maxHp);
      assert.ok(current.maxMp >= previous.maxMp);
      assert.ok(current.attack >= previous.attack);
      previous = current;
    }
  }
});

test("normal play (Lv23) clears without needing Lv25; Lv25 stats exceed the Lv23 target", () => {
  for (const id of PARTY_MEMBER_IDS) {
    const lv23 = getCharacterBaseStatsAtLevel(id, 23);
    const lv25 = getCharacterBaseStatsAtLevel(id, 25);
    assert.ok(lv25.maxHp > lv23.maxHp && lv25.attack > lv23.attack, `${id} should keep growing modestly past Lv23`);
  }
});

test("magic learn tables only grant magic once the required level is reached", () => {
  assert.deepEqual(getLearnedMagicAtLevel("hero", 2).map((m) => m.name), ["エレキテル"]);
  assert.deepEqual(getLearnedMagicAtLevel("hero", 3).map((m) => m.name), ["エレキテル", "ライフ"]);
  assert.ok(getLearnedMagicAtLevel("hero", 8).some((m) => m.name === "ヒート"), "hero must know ヒート by Lv8 (まじん攻略)");
  assert.ok(!getLearnedMagicAtLevel("hero", 7).some((m) => m.name === "ヒート"), "ヒート must not be known before Lv8");
  assert.ok(getLearnedMagicAtLevel("mirei", 14).some((m) => m.name === "ミラー"), "mirei must know ミラー by Lv14 (デーマス攻略)");
  assert.ok(!getLearnedMagicAtLevel("mirei", 13).some((m) => m.name === "ミラー"), "ミラー must not be known before Lv14");
  for (const id of PARTY_MEMBER_IDS) {
    const table = getMagicLearnTable(id);
    for (let i = 1; i < table.length; i += 1) assert.ok(table[i].level >= table[i - 1].level);
  }
});

test("weapon progression: attack bonus is non-decreasing and hero's names are the official ITEM_EQUIPMENT_SPEC names", () => {
  assert.deepEqual(WEAPON_PROGRESSION.hero.map((w) => w.displayName), ["ぼくとう", "こんぼう", "てつのけん", "こうてつのけん", "ゆうしゃのけん"]);
  for (const id of PARTY_MEMBER_IDS) {
    const weapons = WEAPON_PROGRESSION[id];
    for (let i = 1; i < weapons.length; i += 1) assert.ok(weapons[i].attackBonus > weapons[i - 1].attackBonus);
  }
  assert.ok(WEAPON_PROGRESSION.tarosa.every((w) => w.officialName === false), "タロサの弓は正式名称未確定のためDEV_PLACEHOLDER_NAME");
});

test("tarosa's final bow carries the poison weapon action needed for バトラス", () => {
  const finalBow = WEAPON_PROGRESSION.tarosa.at(-1);
  assert.equal(finalBow.weaponAction.statusEffect, "poison");
  assert.ok(finalBow.weaponAction.applyChance > 0 && finalBow.weaponAction.applyChance <= 1);
  assert.equal(getDefaultWeaponForLevel("tarosa", 19).id, finalBow.id, "the poison bow must be available at/before the Lv19-21 バトラス target");
  assert.notEqual(getDefaultWeaponForLevel("tarosa", 18).id, finalBow.id, "the poison bow should not appear before the story reasonably allows it");
  assert.equal(getWeaponById("tarosa", finalBow.id), finalBow);
});

test("hero auto-equips ゆうしゃのけん by Lv20, well before the Lv23 final boss", () => {
  assert.equal(getDefaultWeaponForLevel("hero", 20).displayName, "ゆうしゃのけん");
  assert.equal(getDefaultWeaponForLevel("hero", 1).displayName, "ぼくとう");
});
