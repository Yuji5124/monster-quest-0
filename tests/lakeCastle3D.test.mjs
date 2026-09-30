import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  LAKE_CASTLE_3D_SCENE_KEY,
  LAKE_CASTLE_FLOORS,
  lakeCastleCellAt,
  lakeCastleFloorFromQuery,
  lakeCastleIsWalkable,
  lakeCastleZoneContains,
} from "../src/config/lakeCastle3D.ts";
import { ENCOUNTER_TABLES } from "../src/data/encounterTables.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (file) => readFileSync(path.join(REPO_ROOT, file), "utf-8");

function pointIsWalkable(floor, point) {
  return lakeCastleIsWalkable(floor, Math.floor(point.x), Math.floor(point.z));
}

function canReachZone(floor, start, zone) {
  const queue = [[Math.floor(start.x), Math.floor(start.z)]];
  const seen = new Set();
  while (queue.length > 0) {
    const [x, z] = queue.shift();
    const key = `${x},${z}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (lakeCastleZoneContains(zone, x + 0.5, z + 0.5)) return true;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const nz = z + dz;
      if (lakeCastleIsWalkable(floor, nx, nz)) queue.push([nx, nz]);
    }
  }
  return false;
}

test("No.11 has three independent compact floor plans with valid player spawns", () => {
  assert.equal(LAKE_CASTLE_3D_SCENE_KEY, "LakeCastle3DScene");
  for (const floorId of [1, 2, 3]) {
    const floor = LAKE_CASTLE_FLOORS[floorId];
    assert.ok(floor.width >= 40 && floor.height >= 35);
    assert.equal(floor.cells.length, floor.width * floor.height);
    assert.ok(Object.values(floor.spawns).every((spawn) => pointIsWalkable(floor, spawn)));
    assert.ok(floor.features.some((feature) => feature.kind === "waterfall"));
    assert.ok(floor.visualPalette.fogDensity > 0);
    assert.ok(floor.visualPalette.accentLightColor > 0);
  }
  assert.equal(LAKE_CASTLE_FLOORS[2].ancientInscription !== undefined, true);
  assert.equal(LAKE_CASTLE_FLOORS[2].features.filter((feature) => feature.kind === "reader_mark").length, 1);
  assert.equal(LAKE_CASTLE_FLOORS[3].sanctuary !== undefined, true);
  assert.equal(LAKE_CASTLE_FLOORS[1].transitions[0].requiresMoveMagic, true);
  assert.equal(LAKE_CASTLE_FLOORS[1].features.filter((feature) => feature.kind === "water_gate").length, 1);
  assert.deepEqual(LAKE_CASTLE_FLOORS[1].features.filter((feature) => feature.kind === "navigation_beacon").map((feature) => feature.destinationFloor), [2]);
  assert.deepEqual(LAKE_CASTLE_FLOORS[2].features.filter((feature) => feature.kind === "navigation_beacon").map((feature) => feature.destinationFloor), [1, 3]);
  assert.deepEqual(LAKE_CASTLE_FLOORS[3].features.filter((feature) => feature.kind === "navigation_beacon").map((feature) => feature.destinationFloor), [2]);
  for (const floorId of [1, 2, 3]) {
    const floor = LAKE_CASTLE_FLOORS[floorId];
    for (const beacon of floor.features.filter((feature) => feature.kind === "navigation_beacon")) {
      assert.equal(pointIsWalkable(floor, beacon), true, `${floorId}F beacon is placed on the walkable route`);
      assert.equal(floor.transitions.some((transition) => transition.targetFloor === beacon.destinationFloor), true, `${floorId}F beacon has a real destination`);
    }
  }
  assert.deepEqual(LAKE_CASTLE_FLOORS[1].features.filter((feature) => feature.kind === "stairway").map((feature) => feature.destinationFloor), [2]);
  assert.deepEqual(LAKE_CASTLE_FLOORS[2].features.filter((feature) => feature.kind === "stairway").map((feature) => feature.destinationFloor), [1, 3]);
  assert.deepEqual(LAKE_CASTLE_FLOORS[3].features.filter((feature) => feature.kind === "stairway").map((feature) => feature.destinationFloor), [2]);
});

test("all three floors connect in both directions, and every stair is reachable without entering water", () => {
  for (const floorId of [1, 2, 3]) {
    const floor = LAKE_CASTLE_FLOORS[floorId];
    for (const transition of floor.transitions) {
      const start = Object.values(floor.spawns)[0];
      assert.equal(canReachZone(floor, start, transition), true, `${floorId}F reaches its stair to ${transition.targetFloor}F`);
      const target = LAKE_CASTLE_FLOORS[transition.targetFloor];
      assert.ok(target.spawns[transition.targetSpawnId], `${transition.targetFloor}F owns the destination spawn`);
    }
  }
  assert.equal(lakeCastleIsWalkable(LAKE_CASTLE_FLOORS[1], 0, 0), false, "water is never a walkable collision cell");
  assert.equal(lakeCastleCellAt(LAKE_CASTLE_FLOORS[1], -1, 4), 0, "outside the structure is water, not an escapable floor");
});

test("the 3D Scene keeps exact floor, position and yaw across the shared BattleScene return contract", () => {
  const lakeScene = source("src/scenes/LakeCastle3DScene.ts");
  const battleScene = source("src/scenes/BattleScene.ts");
  const battleContract = source("src/events/BattleEventData.ts");
  assert.match(lakeScene, /beginBattleEntrance\(this, this\.actions, event\)/);
  assert.match(lakeScene, /returnSceneKey: LAKE_CASTLE_3D_SCENE_KEY/);
  assert.match(lakeScene, /returnSpawnX: this\.position\.x/);
  assert.match(lakeScene, /returnSpawnY: this\.position\.z/);
  assert.match(lakeScene, /returnFloor: this\.floorId/);
  assert.match(lakeScene, /returnYaw: this\.yaw/);
  assert.match(battleContract, /returnYaw\?: number/);
  assert.match(battleContract, /returnFloor\?: number/);
  assert.match(battleScene, /spawnYaw: event\.returnYaw/);
  assert.match(battleScene, /floor: event\.returnFloor/);
});

test("the Scene uses fixed camera height and ceiling panels, PointerLock, mobile controls, and event gates", () => {
  const lakeScene = source("src/scenes/LakeCastle3DScene.ts");
  const storyFlags = source("src/config/storyFlags.ts");
  assert.match(lakeScene, /CanvasTexture\(source\)/);
  assert.match(lakeScene, /TextureLoader/);
  assert.match(lakeScene, /lakeCastleStoneTextureUrl/);
  assert.match(lakeScene, /lakeCastleWaterTextureUrl/);
  assert.match(lakeScene, /lakeCastleGlassTextureUrl/);
  assert.doesNotMatch(lakeScene, /function drawStoneCanvas/);
  assert.match(lakeScene, /const CEILING_HEIGHT =/);
  assert.match(lakeScene, /matrices\.ceiling\.push/);
  assert.match(lakeScene, /matrices\.ceilingBeam\.push/);
  assert.match(lakeScene, /const ceilingStone = configureTexture/);
  assert.match(lakeScene, /view\.camera\.position\.set\(this\.position\.x, LAKE_CASTLE_3D_SETTINGS\.eyeHeight, this\.position\.z\)/);
  assert.doesNotMatch(lakeScene, /Math\.sin\(time \* 8\)/);
  assert.doesNotMatch(lakeScene, /texture\.offset\.x = time/);
  assert.match(lakeScene, /texture\.offset\.y = -time/);
  assert.match(lakeScene, /requestPointerLock/);
  assert.match(lakeScene, /this\.sys\.game\.device\.input\.touch/);
  assert.match(lakeScene, /STORY_FLAGS\.lakeCastleAncientInscriptionRead/);
  assert.match(lakeScene, /STORY_FLAGS\.lakeCastleStairsUnsealed/);
  assert.match(storyFlags, /event\.lake_castle_ancient_inscription/);
  assert.match(storyFlags, /event\.lake_castle_stairs_unsealed/);
  assert.match(lakeScene, /まほうを　つかえる人を\\nさがそう/);
  assert.match(lakeScene, /ミレイは　まほうを　となえた！/);
  assert.match(lakeScene, /STORY_FLAGS\.lakeCastleInscriptionNeedsMage/);
  assert.match(lakeScene, /case "stairway"/);
  assert.match(lakeScene, /case "navigation_beacon"/);
  assert.match(lakeScene, /this\.isDestinationLocked\(destinationFloor\)/);
  assert.match(lakeScene, /this\.destinationColor\(destinationFloor, locked\)/);
  assert.match(lakeScene, /case "water_gate"/);
  assert.match(lakeScene, /playWaterGateUnseal/);
  assert.match(lakeScene, /lake-water-gate/);
  assert.match(lakeScene, /case "reader_mark"/);
  assert.match(lakeScene, /this\.floorGuide\(\)/);
  assert.match(lakeScene, /this\.plan\.visualPalette/);
  assert.match(lakeScene, /view\.waterTextures/);
  assert.match(lakeScene, /matrices\.wallJoint/);
  assert.match(lakeScene, /matrices\.wallChip/);
  assert.match(lakeScene, /matrices\.wallMoss/);
  assert.match(lakeScene, /addFloorAtmosphere/);
  assert.match(lakeScene, /ambientParticles/);
  assert.match(lakeScene, /Fへ（封印）/);
  assert.match(lakeScene, /rollEncounterMonster\(ENCOUNTER_TABLES\.lake_castle\)/);
  assert.doesNotMatch(lakeScene, /const monsters = \["koakuma", "erimaki_hebi", "daija"\]/);
  assert.match(lakeScene, /STORY_FLAGS\.lakeCastleSanctuaryVisited/);
  assert.match(storyFlags, /event\.lake_castle_sanctuary/);
  assert.match(lakeScene, /STORY_FLAGS\.lakeCastleDemasClueFound/);
  assert.match(storyFlags, /event\.lake_castle_demas_clue_found/);
  assert.match(lakeScene, /デーマスと　読める/);
  assert.match(lakeScene, /partySystem\.addMember\("mirei"\)/);
  assert.match(lakeScene, /forceContextLoss/);
});

test("No.11 ships high-detail runtime material textures for the 3D view", () => {
  for (const relativePath of [
    "assets/maps/lake_castle/materials/castle_stone.png",
    "assets/maps/lake_castle/materials/lake_water.png",
    "assets/maps/lake_castle/materials/stained_glass.png",
  ]) assert.equal(existsSync(path.join(REPO_ROOT, relativePath)), true, `${relativePath} is present`);
});

test("No.11 uses an explicit three-enemy encounter table", () => {
  assert.deepEqual(
    ENCOUNTER_TABLES.lake_castle.entries.map((entry) => entry.enemies[0]),
    ["yaki_purin", "kamaitachi", "kirimaneki"],
  );
});

test("the DEV URL starts No.11 at the requested floor", () => {
  assert.equal(lakeCastleFloorFromQuery("?mapTest=lake-castle-3d&floor=1"), 1);
  assert.equal(lakeCastleFloorFromQuery("?mapTest=lake-castle-3d&floor=2"), 2);
  assert.equal(lakeCastleFloorFromQuery("?mapTest=lake-castle-3d&floor=3"), 3);
  assert.equal(lakeCastleFloorFromQuery("?floor=99"), 1);
  assert.match(source("src/main.ts"), /mapTestRequested === "lake-castle-3d"/);
});
