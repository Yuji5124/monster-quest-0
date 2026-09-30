import assert from "node:assert/strict";
import test from "node:test";
import { resolveAdventureResume } from "../src/systems/AdventureResume.ts";
import { GameStateRepository, normalizeAdventureRecord, normalizeGameState } from "../src/systems/GameStateRepository.ts";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}

test("a manual adventure record persists its exact 2D position without replacing progress", () => {
  const repository = new GameStateRepository(new MemoryStorage());
  repository.setFlag("event.valid");
  repository.addMoney(17);
  repository.saveAdventureRecord({
    mapId: "map_02_starting_town",
    sceneKey: "StartingTownScene",
    resume: { kind: "2d", x: 441.5, y: 702, facing: "left" },
  });

  assert.equal(repository.hasAdventureRecord(), true);
  assert.deepEqual(repository.getAdventureRecord(), {
    mapId: "map_02_starting_town",
    sceneKey: "StartingTownScene",
    resume: { kind: "2d", x: 441.5, y: 702, facing: "left" },
  });
  assert.equal(repository.load().player.money, 17);
  assert.equal(repository.hasFlag("event.valid"), true);
});

test("old saves and malformed records never enable continue", () => {
  assert.equal(normalizeGameState({ version: 1, player: { money: 2 }, cards: { obtainedJumpCards: [] } })?.map.adventureRecord, undefined);
  assert.equal(normalizeAdventureRecord({
    mapId: "map_02_starting_town",
    sceneKey: "StartingTownScene",
    resume: { kind: "2d", x: Number.NaN, y: 1, facing: "down" },
  }), undefined);
  assert.equal(normalizeAdventureRecord({
    mapId: "map_02_starting_town",
    sceneKey: "not a scene",
    resume: { kind: "2d", x: 1, y: 1, facing: "down" },
  }), undefined);
});

test("starting a new game clears the manual continuation point", () => {
  const repository = new GameStateRepository(new MemoryStorage());
  repository.saveAdventureRecord({
    mapId: "map_01_starting_place",
    sceneKey: "StartingPlaceScene",
    resume: { kind: "2d", x: 810, y: 500, facing: "left" },
  });
  repository.startNewGame();
  assert.equal(repository.hasAdventureRecord(), false);
});

test("continue resolves only map-verified 2D and 3D destinations", () => {
  assert.deepEqual(resolveAdventureResume({
    mapId: "map_02_starting_town",
    sceneKey: "StartingTownScene",
    resume: { kind: "2d", x: 441, y: 702, facing: "left" },
  }), {
    sceneKey: "StartingTownScene",
    data: { spawnX: 441, spawnY: 702, spawnFacing: "left" },
  });
  assert.deepEqual(resolveAdventureResume({
    mapId: "map_lake_castle_2",
    sceneKey: "LakeCastle3DScene",
    resume: { kind: "lake3d", floor: 2, x: 7.5, y: 9.25, yaw: 1.2 },
  }), {
    sceneKey: "LakeCastle3DScene",
    data: { floor: 2, spawnX: 7.5, spawnY: 9.25, spawnYaw: 1.2 },
  });
  assert.equal(resolveAdventureResume({
    mapId: "map_02_starting_town",
    sceneKey: "StartingPlaceScene",
    resume: { kind: "2d", x: 1, y: 2, facing: "up" },
  }), undefined);
});
