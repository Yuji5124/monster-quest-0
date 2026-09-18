import assert from "node:assert/strict";
import test from "node:test";
import { MAPS } from "../src/config/maps.ts";
import { DIALOGUES } from "../src/data/dialogues.ts";

test("every dialogue has at least one page and its id matches its key", () => {
  for (const [key, dialogue] of Object.entries(DIALOGUES)) {
    assert.ok(dialogue.pages.length >= 1);
    assert.equal(dialogue.id, key);
  }
});

test("the Phase 7 test dialogue has at least 2 pages", () => {
  assert.ok(DIALOGUES.dev_npc_test.pages.length >= 2);
});

test("every NPC references a dialogue that exists", () => {
  for (const map of Object.values(MAPS)) {
    for (const npc of map.npcs) {
      assert.ok(DIALOGUES[npc.dialogueId], `missing dialogue for npc ${npc.id}`);
    }
  }
});

test("no duplicate NPC ids within a map", () => {
  for (const map of Object.values(MAPS)) {
    const ids = map.npcs.map((npc) => npc.id);
    assert.equal(new Set(ids).size, ids.length);
  }
});

test("every NPC's mapId matches the map it is defined on", () => {
  for (const map of Object.values(MAPS)) {
    for (const npc of map.npcs) {
      assert.equal(npc.mapId, map.id);
    }
  }
});
