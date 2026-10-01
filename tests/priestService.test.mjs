import assert from "node:assert/strict";
import test from "node:test";
import { MAPS } from "../src/config/maps.ts";
import { GameStateRepository } from "../src/systems/GameStateRepository.ts";
import {
  PRIEST_RECORD_PAGES,
  PRIEST_RECOVERY_PAGES,
  getPriestRecoveryDestination,
  recordAdventureAtPriest,
} from "../src/systems/PriestService.ts";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}

test("the four implemented towns define a fixed priest and a recovery spawn in front of them", () => {
  const priests = [
    ["map_02_starting_town", "npc_start_town_priest"],
    ["map_03_bie_village", "npc_bie_village_priest"],
    ["map_rainland_castle_town", "npc_rainland_town_priest"],
    ["map_zabon_village", "npc_zabon_village_priest"],
  ];
  for (const [mapId, priestId] of priests) {
    const map = MAPS[mapId];
    assert.deepEqual(map.npcs.filter((npc) => npc.role === "priest").map((npc) => npc.id), [priestId]);
    assert.equal(map.spawns.priest.facing, "up");
  }
});

test("only a priest record writes the existing continuation format", () => {
  const repository = new GameStateRepository(new MemoryStorage());
  repository.setFlag("story.example");
  const record = {
    mapId: "map_02_starting_town",
    sceneKey: "StartingTownScene",
    resume: { kind: "2d", x: 400, y: 500, facing: "left" },
  };
  recordAdventureAtPriest(repository, record);
  assert.deepEqual(repository.load().map.adventureRecord, record);
  assert.equal(repository.hasFlag("story.example"), true, "the priest record preserves progress flags");
  assert.match(PRIEST_RECORD_PAGES.join("\n"), /たびの　きろく/);
});

test("normal battle regions return to their local priest; an unknown scene has a safe starting-town fallback", () => {
  assert.deepEqual(getPriestRecoveryDestination("StartingForestScene"), { sceneKey: "StartingTownScene", spawnId: "priest" });
  assert.deepEqual(getPriestRecoveryDestination("BieVillageScene"), { sceneKey: "BieVillageScene", spawnId: "priest" });
  assert.deepEqual(getPriestRecoveryDestination("RainlandForest2Scene"), { sceneKey: "RainlandCastleTownScene", spawnId: "priest" });
  assert.deepEqual(getPriestRecoveryDestination("ZabonVillageScene"), { sceneKey: "ZabonVillageScene", spawnId: "priest" });
  assert.deepEqual(getPriestRecoveryDestination("UnknownScene"), { sceneKey: "StartingTownScene", spawnId: "priest" });
  assert.match(PRIEST_RECOVERY_PAGES.join("\n"), /ちからつきるとは/);
});
