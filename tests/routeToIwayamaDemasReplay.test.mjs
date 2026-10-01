import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { BattleSystem } from "../src/battle/BattleSystem.ts";
import { MAPS } from "../src/config/maps.ts";
import { STORY_FLAGS } from "../src/config/storyFlags.ts";
import { DEV_BATTLE_MONSTERS } from "../src/data/monsters.ts";
import { getDialogue } from "../src/data/dialogues.ts";
import { readImageMapEvents, readImageMapObjects } from "../src/systems/ImageMapData.ts";
import {
  isWorldMapDestinationTravelReady,
  readInterimUnlockedFlags,
  readWorldMapDestinations,
  readWorldMapManifest,
  resolveWorldMapDestinations,
} from "../src/systems/WorldMapData.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const json = (file) => JSON.parse(readFileSync(file, "utf-8"));
const worldMapDirectory = path.join(ROOT, "assets/maps/world_map");
const worldMap = readWorldMapManifest(json(path.join(worldMapDirectory, "map.json")));
const destinations = readWorldMapDestinations(json(path.join(worldMapDirectory, "destinations.json")), worldMap);

function destinationIsReady(flags, id) {
  const destination = resolveWorldMapDestinations(destinations, flags).find((candidate) => candidate.id === id);
  return Boolean(destination && isWorldMapDestinationTravelReady(destination));
}

/** A stable per-run source keeps target selection varied without making a failed replay flaky. */
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function loseToDemas(run) {
  const battle = new BattleSystem(DEV_BATTLE_MONSTERS.demas.devParty, DEV_BATTLE_MONSTERS.demas, seededRandom(run + 1));
  let steps = 0;
  // Choosing flee against a boss advances a real enemy turn but cannot accidentally win the encounter.
  while (battle.getSnapshot().state !== "DEFEAT" && steps < 300) {
    const snapshot = battle.getSnapshot();
    battle.confirm(snapshot.state === "COMMAND" ? "flee" : undefined);
    steps += 1;
  }
  const result = battle.getSnapshot();
  assert.equal(result.state, "DEFEAT", `run ${run + 1} reaches the intended loss state`);
  assert.ok(result.party.every((member) => member.hp === 0), `run ${run + 1} leaves no living party member`);
  assert.ok(steps < 300, `run ${run + 1} settles without an input loop`);
}

test("100 replays: Starting Place -> Zabon -> Iwayama 2F Demas -> defeat", () => {
  const startingPlaceEvents = readImageMapEvents(json(path.join(ROOT, "assets/maps/starting_place/events.json")));
  assert.equal(startingPlaceEvents.find((event) => event.id === "event_no01_north_gate")?.commands[0].type, "world-map");

  const cave1Events = readImageMapEvents(json(path.join(ROOT, "assets/maps/iwayama_cave_1/events.json")));
  const stairs = cave1Events.find((event) => event.id === "event_iwayama_cave_1_stairs_to_2f");
  assert.deepEqual(stairs?.commands[0], { type: "transfer", targetMapId: "map_iwayama_cave_2", targetSpawnId: "fromCaveFloor1" });
  assert.ok(MAPS.map_iwayama_cave_2.spawns.fromCaveFloor1);

  const cave2Objects = readImageMapObjects(json(path.join(ROOT, "assets/maps/iwayama_cave_2/objects.json")));
  const demas = cave2Objects.find((object) => object.id === "boss_iwayama_demo_demas");
  assert.deepEqual(
    { type: demas?.type, monsterId: demas?.monsterId, blocking: demas?.blocking },
    { type: "boss", monsterId: "demas", blocking: true },
  );

  for (let run = 0; run < 100; run += 1) {
    const flags = new Set(readInterimUnlockedFlags(worldMap));
    // This flag is written only after the preceding Majin battle and the king-report dialogue close.
    flags.add(STORY_FLAGS.majinCaveReportedToKing);
    assert.equal(destinationIsReady(flags, "destination_zabon_village"), true, `run ${run + 1} unlocks Zabon after the report`);
    assert.equal(destinationIsReady(flags, "destination_iwayama_cave"), false, `run ${run + 1} keeps Iwayama locked before Tarosa responds`);

    const tarosaDialogue = getDialogue("npc_zabon_tarosa", undefined, { hasFlag: (flag) => flags.has(flag) });
    assert.deepEqual(tarosaDialogue.afterDialogue?.flags, [STORY_FLAGS.tarosaRefusedRequest]);
    flags.add(STORY_FLAGS.tarosaRefusedRequest);
    assert.equal(destinationIsReady(flags, "destination_iwayama_cave"), true, `run ${run + 1} unlocks Iwayama after Tarosa's refusal`);

    // The first cave entry plays the rescue narration and joins Tarosa before the cave route continues.
    flags.add(STORY_FLAGS.tarosaJoinedAtIwayama);
    assert.equal(flags.has(STORY_FLAGS.tarosaJoinedAtIwayama), true);
    loseToDemas(run);
  }
});
