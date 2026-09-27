import assert from "node:assert/strict";
import test from "node:test";
import { GameStateRepository, normalizeGameState } from "../src/systems/GameStateRepository.ts";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}

test("towerLevel defaults to one for new and legacy saves and persists without replacing other state", () => {
  const legacy = normalizeGameState({ version: 1, player: { money: 42 }, cards: { obtainedJumpCards: [] } });
  assert.equal(legacy?.tower.towerLevel, 1);
  assert.equal(legacy?.player.money, 42);

  const storage = new MemoryStorage();
  const repository = new GameStateRepository(storage);
  repository.addMoney(10);
  repository.setFlag("story.mysterious_tower_revealed");
  repository.saveTowerLevel(3);
  const state = new GameStateRepository(storage).load();
  assert.equal(state.tower.towerLevel, 3);
  assert.equal(state.player.money, 10);
  assert.equal(state.flags["story.mysterious_tower_revealed"], true);
});

test("malformed tower levels safely normalize to one", () => {
  assert.equal(normalizeGameState({ version: 1, tower: { towerLevel: 0 } })?.tower.towerLevel, 1);
  assert.equal(normalizeGameState({ version: 1, tower: { towerLevel: 1.5 } })?.tower.towerLevel, 1);
});
