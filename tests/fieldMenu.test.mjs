import assert from "node:assert/strict";
import test from "node:test";
import { DEV_CHARACTER_STATS } from "../src/config/characterStats.ts";
import { FIELD_MENU_ITEMS } from "../src/config/fieldMenu.ts";
import { ITEM_DEFINITIONS } from "../src/data/items.ts";
import { DEV_STARTING_ITEMS, Inventory } from "../src/systems/Inventory.ts";
import { CharacterProgression, getExperienceToNextLevel } from "../src/systems/CharacterProgression.ts";
import { GameStateRepository } from "../src/systems/GameStateRepository.ts";
import { PARTY_MEMBER_IDS } from "../src/systems/PartySystem.ts";

test("field menu has exactly the status and items entries implemented so far", () => {
  assert.deepEqual(FIELD_MENU_ITEMS.map((item) => item.id), ["status", "items"]);
  assert.deepEqual(FIELD_MENU_ITEMS.map((item) => item.label), ["ステータス", "どうぐ"]);
});

test("every party member has a TEMP_TEST_VALUE stats entry with a positive, consistent shape", () => {
  for (const id of PARTY_MEMBER_IDS) {
    const stats = DEV_CHARACTER_STATS[id];
    assert.ok(stats, `${id} must have a DEV_CHARACTER_STATS entry`);
    assert.equal(stats.id, id);
    assert.equal(stats.level, 1);
    assert.equal(stats.exp, 0);
    assert.ok(stats.hp > 0 && stats.hp <= stats.maxHp);
    assert.ok(stats.mp >= 0 && stats.mp <= stats.maxMp);
    assert.ok(stats.attack > 0 && stats.defense > 0 && stats.speed > 0);
    assert.ok(stats.exp >= 0 && stats.expToNextLevel > stats.exp);
  }
});

test("every item definition's key matches its own id and has a non-empty description", () => {
  for (const [key, definition] of Object.entries(ITEM_DEFINITIONS)) {
    assert.equal(definition.id, key);
    assert.equal(typeof definition.name, "string");
    assert.ok(definition.name.length > 0);
    assert.ok(definition.description.length > 0);
    assert.equal(typeof definition.usableInBattle, "boolean");
    assert.equal(typeof definition.usableOnField, "boolean");
  }
});

test("DEV_STARTING_ITEMS only references item ids that exist in ITEM_DEFINITIONS", () => {
  for (const itemId of Object.keys(DEV_STARTING_ITEMS)) {
    assert.ok(itemId in ITEM_DEFINITIONS, `${itemId} must resolve via ITEM_DEFINITIONS`);
  }
});

test("Inventory reports only positive-quantity slots, seeded from the given starting items", () => {
  const inventory = new Inventory(DEV_STARTING_ITEMS);
  const slots = inventory.getSlots();
  assert.deepEqual(
    slots.map((slot) => [slot.itemId, slot.quantity]).sort(),
    Object.entries(DEV_STARTING_ITEMS).sort(),
  );
  for (const slot of slots) assert.ok(slot.quantity > 0);
});

test("Inventory ignores zero/negative quantities and unknown item ids instead of throwing", () => {
  const inventory = new Inventory({ kaifukuyaku: 2, dokukeshi: 0, unknown_item: 5 });
  assert.deepEqual(inventory.getSlots(), [{ itemId: "kaifukuyaku", quantity: 2 }]);
});

test("an empty Inventory reports no slots", () => {
  assert.deepEqual(new Inventory().getSlots(), []);
});

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}

test("experience starts at level one, levels up by the confirmed Lv1-25 EXP table, and persists", () => {
  const repository = new GameStateRepository(new MemoryStorage());
  const progression = new CharacterProgression(repository);
  assert.equal(getExperienceToNextLevel(1), 12);
  assert.deepEqual(progression.getStats("hero").level, 1);
  assert.deepEqual(progression.awardExperience(["hero", "tarosa"], 11).leveledUpMemberIds, [], "11 EXP is not yet enough for Lv2 (needs 12 cumulative)");
  assert.deepEqual(progression.awardExperience(["hero", "tarosa"], 1).leveledUpMemberIds, ["hero", "tarosa"]);
  assert.deepEqual(progression.getStats("hero").level, 2);
  assert.deepEqual(progression.getStats("hero").exp, 0);
  assert.equal(progression.getStats("hero").expToNextLevel, 23);
  assert.equal(new CharacterProgression(repository).getStats("tarosa").level, 2);
});

test("inventory reward additions persist without removing the initial stock", () => {
  const repository = new GameStateRepository(new MemoryStorage());
  const inventory = new Inventory(DEV_STARTING_ITEMS, repository);
  assert.equal(inventory.add("kaifukuyaku"), true);
  assert.equal(inventory.add("dokukeshi", 2), true);
  assert.deepEqual(new Inventory(DEV_STARTING_ITEMS, repository).getSlots().sort((a, b) => a.itemId.localeCompare(b.itemId)), [
    { itemId: "dokukeshi", quantity: 3 },
    { itemId: "kaifukuyaku", quantity: 4 },
  ]);
});
