import assert from "node:assert/strict";
import test from "node:test";
import { getDialogue } from "../src/data/dialogues.ts";
import { PartyTrail } from "../src/systems/PartyTrail.ts";
import { GameStateRepository } from "../src/systems/GameStateRepository.ts";
import { PartySystem } from "../src/systems/PartySystem.ts";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}

test("party begins with hero, enforces Tarosa then Mirei, and persists its fixed order", () => {
  const repository = new GameStateRepository(new MemoryStorage());
  const party = new PartySystem(repository);

  assert.deepEqual(party.getPartyOrder(), ["hero"]);
  assert.equal(party.addMember("mirei"), false);
  assert.equal(party.addMember("tarosa"), true);
  assert.equal(party.addMember("tarosa"), false);
  assert.equal(party.addMember("mirei"), true);
  assert.deepEqual(party.getActiveMembers().map((member) => [member.id, member.displayName, member.joined, member.order]), [
    ["hero", "主人公", true, 0],
    ["tarosa", "タロサ", true, 1],
    ["mirei", "ミレイ", true, 2],
  ]);
  assert.deepEqual(new PartySystem(repository).getPartyOrder(), ["hero", "tarosa", "mirei"]);
});

test("old and malformed party save data safely restore hero-only or the valid prefix", () => {
  const oldSave = new MemoryStorage();
  oldSave.setItem("mq0.game-state", JSON.stringify({ version: 1, player: { money: 50 }, cards: { obtainedJumpCards: [] } }));
  assert.deepEqual(new GameStateRepository(oldSave).load().party.joinedMemberIds, ["hero"]);

  const malformedSave = new MemoryStorage();
  malformedSave.setItem("mq0.game-state", JSON.stringify({
    version: 1, player: { money: 50 }, cards: { obtainedJumpCards: [] }, party: { joinedMemberIds: ["mirei", "unknown"] },
  }));
  assert.deepEqual(new GameStateRepository(malformedSave).load().party.joinedMemberIds, ["hero"]);
});

test("DEV join dialogues gate Mirei on Tarosa and do not request a duplicate join", () => {
  const withMembers = (...members) => ({ hasMember: (id) => members.includes(id) });
  assert.equal(getDialogue("dev_party_join_tarosa", withMembers("hero")).afterDialogue?.eventId, "DEV_PARTY_JOIN_TAROSA");
  assert.equal(getDialogue("dev_party_join_tarosa", withMembers("hero", "tarosa")).afterDialogue, undefined);
  assert.equal(getDialogue("dev_party_join_mirei", withMembers("hero")).afterDialogue, undefined);
  assert.equal(getDialogue("dev_party_join_mirei", withMembers("hero", "tarosa")).afterDialogue?.eventId, "DEV_PARTY_JOIN_MIREI");
  assert.equal(getDialogue("dev_party_join_mirei", withMembers("hero", "tarosa", "mirei")).afterDialogue, undefined);
});

test("party trail uses the leader's route at corners instead of diagonal shortcuts", () => {
  const trail = new PartyTrail({ x: 0, y: 0, facing: "right" });
  assert.deepEqual(trail.getPointBehind(42), { x: -42, y: 0, facing: "right" });
  trail.record({ x: 50, y: 0, facing: "right" });
  trail.record({ x: 50, y: -50, facing: "up" });
  assert.deepEqual(trail.getPointBehind(25), { x: 50, y: -25, facing: "up" });
  assert.deepEqual(trail.getPointBehind(60), { x: 40, y: 0, facing: "right" });
});
