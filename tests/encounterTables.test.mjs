import assert from "node:assert/strict";
import test from "node:test";
import { DEV_BATTLE_MONSTER_IDS } from "../src/config/battle.ts";
import { getDevBattleMonster } from "../src/data/monsters.ts";
import { ENCOUNTER_TABLES, rollEncounterMonster } from "../src/data/encounterTables.ts";

test("starting_forest encounter table holds exactly the two specified enemies, one per entry", () => {
  const table = ENCOUNTER_TABLES.starting_forest;
  assert.equal(table.entries.length, 2);
  for (const entry of table.entries) {
    assert.equal(entry.enemies.length, 1, "no encounter in this table may field more than one enemy");
    assert.ok(DEV_BATTLE_MONSTER_IDS.includes(entry.enemies[0]));
  }
  assert.deepEqual(table.entries.map((entry) => entry.enemies[0]).sort(), ["001", "003"]);
});

test("every enemy in the table resolves through the real monster data, not a raw image reference", () => {
  for (const entry of ENCOUNTER_TABLES.starting_forest.entries) {
    const monster = getDevBattleMonster(entry.enemies[0]);
    assert.ok(monster, `${entry.enemies[0]} must resolve via getDevBattleMonster`);
    assert.ok(monster.maxHp > 0 && monster.attack > 0 && monster.defense >= 0);
    assert.ok(monster.portraitUrl.length > 0);
  }
});

test("equal weights (1/1) roll close to a 50/50 split over many trials", () => {
  const table = ENCOUNTER_TABLES.starting_forest;
  let sequence = 0;
  const pseudoRandom = () => {
    sequence = (sequence + 1) % 1000;
    return sequence / 1000;
  };
  const counts = { "001": 0, "003": 0 };
  for (let i = 0; i < 1000; i += 1) counts[rollEncounterMonster(table, pseudoRandom)] += 1;
  assert.equal(counts["001"] + counts["003"], 1000);
  assert.ok(Math.abs(counts["001"] - counts["003"]) < 50, `expected a roughly even split, got ${JSON.stringify(counts)}`);
});

test("rollEncounterMonster refuses an empty or non-positive-weight table", () => {
  assert.throws(() => rollEncounterMonster({ id: "empty", entries: [] }), /no positive-weight entries/);
  assert.throws(() => rollEncounterMonster({ id: "zero", entries: [{ enemies: ["001"], weight: 0 }] }), /no positive-weight entries/);
});
