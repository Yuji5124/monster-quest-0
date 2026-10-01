import assert from "node:assert/strict";
import test from "node:test";
import { getCharacterBaseStatsAtLevel } from "../src/config/characterGrowth.ts";
import { buildPartyCombatant } from "../src/battle/PartyCombatants.ts";
import { MAX_CHARACTER_LEVEL } from "../src/data/expTable.ts";

test("all battle entry points stay capped at the formal Lv25 limit", () => {
  assert.equal(getCharacterBaseStatsAtLevel("hero", 30).level, MAX_CHARACTER_LEVEL);
  assert.deepEqual(buildPartyCombatant("hero", 30), buildPartyCombatant("hero", MAX_CHARACTER_LEVEL));
});
