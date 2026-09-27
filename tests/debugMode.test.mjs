import assert from "node:assert/strict";
import test from "node:test";
import { DEBUG_PARTY_LEVEL, DEBUG_PARTY_MEMBER_IDS, isDebugMode, resolveDebugMode } from "../src/config/debugMode.ts";
import { getCharacterBaseStatsAtLevel } from "../src/config/characterGrowth.ts";
import { buildDebugParty, buildPartyCombatant } from "../src/battle/PartyCombatants.ts";
import { MAX_CHARACTER_LEVEL } from "../src/data/expTable.ts";

test("DEBUG_MODE is on for DEV builds by default and can be turned off with ?debug=0", () => {
  assert.equal(resolveDebugMode(true, ""), true);
  assert.equal(resolveDebugMode(true, "?mapTest=no02"), true);
  assert.equal(resolveDebugMode(true, "?debug=1"), true);
  for (const off of ["0", "off", "OFF", "false"]) assert.equal(resolveDebugMode(true, `?debug=${off}`), false, off);
});

test("DEBUG_MODE never turns on in a production build or under Node", () => {
  assert.equal(resolveDebugMode(false, ""), false);
  assert.equal(resolveDebugMode(false, "?debug=1"), false);
  assert.equal(isDebugMode(), false, "import.meta.env.DEV is absent outside Vite, so the other tests keep exercising normal play");
});

test("the debug party is hero → tarosa → mirei, all at Lv30, independent of joining or the save", () => {
  assert.equal(DEBUG_PARTY_LEVEL, 30);
  assert.deepEqual(DEBUG_PARTY_MEMBER_IDS, ["hero", "tarosa", "mirei"]);
  const party = buildDebugParty();
  assert.deepEqual(party.map((member) => member.id), ["hero", "tarosa", "mirei"]);
  for (const member of party) {
    assert.equal(member.initialHp, undefined, `${member.id} starts at full HP`);
    assert.equal(member.initialMp, undefined, `${member.id} starts at full MP`);
  }
});

test("Lv30 stats extend the same linear curve past the formal Lv25 cap", () => {
  for (const id of DEBUG_PARTY_MEMBER_IDS) {
    const lv25 = getCharacterBaseStatsAtLevel(id, MAX_CHARACTER_LEVEL);
    const lv30 = getCharacterBaseStatsAtLevel(id, DEBUG_PARTY_LEVEL, DEBUG_PARTY_LEVEL);
    assert.equal(lv30.level, 30);
    assert.ok(lv30.maxHp > lv25.maxHp && lv30.maxMp > lv25.maxMp && lv30.attack > lv25.attack, `${id} keeps growing to Lv30`);
  }
  const [hero, tarosa, mirei] = buildDebugParty();
  assert.ok(hero.maxHp > tarosa.maxHp && tarosa.maxHp > mirei.maxHp, "HP order 主人公>タロサ>ミレイ still holds at Lv30");
  assert.ok(mirei.maxMp > hero.maxMp && hero.maxMp > tarosa.maxMp, "MP order ミレイ>主人公>タロサ still holds at Lv30");
  assert.ok(tarosa.attack > hero.attack && hero.attack > mirei.attack, "attack order タロサ>主人公>ミレイ still holds at Lv30");
});

test("the debug party knows every spell and carries the best auto-equipped weapons", () => {
  const [hero, tarosa, mirei] = buildDebugParty();
  assert.deepEqual(hero.learnedMagic.map((magic) => magic.name), ["エレキテル", "ライフ", "ヒート", "ビーター"]);
  assert.equal(tarosa.learnedMagic.length, 3);
  assert.equal(mirei.learnedMagic.length, 6);
  assert.ok(mirei.learnedMagic.some((magic) => magic.name === "ミラー"), "ミレイ can use ミラー for the デーマス fight");
  assert.equal(tarosa.weaponAction.statusEffect, "poison", "タロサ holds the poison bow");
});

test("normal play stays capped at Lv25 when no override is given", () => {
  assert.equal(getCharacterBaseStatsAtLevel("hero", 30).level, MAX_CHARACTER_LEVEL);
  assert.deepEqual(buildPartyCombatant("hero", 30), buildPartyCombatant("hero", MAX_CHARACTER_LEVEL));
});
