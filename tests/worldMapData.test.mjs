import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { WORLD_MAP_MARKER_LAYOUT, getWorldMapMarkerStyle } from "../src/config/worldMapPresentation.ts";
import { MAPS } from "../src/config/maps.ts";
import {
  isWorldMapDestinationTravelReady,
  getWorldMapDestinationVisibility,
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
  const mainRoute = definitions.filter((destination) => destination.routeKind === "main");
  assert.equal(mainRoute.length, 20);
  assert.deepEqual(mainRoute.map((destination) => destination.name), [
    "はじまりのばしょ", "はじまりのまち", "ビーエのもり", "ビーエのむら", "レインランドのもり",
    "レインランドじょうかまち", "まじんのどうくつ", "ザボンのむら", "いわやまのどうくつ", "かくれざと",
    "みずうみの古城", "港町ダコハ", "コタンカイムの洞窟", "ポサロ城", "ふっかつのほこら",
    "デーマスのとう", "ぬまちのどうくつ", "いしのまち", "バトラスのとりで", "オロチへの道",
  ]);
  assert.equal(mainRoute.some((destination) => /ザボンの狩り場|ダコハ海岸|バトラスのとりで周辺/.test(destination.name)), false);
  assert.equal(mainRoute.some((destination) => destination.name === "レインランドじょう" || destination.name === "オロチのしろ" || destination.name === "最終地点"), false);
  for (const destination of mainRoute) {
    assert.equal(destination.positionStatus, "FINAL_POSITION");
    assert.equal(typeof destination.labelOffset.x, "number");
    assert.equal(typeof destination.labelOffset.y, "number");
  }
  assert.equal(mainRoute[2].id, "destination_starting_forest");
  assert.equal(mainRoute[2].name, "ビーエのもり");
});

test("implementation status separates real destinations from blue planned geography", () => {
  const { manifest, definitions } = loadWorldMap();
  const mainRoute = definitions.filter((destination) => destination.routeKind === "main");
  const implemented = mainRoute.filter((destination) => destination.implementationStatus === "implemented");
  const planned = mainRoute.filter((destination) => destination.implementationStatus === "planned");
  // 2026-09-27: No.14ポサロ城・No.17ぬまちのどうくつ・No.19バトラスのとりでを世界地図から往復可能な実装済み地点へ更新。
  // 2026-09-27: No.18いしのまちも世界地図から往復できる実装済み地点へ更新。残る予定地点はオロチへの道だけ。
  assert.equal(implemented.length, 19);
  assert.equal(planned.length, 1);
  assert.ok(implemented.every((destination) => typeof destination.targetMapId === "string" && typeof destination.targetSpawnId === "string"));
  assert.ok(planned.every((destination) => destination.targetMapId === null && destination.targetSpawnId === null));
  assert.ok(Object.values(manifest.entryDestinationIds).every((id) => definitions.some((destination) => destination.implementationStatus === "implemented" && destination.id === id)));

  const resolved = resolveWorldMapDestinations(definitions, readInterimUnlockedFlags(manifest));
  const rainlandForest = resolved.find((destination) => destination.id === "destination_rainland_forest");
  const rainlandCastleTown = resolved.find((destination) => destination.id === "destination_rainland_castle_town");
  assert.equal(rainlandForest?.unlockFlag, "story.rainland_forest_unlocked");
  assert.equal(rainlandForest?.unlocked, false, "the forest opens only after Bie Village tells the player the castle road goes through it");
  assert.equal(rainlandForest?.displayName, "？？？");
  assert.equal(isWorldMapDestinationTravelReady(rainlandForest), false);
  assert.equal(rainlandCastleTown?.unlockFlag, "story.rainland_castle_town_unlocked");
  assert.equal(rainlandCastleTown?.unlocked, false, "the forest boss is the first real unlock source for Rainland's castle town");
  assert.equal(rainlandCastleTown?.displayName, "？？？");
  assert.equal(isWorldMapDestinationTravelReady(rainlandCastleTown), false);
  // 2026-09-27: ビーエのもりはぶきやの店主から場所を聞くまで？？？、不思議なとうはおじいさんと話すまで世界地図に現れない。
  const bieForest = resolved.find((destination) => destination.id === "destination_starting_forest");
  assert.equal(bieForest?.unlockFlag, "story.bie_forest_unlocked");
  assert.equal(bieForest?.unlocked, false, "the forest stays locked until the weapon shopkeeper tells the player where it is");
  assert.equal(bieForest?.displayName, "？？？");
  assert.equal(isWorldMapDestinationTravelReady(bieForest), false);
  assert.equal(resolved.some((destination) => destination.id === "destination_mysterious_tower"), false, "the interim state must not reveal the tower before the elder event");
  const afterWeaponShop = resolveWorldMapDestinations(definitions, new Set([...readInterimUnlockedFlags(manifest), "story.bie_forest_unlocked"]));
  const unlockedForest = afterWeaponShop.find((destination) => destination.id === "destination_starting_forest");
  assert.equal(unlockedForest?.displayName, "ビーエのもり");
  assert.equal(unlockedForest && isWorldMapDestinationTravelReady(unlockedForest), true);
  const afterElder = resolveWorldMapDestinations(definitions, new Set([...readInterimUnlockedFlags(manifest), "story.mysterious_tower_revealed"]));
  const revealedTower = afterElder.find((destination) => destination.id === "destination_mysterious_tower");
  assert.equal(revealedTower?.visibilityState, "UNKNOWN", "the elder event shows the special field without revealing its name");
  assert.equal(revealedTower?.displayName, "？？？");
  assert.equal(revealedTower && isWorldMapDestinationTravelReady(revealedTower), true);
  const storyGated = new Set(["destination_rainland_castle_town", "destination_starting_forest", "destination_rainland_forest"]);
  assert.ok(resolved.filter((destination) => destination.implementationStatus === "implemented" && !storyGated.has(destination.id)).every(isWorldMapDestinationTravelReady));
  const afterBieVillageTalk = resolveWorldMapDestinations(definitions, new Set([...readInterimUnlockedFlags(manifest), "story.rainland_forest_unlocked"]));
  const unlockedRainlandForest = afterBieVillageTalk.find((destination) => destination.id === "destination_rainland_forest");
  assert.equal(unlockedRainlandForest?.displayName, "レインランドのもり");
  assert.equal(unlockedRainlandForest && isWorldMapDestinationTravelReady(unlockedRainlandForest), true);
  assert.equal(afterBieVillageTalk.find((destination) => destination.id === "destination_rainland_castle_town")?.unlocked, false, "the forest flag must not unlock the castle town");
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
  assert.equal(resolveWorldMapEntryDestination(manifest, definitions, "from_mysterious_tower").id, "destination_mysterious_tower");
  const posaro = definitions.find((destination) => destination.id === "destination_posaro_castle");
  assert.deepEqual([posaro?.implementationStatus, posaro?.targetMapId, posaro?.targetSpawnId], ["implemented", "map_posaro_castle", "fromWorldMap"]);
  assert.equal(resolveWorldMapEntryDestination(manifest, definitions, "from_posaro_castle").id, "destination_posaro_castle");
  const fortress = definitions.find((destination) => destination.id === "destination_batras_fortress");
  assert.deepEqual([fortress?.implementationStatus, fortress?.targetMapId, fortress?.targetSpawnId], ["implemented", "map_batorasu_fortress", "fromWorldMap"]);
  assert.equal(resolveWorldMapEntryDestination(manifest, definitions, "from_batorasu_fortress").id, "destination_batras_fortress");
  const stoneTown = definitions.find((destination) => destination.id === "destination_stone_town");
  assert.deepEqual([stoneTown?.implementationStatus, stoneTown?.targetMapId, stoneTown?.targetSpawnId], ["implemented", "map_stone_town", "fromWorldMap"]);
  assert.equal(resolveWorldMapEntryDestination(manifest, definitions, "from_stone_town").id, "destination_stone_town");
});

test("mysterious tower is a special HIDDEN → UNKNOWN → DISCOVERED route without changing the 20 official points", () => {
  const { definitions } = loadWorldMap();
  const tower = definitions.find((destination) => destination.id === "destination_mysterious_tower");
  assert.equal(tower?.routeKind, "special");
  assert.equal(tower?.targetMapId, "map_mysterious_tower_exterior");
  assert.equal(tower?.targetSpawnId, "fromWorldMap");
  assert.equal(tower && getWorldMapDestinationVisibility(tower, new Set()), "HIDDEN");
  assert.equal(resolveWorldMapDestinations(definitions, new Set()).some((destination) => destination.id === "destination_mysterious_tower"), false);

  const revealedFlags = new Set(["story.mysterious_tower_revealed"]);
  const unknown = resolveWorldMapDestinations(definitions, revealedFlags).find((destination) => destination.id === "destination_mysterious_tower");
  assert.equal(unknown?.visibilityState, "UNKNOWN");
  assert.equal(unknown?.displayName, "？？？");
  assert.equal(unknown && isWorldMapDestinationTravelReady(unknown), true, "the revealed unknown point can be entered for discovery");

  const discovered = resolveWorldMapDestinations(definitions, new Set([...revealedFlags, "story.mysterious_tower_discovered"])).find((destination) => destination.id === "destination_mysterious_tower");
  assert.equal(discovered?.visibilityState, "DISCOVERED");
  assert.equal(discovered?.displayName, "不思議なとう");
  assert.equal(getWorldMapMarkerStyle("implemented", true, false, "UNKNOWN").coreFill, getWorldMapMarkerStyle("implemented", false, false).coreFill);
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
