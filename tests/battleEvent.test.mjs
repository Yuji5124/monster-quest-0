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
    returnSpawnId: "spawn_battle_event_return",
  });
});

test("the DEV battle NPC can be re-used because no completion flag is stored", () => {
  const npc = MAPS.map_02_starting_town.npcs.find(npc => npc.id === "dev_battle_event_npc");
  assert.equal(npc?.dialogueId, "dev_battle_event_npc");
  assert.equal("eventCompleted" in (npc ?? {}), false);
});

test("an absent or unknown dialogue event is ignored safely", () => {
  assert.equal(isBattleDialogueEvent(undefined), false);
  assert.equal(isBattleDialogueEvent({ type: "unknown" }), false);
});
