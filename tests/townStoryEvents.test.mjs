import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isNpcPresent, MAPS } from "../src/config/maps.ts";
import { STORY_FLAGS } from "../src/config/storyFlags.ts";
import { DIALOGUES, getDialogue } from "../src/data/dialogues.ts";
import { isNpcDepartDialogueEvent, isStoryFlagsDialogueEvent } from "../src/events/BattleEventData.ts";
import { GameStateRepository } from "../src/systems/GameStateRepository.ts";
import { readInterimUnlockedFlags, readWorldMapDestinations, readWorldMapManifest, resolveWorldMapDestinations } from "../src/systems/WorldMapData.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEAPON_SHOPKEEPER = "npc_start_town_weapon_shopkeeper";
const TOWER_ELDER = "npc_start_town_tower_elder";
const HERB_DRIER = "npc_bie_village_herb_drier";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}

const noFlags = { hasFlag: () => false };
const party = { hasMember: () => false };

test("the weapon shopkeeper's first talk tells the player where Bie Forest is and saves its unlock flag when read", () => {
  const base = DIALOGUES[WEAPON_SHOPKEEPER];
  const first = getDialogue(WEAPON_SHOPKEEPER, party, noFlags);
  assert.ok(first);
  assert.equal(isStoryFlagsDialogueEvent(first.afterDialogue), true);
  assert.deepEqual(first.afterDialogue.flags, [STORY_FLAGS.bieForestUnlocked]);
  assert.equal(first.pages.length, base.pages.length + 1, "the first talk only adds one closing notice page");
  assert.deepEqual(first.pages.slice(0, base.pages.length), base.pages);
  assert.match(first.pages.at(-1), /ビーエのもり/);
  assert.equal(base.pages.some((page) => /にし/.test(page) && /もり/.test(page)), true, "the shopkeeper says which way the forest lies");
});

test("after the forest is unlocked the weapon shopkeeper only repeats his normal talk", () => {
  const unlocked = { hasFlag: (flag) => flag === STORY_FLAGS.bieForestUnlocked };
  const repeat = getDialogue(WEAPON_SHOPKEEPER, party, unlocked);
  assert.ok(repeat);
  assert.equal(repeat.afterDialogue, undefined);
  assert.deepEqual(repeat.pages, DIALOGUES[WEAPON_SHOPKEEPER].pages);
});

test("Bie Village's herb drier tells the castle road goes through Rainland Forest and saves its unlock flag when read", () => {
  const base = DIALOGUES[HERB_DRIER];
  const first = getDialogue(HERB_DRIER, party, noFlags);
  assert.ok(first);
  assert.equal(isStoryFlagsDialogueEvent(first.afterDialogue), true);
  assert.deepEqual(first.afterDialogue.flags, [STORY_FLAGS.rainlandForestUnlocked]);
  assert.equal(first.pages.length, base.pages.length + 1, "the first talk only adds one closing notice page");
  assert.deepEqual(first.pages.slice(0, base.pages.length), base.pages);
  assert.match(first.pages.at(-1), /レインランドのもり/);
  assert.equal(base.pages.some((page) => /レインランドじょう/.test(page) && /レインランドの　もり/.test(page)), true, "the talk says the road to the castle passes through the forest");
  for (const page of first.pages) assert.ok(page.split("\n").length <= 3, "each page fits the dialogue box");
  for (const forbidden of [/ジャンカード/, /あいことば/, /かいぶんしょ/]) {
    assert.equal(first.pages.some((page) => forbidden.test(page)), false);
  }
});

test("after the forest is unlocked Bie Village's herb drier only repeats her normal talk", () => {
  const unlocked = { hasFlag: (flag) => flag === STORY_FLAGS.rainlandForestUnlocked };
  const repeat = getDialogue(HERB_DRIER, party, unlocked);
  assert.ok(repeat);
  assert.equal(repeat.afterDialogue, undefined);
  assert.deepEqual(repeat.pages, DIALOGUES[HERB_DRIER].pages);
  assert.equal(getDialogue(WEAPON_SHOPKEEPER, party, unlocked).afterDialogue.flags[0], STORY_FLAGS.bieForestUnlocked, "the two first-talk unlocks are independent");
});

test("the herb drier is an existing Bie Village resident, so the unlock needs no new NPC", () => {
  const herbDrier = MAPS.map_03_bie_village.npcs.find((npc) => npc.dialogueId === HERB_DRIER);
  assert.ok(herbDrier);
  assert.equal(herbDrier.movement, undefined, "she stands in front of the shop, easy to find");
});

test("the tower elder explains, says he goes ahead, then departs while revealing the tower and consuming himself", () => {
  const dialogue = getDialogue(TOWER_ELDER, party, noFlags);
  assert.ok(dialogue);
  const event = dialogue.afterDialogue;
  assert.equal(isNpcDepartDialogueEvent(event), true);
  assert.equal(event.npcId, TOWER_ELDER);
  assert.deepEqual([...event.flags].sort(), [STORY_FLAGS.mysteriousTowerRevealed, STORY_FLAGS.towerElderTalked].sort());
  assert.match(dialogue.pages.at(-1), /さきに/, "the last page says he is going ahead");
  assert.match(dialogue.pages.at(-1), /あとから/, "the last page asks the player to come later");
  assert.equal(dialogue.pages.some((page) => /せかいちず/.test(page)), true, "the explanation points the player to the world map");
  // 台詞にジャンカード・あいことばなど、序盤で示唆してはいけない語を入れない。
  for (const forbidden of [/ジャンカード/, /あいことば/, /かいぶんしょ/]) {
    assert.equal(dialogue.pages.some((page) => forbidden.test(page)), false);
  }
});

test("the elder is a data-driven story NPC in No.02 whose departedFlag is the flag his event saves", () => {
  const elder = MAPS.map_02_starting_town.npcs.find((npc) => npc.id === TOWER_ELDER);
  assert.ok(elder);
  assert.equal(elder.role, "story");
  assert.equal(elder.spriteId, "villager_17", "he looks like the old man who waits at the tower");
  assert.equal(elder.movement, undefined, "he stands still");
  assert.equal(elder.dialogueId, TOWER_ELDER);
  assert.equal(elder.departedFlag, STORY_FLAGS.towerElderTalked);
  assert.equal(getDialogue(TOWER_ELDER, party, noFlags).afterDialogue.flags.includes(elder.departedFlag), true);

  assert.equal(isNpcPresent(elder, new Set()), true);
  assert.equal(isNpcPresent(elder, new Set([STORY_FLAGS.mysteriousTowerRevealed])), true, "only his own consumed flag makes him leave");
  assert.equal(isNpcPresent(elder, new Set([STORY_FLAGS.towerElderTalked])), false, "once the event is done he never returns");
  for (const other of MAPS.map_02_starting_town.npcs.filter((npc) => npc.id !== TOWER_ELDER)) {
    assert.equal(isNpcPresent(other, new Set([STORY_FLAGS.towerElderTalked])), true, `${other.id} is unaffected`);
  }
});

test("story flags are valid save keys, persist, and drive the world map (forest, tower) exactly as the events intend", () => {
  const manifest = readWorldMapManifest(JSON.parse(readFileSync(path.join(REPO_ROOT, "assets/maps/world_map/map.json"), "utf-8")));
  const definitions = readWorldMapDestinations(JSON.parse(readFileSync(path.join(REPO_ROOT, "assets/maps/world_map/destinations.json"), "utf-8")), manifest);
  const storage = new MemoryStorage();
  const repository = new GameStateRepository(storage);
  const viewOf = (id) => resolveWorldMapDestinations(definitions, new Set([...readInterimUnlockedFlags(manifest), ...new GameStateRepository(storage).getFlags()])).find((destination) => destination.id === id);

  assert.equal(viewOf("destination_starting_forest").unlocked, false);
  assert.equal(viewOf("destination_rainland_forest").unlocked, false);
  assert.equal(viewOf("destination_mysterious_tower"), undefined);

  repository.setFlag(STORY_FLAGS.bieForestUnlocked);
  assert.equal(viewOf("destination_starting_forest").unlocked, true);
  assert.equal(viewOf("destination_mysterious_tower"), undefined, "the forest info does not reveal the tower");

  assert.equal(viewOf("destination_rainland_forest").unlocked, false, "the weapon shop's forest info does not open Rainland Forest");
  repository.setFlag(STORY_FLAGS.rainlandForestUnlocked);
  assert.equal(viewOf("destination_rainland_forest").unlocked, true);
  assert.equal(viewOf("destination_rainland_castle_town").unlocked, false, "the forest is not the castle town");
  // 2026-09-27: レインランドのもり(その2)の奥の木こりから道を聞くと、レインランドじょうかまちが選べるようになる。
  repository.setFlag(STORY_FLAGS.rainlandCastleTownUnlocked);
  assert.equal(viewOf("destination_rainland_castle_town").unlocked, true, "the woodcutter's info opens the castle town");

  repository.setFlag(STORY_FLAGS.towerElderTalked);
  repository.setFlag(STORY_FLAGS.mysteriousTowerRevealed);
  assert.equal(viewOf("destination_mysterious_tower").visibilityState, "UNKNOWN");
  assert.equal(new GameStateRepository(storage).hasFlag(STORY_FLAGS.towerElderTalked), true);
});
