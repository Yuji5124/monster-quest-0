import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { WORLD_MAP_MARKER_LAYOUT, getWorldMapMarkerStyle } from "../src/config/worldMapPresentation.ts";
import { MAPS } from "../src/config/maps.ts";
import {
  isWorldMapDestinationTravelReady,
  readInterimUnlockedFlags,
  readWorldMapDestinations,
  readWorldMapManifest,
  resolveWorldMapDestinations,
  resolveWorldMapEntryDestination,
} from "../src/systems/WorldMapData.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_DIRECTORY = path.join(REPO_ROOT, "assets/maps/world_map");

function loadWorldMap() {
  const manifest = readWorldMapManifest(JSON.parse(readFileSync(path.join(MAP_DIRECTORY, "map.json"), "utf-8")));
  const definitions = readWorldMapDestinations(JSON.parse(readFileSync(path.join(MAP_DIRECTORY, "destinations.json"), "utf-8")), manifest);
  return { manifest, definitions };
}

test("world-map manifest preserves the 1448x1086 background coordinate space", () => {
  const { manifest } = loadWorldMap();
  assert.equal(manifest.type, "point-selection-world-map");
  assert.equal(manifest.coordinateSpace, "background-pixels");
  assert.equal(manifest.assetStatus, "CURRENT");
  assert.equal(manifest.width, 1448);
  assert.equal(manifest.height, 1086);
  assert.equal(manifest.width / manifest.height, 4 / 3);
  assert.ok(existsSync(path.join(MAP_DIRECTORY, manifest.background)));
  assert.ok(existsSync(path.join(MAP_DIRECTORY, manifest.destinations)));
});

test("world-map declares the 20 official points in play order with final label-aware positions", () => {
  const { definitions } = loadWorldMap();
  assert.equal(definitions.length, 20);
  assert.deepEqual(definitions.map((destination) => destination.name), [
    "はじまりのばしょ", "はじまりのまち", "ビーエのもり", "ビーエのむら", "レインランドのもり",
    "レインランドじょうかまち", "まじんのどうくつ", "ザボンのむら", "いわやまのどうくつ", "かくれざと",
    "みずうみの古城", "港町ダコハ", "コタンカイムの洞窟", "ポサロ城", "ふっかつのほこら",
    "デーマスのとう", "ぬまちのどうくつ", "いしのまち", "バトラスのとりで", "オロチへの道",
  ]);
  assert.equal(definitions.some((destination) => /ザボンの狩り場|ダコハ海岸|バトラスのとりで周辺/.test(destination.name)), false);
  assert.equal(definitions.some((destination) => destination.name === "レインランドじょう" || destination.name === "オロチのしろ" || destination.name === "最終地点"), false);
  for (const destination of definitions) {
    assert.equal(destination.positionStatus, "FINAL_POSITION");
    assert.equal(typeof destination.labelOffset.x, "number");
    assert.equal(typeof destination.labelOffset.y, "number");
  }
  assert.equal(definitions[2].id, "destination_starting_forest");
  assert.equal(definitions[2].name, "ビーエのもり");
});

test("implementation status separates real destinations from blue planned geography", () => {
  const { manifest, definitions } = loadWorldMap();
  const implemented = definitions.filter((destination) => destination.implementationStatus === "implemented");
  const planned = definitions.filter((destination) => destination.implementationStatus === "planned");
  assert.equal(implemented.length, 10);
  assert.equal(planned.length, 10);
  assert.ok(implemented.every((destination) => typeof destination.targetMapId === "string" && typeof destination.targetSpawnId === "string"));
  assert.ok(planned.every((destination) => destination.targetMapId === null && destination.targetSpawnId === null));
  assert.ok(Object.values(manifest.entryDestinationIds).every((id) => implemented.some((destination) => destination.id === id)));

  const resolved = resolveWorldMapDestinations(definitions, readInterimUnlockedFlags(manifest));
  const rainlandForest = resolved.find((destination) => destination.id === "destination_rainland_forest");
  const rainlandCastleTown = resolved.find((destination) => destination.id === "destination_rainland_castle_town");
  assert.equal(rainlandForest?.unlockFlag, null);
  assert.equal(rainlandForest?.unlocked, true, "the forest remains an always-selectable destination");
  assert.equal(rainlandCastleTown?.unlockFlag, "story.rainland_castle_town_unlocked");
  assert.equal(rainlandCastleTown?.unlocked, false, "the forest boss is the first real unlock source for Rainland's castle town");
  assert.equal(rainlandCastleTown?.displayName, "？？？");
  assert.equal(isWorldMapDestinationTravelReady(rainlandCastleTown), false);
  assert.ok(resolved.filter((destination) => destination.implementationStatus === "implemented" && destination.id !== "destination_rainland_castle_town").every(isWorldMapDestinationTravelReady));
  const legacyForestUnlock = resolveWorldMapDestinations(definitions, new Set([...readInterimUnlockedFlags(manifest), "story.rainland_forest_unlocked"]));
  assert.equal(legacyForestUnlock.find((destination) => destination.id === "destination_rainland_castle_town")?.unlocked, false, "an old forest-only flag must not unlock the castle town");
  const afterBoss = resolveWorldMapDestinations(definitions, new Set([...readInterimUnlockedFlags(manifest), "story.rainland_castle_town_unlocked"]));
  assert.equal(afterBoss.find((destination) => destination.id === "destination_rainland_castle_town")?.unlocked, true);
  assert.ok(resolved.filter((destination) => destination.implementationStatus === "planned").every((destination) => !isWorldMapDestinationTravelReady(destination)));

  const plannedStyle = getWorldMapMarkerStyle("planned", true, false);
  const implementedStyle = getWorldMapMarkerStyle("implemented", true, false);
  const lockedStyle = getWorldMapMarkerStyle("implemented", false, false);
  assert.equal(WORLD_MAP_MARKER_LAYOUT.ringRadius, 13);
  assert.equal(WORLD_MAP_MARKER_LAYOUT.coreRadius, 6);
  assert.equal(WORLD_MAP_MARKER_LAYOUT.hitSize, 44);
  assert.equal(plannedStyle.coreFill, 0x168cff);
  assert.equal(plannedStyle.labelColor, "#8dccff");
  assert.notEqual(plannedStyle.coreFill, implementedStyle.coreFill);
  assert.notEqual(plannedStyle.coreFill, lockedStyle.coreFill);
  assert.equal(getWorldMapMarkerStyle("implemented", true, true).coreFill, 0xffc34d);
});

test("implemented destinations resolve to registered scenes and spawns, while planned destinations cannot transition", () => {
  const { manifest, definitions } = loadWorldMap();
  const mainSource = readFileSync(path.join(REPO_ROOT, "src/main.ts"), "utf-8");
  for (const destination of definitions.filter((candidate) => candidate.implementationStatus === "implemented")) {
    const target = MAPS[destination.targetMapId];
    assert.ok(target, `${destination.id} target map must exist`);
    assert.ok(target.spawns[destination.targetSpawnId], `${destination.id} target spawn must exist`);
    assert.match(mainSource, new RegExp(`\\b${target.sceneKey}\\b`), `${destination.id} scene must be registered by main.ts`);
  }
  for (const destination of definitions.filter((candidate) => candidate.implementationStatus === "planned")) {
    assert.equal(destination.targetMapId, null);
    assert.equal(destination.targetSpawnId, null);
  }
  assert.equal(resolveWorldMapEntryDestination(manifest, definitions, "from_starting_place").id, "destination_starting_place");
  assert.equal(resolveWorldMapEntryDestination(manifest, definitions, "from_starting_town").id, "destination_starting_town");
  assert.equal(resolveWorldMapEntryDestination(manifest, definitions, "from_starting_forest").id, "destination_starting_forest");
  assert.equal(resolveWorldMapEntryDestination(manifest, definitions, "from_bie_village").id, "destination_bie_village");
  assert.equal(resolveWorldMapEntryDestination(manifest, definitions, "from_rainland_forest").id, "destination_rainland_forest");
  assert.equal(resolveWorldMapEntryDestination(manifest, definitions, "from_rainland_castle_town").id, "destination_rainland_castle_town");
  assert.equal(resolveWorldMapEntryDestination(manifest, definitions, "from_majin_cave").id, "destination_majin_cave");
  assert.equal(resolveWorldMapEntryDestination(manifest, definitions, "from_hidden_village").id, "destination_hidden_village");
});

test("story-locked implemented destinations retain the existing unknown non-travel state", () => {
  const { definitions } = loadWorldMap();
  const lockedView = resolveWorldMapDestinations([{ ...definitions[3], unlockFlag: "story.bie_village_unlocked" }], new Set());
  assert.equal(lockedView[0].implementationStatus, "implemented");
  assert.equal(lockedView[0].unlocked, false);
  assert.equal(lockedView[0].displayName, "？？？");
  assert.equal(isWorldMapDestinationTravelReady(lockedView[0]), false);
});

test("destination parser rejects a planned point with a non-null Scene target", () => {
  const { manifest, definitions } = loadWorldMap();
  const invalid = {
    formatVersion: 2,
    destinations: [{ ...definitions.find((destination) => destination.implementationStatus === "planned"), targetMapId: "map_01_starting_place", targetSpawnId: "fromWorldMap" }],
  };
  assert.throws(() => readWorldMapDestinations(invalid, manifest), /planned world map destinations must set targetMapId and targetSpawnId to null/);
});
