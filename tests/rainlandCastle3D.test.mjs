import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { INPUT_BINDINGS } from "../src/config/input.ts";
import { MAPS } from "../src/config/maps.ts";
import { RAINLAND_CASTLE_3D } from "../src/config/rainlandCastle3D.ts";
import {
  boxIsFree, buildBlockedCellGrid, buildVoxelLayout, findWallFace, floorHeightAt, isCellBlocked, moveWithSlide,
  EDGE_EAST, EDGE_WEST, VOXEL_FLOOR, VOXEL_WALL,
} from "../src/systems/Castle3DLayout.ts";
import {
  facingToYaw, feetHalfSize, feetToSprite, forwardVector, normalizeYaw, spriteToFeet, yawToFacing,
} from "../src/systems/CastleViewToggle.ts";
import { readImageMapEvents, readImageMapManifest } from "../src/systems/ImageMapData.ts";
import { readPngAsMask } from "./helpers/bodyReachability.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_DIR = path.join(REPO_ROOT, "assets/maps/rainland_castle");
const manifest = readImageMapManifest(JSON.parse(readFileSync(path.join(MAP_DIR, "map.json"), "utf-8")));
const events = readImageMapEvents(JSON.parse(readFileSync(path.join(MAP_DIR, "events.json"), "utf-8")));
const grid = buildBlockedCellGrid(readPngAsMask(path.join(MAP_DIR, "collision.png")), manifest.collisionCellSize);
const layout = buildVoxelLayout(grid, RAINLAND_CASTLE_3D.blockSize, { carpets: RAINLAND_CASTLE_3D.carpets, stairs: RAINLAND_CASTLE_3D.stairs, propRects: RAINLAND_CASTLE_3D.props.map((prop) => prop.rect) });
const half = feetHalfSize(manifest.worldScale);
const spawn = MAPS.map_05_rainland_castle.spawns.fromCastleTown;
const spawnFeet = spriteToFeet(spawn.x * manifest.worldScale, spawn.y * manifest.worldScale, manifest.worldScale);

test("2D <-> 3D position and facing conversions round-trip (switching keeps the same spot and direction)", () => {
  for (const [x, y] of [[1087.5, 1440], [300, 700], [12.25, 99.5]]) {
    const feet = spriteToFeet(x, y, 1.5);
    const back = feetToSprite(feet.x, feet.y, 1.5);
    assert.ok(Math.abs(back.x - x) < 1e-9 && Math.abs(back.y - y) < 1e-9);
  }
  for (const facing of ["up", "down", "left", "right"]) assert.equal(yawToFacing(facingToYaw(facing)), facing);
  assert.equal(yawToFacing(0.6), "up");
  assert.equal(yawToFacing(1.0), "left");
  assert.equal(yawToFacing(-2.5), "down");
  assert.equal(yawToFacing(normalizeYaw(Math.PI * 4 - 1.2)), "right");
  // yaw 0 = north (up on the 2D map), turning left (+yaw) looks west
  assert.deepEqual(roundVector(forwardVector(0)), { x: 0, y: -1 });
  assert.deepEqual(roundVector(forwardVector(Math.PI / 2)), { x: -1, y: 0 });
});

test("3D walkability is the 2D collision: the castle spawn stands free and walls never cover a walkable 2D cell", () => {
  assert.equal(boxIsFree(grid, spawnFeet.x, spawnFeet.y, half), true, "the fromCastleTown spawn must be standable in 3D");
  const per = RAINLAND_CASTLE_3D.blockSize / grid.cellSize;
  let walls = 0;
  let floors = 0;
  for (let row = 0; row < layout.rows; row += 1) {
    for (let column = 0; column < layout.columns; column += 1) {
      const kind = layout.kinds[row * layout.columns + column];
      if (kind === VOXEL_WALL) {
        walls += 1;
        for (let r = 0; r < per; r += 1) for (let c = 0; c < per; c += 1) {
          assert.equal(isCellBlocked(grid, column * per + c, row * per + r), true, `wall block ${column},${row} covers a walkable cell`);
        }
      }
      if (kind === VOXEL_FLOOR) floors += 1;
    }
  }
  assert.ok(walls > 100 && floors > 500, `unexpectedly small castle: ${floors} floor / ${walls} wall blocks`);
});

test("walking forward in 3D from the castle entrance reaches the central hall and never enters a blocked cell", () => {
  let position = spawnFeet;
  const yaw = facingToYaw("up");
  for (let i = 0; i < 400; i += 1) {
    const direction = forwardVector(yaw);
    position = moveWithSlide(grid, position, direction.x * 2.8, direction.y * 2.8, half);
    assert.equal(boxIsFree(grid, position.x, position.y, half), true);
  }
  assert.ok(position.y < 700, `expected to reach the central hall, stopped at y=${position.y}`);
  // walking into the west wall just slides / stops, it never passes through
  let side = { x: 400, y: 700 };
  for (let i = 0; i < 200; i += 1) side = moveWithSlide(grid, side, -4, 0, half);
  assert.equal(boxIsFree(grid, side.x, side.y, half), true);
  assert.ok(side.x >= 320 - 1, `walked through the central hall's west wall to x=${side.x}`);
});

test("NPCs block movement in 3D like their 2D bodies do", () => {
  const npc = MAPS.map_05_rainland_castle.npcs.find((candidate) => candidate.id === "rainland_castle_hall_soldier");
  const blocker = { x: npc.position.x - 12, y: npc.position.y - 16, width: 24, height: 32 };
  let position = { x: npc.position.x, y: npc.position.y + 60 };
  assert.equal(boxIsFree(grid, position.x, position.y, half, [blocker]), true);
  for (let i = 0; i < 60; i += 1) position = moveWithSlide(grid, position, 0, -2, half, [blocker]);
  assert.ok(position.y - half >= blocker.y + blocker.height - 1e-9, "walked into the NPC");
});

test("carpets, stairs and wall decorations line up with the castle", () => {
  const blockAt = (x, y) => Math.floor(y / layout.blockSize) * layout.columns + Math.floor(x / layout.blockSize);
  assert.equal(layout.carpet[blockAt(724, 700)], 1, "the main carpet runs through the central hall");
  assert.equal(layout.carpet[blockAt(450, 700)], 0);
  assert.ok(floorHeightAt(layout, 176, 200) > floorHeightAt(layout, 176, 290), "the west stairs rise towards the north");
  assert.equal(floorHeightAt(layout, 176, 400), 0);
  // the main carpet has its gold border on the west/east edges only, not in the middle
  assert.equal(layout.carpetEdges[blockAt(664, 700)] & EDGE_WEST, EDGE_WEST);
  assert.equal(layout.carpetEdges[blockAt(776, 700)] & EDGE_EAST, EDGE_EAST);
  assert.equal(layout.carpetEdges[blockAt(724, 700)], 0);
  // the stepped ceiling edge: floor next to a wall is distance 1, the middle of the central hall is far from walls
  assert.equal(layout.wallDistance[blockAt(328, 700)], 1);
  assert.equal(layout.wallDistance[blockAt(450, 650)], 3);
  for (const decor of RAINLAND_CASTLE_3D.wallDecor) {
    assert.ok(findWallFace(layout, decor.x, decor.y, decor.face), `${decor.kind} at (${decor.x},${decor.y}) facing ${decor.face} has no wall to hang on`);
  }
  for (const prop of RAINLAND_CASTLE_3D.props) {
    const cx = prop.rect.x + prop.rect.width / 2;
    const cy = prop.rect.y + prop.rect.height / 2;
    assert.equal(isCellBlocked(grid, Math.floor(cx / grid.cellSize), Math.floor(cy / grid.cellSize)), true, `${prop.kind} stands on a walkable 2D cell`);
    // the prop is drawn as itself (pedestal, potted tree...), not buried in a 5-block-high wall
    assert.notEqual(layout.kinds[blockAt(cx, cy)], VOXEL_WALL, `${prop.kind} at (${cx},${cy}) was turned into a wall`);
  }
});

test("every castle event can be reached in 3D (the exit back to the castle town works from the block castle)", () => {
  const exit = events.find((event) => event.id === "event_rainland_castle_exit");
  assert.ok(exit);
  let position = spawnFeet;
  for (let i = 0; i < 200; i += 1) position = moveWithSlide(grid, position, 0, 3, half);
  const box = { x: position.x - half, y: position.y - half, width: half * 2, height: half * 2 };
  const b = exit.bounds;
  assert.ok(box.x < b.x + b.width && box.x + box.width > b.x && box.y < b.y + b.height && box.y + box.height > b.y, "walking south from the spawn reaches the exit zone");
});

test("the view toggle is wired: V key, castle package points at the 3D scene, and main.ts registers it", () => {
  assert.deepEqual([...INPUT_BINDINGS.view], ["KeyV"]);
  const castle = readFileSync(path.join(REPO_ROOT, "src/scenes/RainlandCastleScene.ts"), "utf-8");
  assert.match(castle, /alternateViewSceneKey: "RainlandCastle3DScene"/);
  const scene3d = readFileSync(path.join(REPO_ROOT, "src/scenes/RainlandCastle3DScene.ts"), "utf-8");
  assert.match(scene3d, /export const RAINLAND_CASTLE_3D_SCENE_KEY = "RainlandCastle3DScene"/);
  assert.match(scene3d, /await import\("three"\)/, "three.js must be loaded lazily so other scenes do not pay for it");
  const main = readFileSync(path.join(REPO_ROOT, "src/main.ts"), "utf-8");
  assert.match(main, /normalScenes = \[[^\]]*RainlandCastleScene, RainlandCastle3DScene/);
});

function roundVector(vector) {
  return { x: Math.round(vector.x * 1e6) / 1e6 + 0, y: Math.round(vector.y * 1e6) / 1e6 + 0 };
}

test("castle architecture: pilasters stand on straight walls away from banners/windows, ivy avoids them", async () => {
  const { choosePilasterSpots, chooseVineSpots, findWallFaceSpots } = await import("../src/systems/Castle3DArchitecture.ts");
  const arch = RAINLAND_CASTLE_3D.architecture;
  const spots = findWallFaceSpots(layout);
  assert.ok(spots.length > 200, `expected many wall faces, got ${spots.length}`);
  const decor = RAINLAND_CASTLE_3D.wallDecor.map((d) => ({ x: d.x / RAINLAND_CASTLE_3D.blockSize, z: d.y / RAINLAND_CASTLE_3D.blockSize }));
  const pilasters = choosePilasterSpots(spots, arch.pilasterSpacing, decor, arch.pilasterAvoidRadius);
  assert.ok(pilasters.length >= 20, `expected a colonnade of pilasters, got ${pilasters.length}`);
  for (const pilaster of pilasters) {
    for (const point of decor) assert.ok(Math.hypot(point.x - pilaster.x, point.z - pilaster.z) > arch.pilasterAvoidRadius, "a pilaster would hide a banner/window");
    const index = pilaster.row * layout.columns + pilaster.column;
    assert.equal(layout.kinds[index], VOXEL_WALL, "pilasters are attached to wall blocks");
  }
  const vines = chooseVineSpots(spots, arch.vineRate, arch.vineMaxLength, [...decor, ...pilasters]);
  assert.ok(vines.length > 0);
  for (const { spot, length } of vines) {
    assert.ok(length >= 1 && length <= arch.vineMaxLength);
    for (const pilaster of pilasters) assert.ok(Math.hypot(pilaster.x - spot.x, pilaster.z - spot.z) >= 1.2);
  }
  // deterministic: the same castle always gets the same ivy
  assert.deepEqual(chooseVineSpots(spots, arch.vineRate, arch.vineMaxLength, [...decor, ...pilasters]).length, vines.length);
});

test("every castle NPC has a detailed character model (face, hair, outfit, gear)", () => {
  const outfits = new Set(["soldier", "royal_guard", "maid", "villager"]);
  for (const npc of MAPS.map_05_rainland_castle.npcs) {
    const model = RAINLAND_CASTLE_3D.npcModels[npc.id];
    assert.ok(model, `${npc.id} has no 3D character model`);
    assert.ok(outfits.has(model.look.outfit));
    assert.ok(["short", "long", "bun"].includes(model.look.hairStyle));
  }
  assert.equal(RAINLAND_CASTLE_3D.npcModels.rainland_castle_gate_soldier.gear.weapon, "spear");
  assert.equal(RAINLAND_CASTLE_3D.npcModels.rainland_castle_throne_guard.gear.weapon, "halberd");
});
