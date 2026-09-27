import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  }
  assert.equal(LAKE_CASTLE_FLOORS[2].ancientInscription !== undefined, true);
  assert.equal(LAKE_CASTLE_FLOORS[3].sanctuary !== undefined, true);
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
  assert.match(lakeScene, /CanvasTexture\(source\)/);
  assert.match(lakeScene, /const CEILING_HEIGHT =/);
  assert.match(lakeScene, /matrices\.ceiling\.push/);
  assert.match(lakeScene, /matrices\.ceilingBeam\.push/);
  assert.match(lakeScene, /function drawCeilingCanvas/);
  assert.match(lakeScene, /view\.camera\.position\.set\(this\.position\.x, LAKE_CASTLE_3D_SETTINGS\.eyeHeight, this\.position\.z\)/);
  assert.doesNotMatch(lakeScene, /Math\.sin\(time \* 8\)/);
  assert.doesNotMatch(lakeScene, /texture\.offset\.x = time/);
  assert.match(lakeScene, /texture\.offset\.y = -time/);
  assert.match(lakeScene, /requestPointerLock/);
  assert.match(lakeScene, /this\.sys\.game\.device\.input\.touch/);
  assert.match(lakeScene, /event\.lake_castle_ancient_inscription/);
  assert.match(lakeScene, /event\.lake_castle_sanctuary/);
  assert.match(lakeScene, /partySystem\.addMember\("mirei"\)/);
  assert.match(lakeScene, /forceContextLoss/);
});

test("the DEV URL starts No.11 at the requested floor", () => {
  assert.equal(lakeCastleFloorFromQuery("?mapTest=lake-castle-3d&floor=1"), 1);
  assert.equal(lakeCastleFloorFromQuery("?mapTest=lake-castle-3d&floor=2"), 2);
  assert.equal(lakeCastleFloorFromQuery("?mapTest=lake-castle-3d&floor=3"), 3);
  assert.equal(lakeCastleFloorFromQuery("?floor=99"), 1);
  assert.match(source("src/main.ts"), /mapTestRequested === "lake-castle-3d"/);
});
