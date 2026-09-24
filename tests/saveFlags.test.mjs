import assert from "node:assert/strict";
import test from "node:test";
import { GAME_STATE_STORAGE_KEY, GameStateRepository, normalizeGameState } from "../src/systems/GameStateRepository.ts";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}

test("progress flags persist valid one-time boss, chest, and event state without replacing the other save sections", () => {
  const storage = new MemoryStorage();
  const repository = new GameStateRepository(storage);
  repository.addMoney(12);
  repository.setFlag("boss.starting_forest_erimaki_tokage_defeated");
  repository.setFlag("chest.starting_forest_kaifukuyaku_opened");
  repository.setFlag("event.starting_forest_tarosa_hunt_talked");
  repository.setFlag("story.rainland_castle_town_unlocked");

  const state = new GameStateRepository(storage).load();
  assert.equal(state.player.money, 12);
  assert.deepEqual(Object.keys(state.flags).sort(), [
    "boss.starting_forest_erimaki_tokage_defeated",
    "chest.starting_forest_kaifukuyaku_opened",
    "event.starting_forest_tarosa_hunt_talked",
    "story.rainland_castle_town_unlocked",
  ]);
  assert.equal(new GameStateRepository(storage).hasFlag("story.rainland_castle_town_unlocked"), true);
  assert.equal(storage.getItem(GAME_STATE_STORAGE_KEY) === null, false);
});

test("old and malformed flag records remain locked instead of inventing progress", () => {
  assert.deepEqual(normalizeGameState({ version: 1, player: { money: 3 }, cards: { obtainedJumpCards: [] } })?.flags, {});
  assert.deepEqual(normalizeGameState({
    version: 1,
    player: { money: 3 },
    cards: { obtainedJumpCards: [] },
    flags: { "story.rainland_castle_town_unlocked": false, "not a flag": true, "event.valid": true },
  })?.flags, { "event.valid": true });
});
