import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { MAPS } from "../src/config/maps.ts";
import {
  readInterimUnlockedFlags,
  readWorldMapDestinations,
  readWorldMapManifest,
  resolveWorldMapDestinations,
  resolveWorldMapEntryDestination,
} from "../src/systems/WorldMapData.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_DIRECTORY = path.join(REPO_ROOT, "assets/maps/world_map");

test("world-map manifest uses an original high-resolution background and destinations file", () => {
  const manifest = readWorldMapManifest(JSON.parse(readFileSync(path.join(MAP_DIRECTORY, "map.json"), "utf-8")));
  assert.equal(manifest.type, "point-selection-world-map");
  assert.equal(manifest.coordinateSpace, "background-pixels");
  assert.equal(manifest.assetStatus, "CURRENT");
  assert.equal(manifest.width / manifest.height, 4 / 3);
  assert.ok(manifest.width >= 1440);
  assert.ok(existsSync(path.join(MAP_DIRECTORY, manifest.background)));
  assert.ok(existsSync(path.join(MAP_DIRECTORY, manifest.destinations)));
});

test("world-map destinations declare visibility and flag-based unlock conditions", () => {
  const manifest = readWorldMapManifest(JSON.parse(readFileSync(path.join(MAP_DIRECTORY, "map.json"), "utf-8")));
  const definitions = readWorldMapDestinations(JSON.parse(readFileSync(path.join(MAP_DIRECTORY, "destinations.json"), "utf-8")), manifest);
  assert.equal(definitions.length, 7);
  assert.equal(definitions[0].unlockFlag, null);
  assert.equal(definitions[1].unlockFlag, null);
  // はじまりのもりは既存No.01/No.02と同じ「常時選択可能」を現時点の実装状態とする(unlockFlag: null)。
  // データ形式としてunlockFlagは保持しつつ、値そのものはSaveSystem接続後の差し替え対象。
  assert.equal(definitions[2].unlockFlag, null);
  // ビーエのむらはNo.03の正式地域のため、実フラグを持たせる(PHASE_WORLD_MAP_POINT_SELECTION.mdの
  // 「No.03以降はSaveSystemのflags連動で追加する」方針どおり)。SaveSystemがflagsを持つまでは、
  // 本番WorldMapSceneもDATA_CONTRACTS.md §8.1に従いdevelopmentUnlockedFlagsを暫定の解放状態として使う。
  assert.equal(definitions[3].unlockFlag, "story.bie_village_unlocked");
  // レインランドのもりは、はじまりのもりと同じ追加フィールドとして常時選択可能(unlockFlag: null)。
  // 正式な解放条件はTBD(TBD_REGISTRY.md)のため、実フラグ名はまだ定めない。
  assert.equal(definitions[4].id, "destination_rainland_forest");
  assert.equal(definitions[4].unlockFlag, null);
  // レインランドじょうかまちも、追加フィールドとして常時選択可能。正式な解放条件はTBD。
  assert.equal(definitions[5].id, "destination_rainland_castle_town");
  assert.equal(definitions[5].unlockFlag, null);
  assert.equal(definitions[6].id, "destination_majin_cave");
  assert.equal(definitions[6].targetMapId, "map_08_majin_cave");
  assert.equal(definitions[6].unlockFlag, null);
  assert.deepEqual(manifest.developmentUnlockedFlags, ["story.bie_village_unlocked"]);
  assert.equal(manifest.entryDestinationIds.from_starting_place, "destination_starting_place");
  assert.equal(manifest.entryDestinationIds.from_starting_town, "destination_starting_town");
  assert.equal(manifest.entryDestinationIds.from_starting_forest, "destination_starting_forest");
  assert.equal(manifest.entryDestinationIds.from_bie_village, "destination_bie_village");
  assert.equal(manifest.entryDestinationIds.from_rainland_forest, "destination_rainland_forest");
  assert.equal(manifest.entryDestinationIds.from_rainland_castle_town, "destination_rainland_castle_town");
  assert.equal(manifest.entryDestinationIds.from_majin_cave, "destination_majin_cave");

  const defaultView = resolveWorldMapDestinations(definitions, new Set(manifest.developmentUnlockedFlags));
  assert.deepEqual(defaultView.map((destination) => destination.unlocked), [true, true, true, true, true, true, true]);
  assert.deepEqual(defaultView.map((destination) => destination.displayName), ["はじまりのばしょ", "はじまりのまち", "はじまりのもり", "ビーエのむら", "レインランドのもり", "レインランドじょうかまち", "まじんのどうくつ"]);

  // 本番WorldMapSceneが使う暫定の解放状態(readInterimUnlockedFlags)では、ビーエのむらも選択できる。
  const productionView = resolveWorldMapDestinations(definitions, readInterimUnlockedFlags(manifest));
  assert.deepEqual(productionView.map((destination) => destination.unlocked), [true, true, true, true, true, true, true]);
  assert.equal(productionView[3].displayName, "ビーエのむら");
  assert.equal(productionView[3].targetMapId, "map_03_bie_village");

  // フラグが1つも立っていない状態(将来のSaveSystemの序盤)では、ビーエのむらだけ？？？のままロックされる。
  const noProgressView = resolveWorldMapDestinations(definitions, new Set());
  assert.deepEqual(noProgressView.map((destination) => destination.unlocked), [true, true, true, false, true, true, true]);
  assert.equal(noProgressView[3].displayName, "？？？");

  const lockedFixture = [{ ...definitions[1], unlockFlag: "world.starting_town_unlocked" }];
  const lockedTownView = resolveWorldMapDestinations(lockedFixture, new Set());
  assert.equal(lockedTownView[0].unlocked, false);
  assert.equal(lockedTownView[0].displayName, "？？？");
  assert.equal(resolveWorldMapDestinations([{ ...definitions[1], visible: false }], new Set()).length, 0);
});

test("currently unlockable world-map destinations resolve to registered local scenes and spawns", () => {
  const manifest = readWorldMapManifest(JSON.parse(readFileSync(path.join(MAP_DIRECTORY, "map.json"), "utf-8")));
  const definitions = readWorldMapDestinations(JSON.parse(readFileSync(path.join(MAP_DIRECTORY, "destinations.json"), "utf-8")), manifest);
  const destinations = resolveWorldMapDestinations(definitions, new Set(manifest.developmentUnlockedFlags));
  assert.equal(resolveWorldMapEntryDestination(manifest, definitions, "from_starting_place").id, "destination_starting_place");
  assert.equal(resolveWorldMapEntryDestination(manifest, definitions, "from_starting_town").id, "destination_starting_town");
  assert.equal(resolveWorldMapEntryDestination(manifest, definitions, "from_starting_forest").id, "destination_starting_forest");
  assert.equal(resolveWorldMapEntryDestination(manifest, definitions, "from_bie_village").id, "destination_bie_village");
  assert.equal(resolveWorldMapEntryDestination(manifest, definitions, "from_rainland_forest").id, "destination_rainland_forest");
  assert.equal(resolveWorldMapEntryDestination(manifest, definitions, "from_rainland_castle_town").id, "destination_rainland_castle_town");
  assert.equal(resolveWorldMapEntryDestination(manifest, definitions, "from_majin_cave").id, "destination_majin_cave");
  for (const destination of destinations.filter((candidate) => candidate.unlocked)) {
    assert.equal(destination.unlocked, true);
    assert.equal(destination.positionStatus, "DEV_PLACEHOLDER_POSITION");
    const target = MAPS[destination.targetMapId];
    assert.ok(target, `${destination.id} target map must exist`);
    assert.ok(target.spawns[destination.targetSpawnId], `${destination.id} target spawn must exist`);
    assert.equal(destination.targetSpawnId, "fromWorldMap");
  }
});
