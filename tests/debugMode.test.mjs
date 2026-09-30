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

test("the debug party is the hero alone at Lv30, independent of joining or the save", () => {
  assert.equal(DEBUG_PARTY_LEVEL, 30);
  assert.deepEqual(DEBUG_PARTY_MEMBER_IDS, ["hero"]);
  const party = buildDebugParty();
  assert.deepEqual(party.map((member) => member.id), ["hero"]);
  assert.equal(party[0].initialHp, undefined, "hero starts at full HP");
  assert.equal(party[0].initialMp, undefined, "hero starts at full MP");
});

test("Lv30 stats extend the same linear curve past the formal Lv25 cap", () => {
  const lv25 = getCharacterBaseStatsAtLevel("hero", MAX_CHARACTER_LEVEL);
  const lv30 = getCharacterBaseStatsAtLevel("hero", DEBUG_PARTY_LEVEL, DEBUG_PARTY_LEVEL);
  assert.equal(lv30.level, 30);
  assert.ok(lv30.maxHp > lv25.maxHp && lv30.maxMp > lv25.maxMp && lv30.attack > lv25.attack, "hero keeps growing to Lv30");
  const [hero] = buildDebugParty();
  assert.equal(hero.maxHp, lv30.maxHp);
});

test("the debug hero knows every spell", () => {
  const [hero] = buildDebugParty();
  assert.deepEqual(hero.learnedMagic.map((magic) => magic.name), ["エレキテル", "ライフ", "ヒート", "ビーター"]);
});

test("normal play stays capped at Lv25 when no override is given", () => {
  assert.equal(getCharacterBaseStatsAtLevel("hero", 30).level, MAX_CHARACTER_LEVEL);
  assert.deepEqual(buildPartyCombatant("hero", 30), buildPartyCombatant("hero", MAX_CHARACTER_LEVEL));
});
