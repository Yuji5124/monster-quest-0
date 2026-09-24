import assert from "node:assert/strict";
import test from "node:test";
import { DEV_BATTLE_MONSTERS } from "../src/data/monsters.ts";
import { DIALOGUES } from "../src/data/dialogues.ts";
import { createBattleSceneStartData, isBattleDialogueEvent } from "../src/events/BattleEventData.ts";
import { MAPS } from "../src/config/maps.ts";

test("the DEV battle NPC dialogue creates one valid battle event", () => {
  const event = DIALOGUES.dev_battle_event_npc.afterDialogue;
  assert.ok(isBattleDialogueEvent(event));
  assert.equal(event.monsterId, "003");
  assert.ok(DEV_BATTLE_MONSTERS[event.monsterId]);
  assert.equal(event.returnSceneKey, "StartingTownScene");
  assert.ok(MAPS.map_02_starting_town.spawns[event.returnSpawnId]);
});

test("battle scene start data preserves monster, event, and return spawn identifiers", () => {
  const event = DIALOGUES.dev_battle_event_npc.afterDialogue;
  assert.ok(isBattleDialogueEvent(event));
  assert.deepEqual(createBattleSceneStartData(event), {
    mode: "event",
    type: "battle",
    eventId: "dev_battle_event_003",
    monsterId: "003",
    returnSceneKey: "StartingTownScene",
    returnSpawnId: "fromWorldMap",
  });
});

test("No.02 no longer exposes developer battle NPCs among its villager placements", () => {
  const townNpcIds = MAPS.map_02_starting_town.npcs.map((npc) => npc.id);
  assert.equal(townNpcIds.some((id) => id.startsWith("dev_")), false);
  assert.equal(MAPS.map_02_starting_town.npcs.every((npc) => npc.dialogueId.startsWith("npc_start_town_")), true);
});

test("an absent or unknown dialogue event is ignored safely", () => {
  assert.equal(isBattleDialogueEvent(undefined), false);
  assert.equal(isBattleDialogueEvent({ type: "unknown" }), false);
});

test("a random-encounter battle event carries the exact pre-battle position through unchanged", () => {
  const event = {
    type: "battle",
    eventId: "event_starting_forest_random_encounter",
    monsterId: "001",
    returnSceneKey: "StartingForestScene",
    returnSpawnId: "fromWorldMap",
    returnSpawnX: 812.5,
    returnSpawnY: 640,
    returnFacing: "left",
  };
  assert.ok(isBattleDialogueEvent(event));
  assert.deepEqual(createBattleSceneStartData(event), { mode: "event", ...event });
});
