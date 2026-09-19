import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BATTLE_ENTRANCE_DURATION_MS } from "../src/config/battle.ts";

test("field battle entrance lasts about four seconds", () => {
  assert.equal(BATTLE_ENTRANCE_DURATION_MS, 4_000);
});

test("dialogue and random encounters both enter BattleScene through the shared prism-breach effect", () => {
  const dialogueBridge = readFileSync(new URL("../src/events/DialogueEvents.ts", import.meta.url), "utf8");
  const forestScene = readFileSync(new URL("../src/scenes/StartingForestScene.ts", import.meta.url), "utf8");
  assert.match(dialogueBridge, /beginBattleEntrance\(scene, actions, event\)/);
  assert.match(forestScene, /beginBattleEntrance\(this, this\.actions, event\)/);
  assert.doesNotMatch(forestScene, /scene\.start\("BattleScene", createBattleSceneStartData\(event\)\)/);
});
