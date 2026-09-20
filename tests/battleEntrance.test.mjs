import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BATTLE_ENTRANCE_DURATION_MS } from "../src/config/battle.ts";

test("field battle entrance stays brief enough for routine encounters", () => {
  assert.equal(BATTLE_ENTRANCE_DURATION_MS, 1_300);
});

test("dialogue and random encounters both enter BattleScene through the shared pixel-vortex effect", () => {
  const dialogueBridge = readFileSync(new URL("../src/events/DialogueEvents.ts", import.meta.url), "utf8");
  const forestScene = readFileSync(new URL("../src/scenes/StartingForestScene.ts", import.meta.url), "utf8");
  assert.match(dialogueBridge, /beginBattleEntrance\(scene, actions, event\)/);
  assert.match(forestScene, /beginBattleEntrance\(this, this\.actions, event\)/);
  assert.doesNotMatch(forestScene, /scene\.start\("BattleScene", createBattleSceneStartData\(event\)\)/);
});

test("battle entrance uses a pixel vortex instead of the removed prism flash", () => {
  const entrance = readFileSync(new URL("../src/events/BattleEntrance.ts", import.meta.url), "utf8");
  assert.match(entrance, /drawPixelVortex/);
  assert.match(entrance, /PIXEL_COLUMNS/);
  assert.doesNotMatch(entrance, /drawPrismBreach|drawDiamond|\.flash\(/);
});
