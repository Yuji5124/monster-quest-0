import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { BoxGeometry } from "three";
import { chooseCastle3DQualityProfile, RAINLAND_CASTLE_3D, RAINLAND_THRONE_ROOM_3D } from "../src/config/rainlandCastle3D.ts";
import { BOX_FACES, buildOccupancy, isOccupied, meshVoxelBoxes } from "../src/systems/Castle3DMesher.ts";
import { buildBlockedCellGrid, buildVoxelLayout, VOXEL_FLOOR, VOXEL_WALL } from "../src/systems/Castle3DLayout.ts";
import { readImageMapManifest } from "../src/systems/ImageMapData.ts";
import { readPngAsMask } from "./helpers/bodyReachability.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const box = (key, x, y, z, sx = 1, sy = 1, sz = 1) => ({ key, x, y, z, sx, sy, sz });
const FLAT_AO = [1, 1, 1, 1];

test("face templates reproduce three.js BoxGeometry(1,1,1) exactly (same vertices, normals and UVs, so no texture moves)", () => {
  const geometry = new BoxGeometry(1, 1, 1);
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const uv = geometry.getAttribute("uv");
  BOX_FACES.forEach((face, f) => {
    face.corners.forEach((corner, v) => {
      const i = f * 4 + v;
      assert.deepEqual(corner.position, [position.getX(i), position.getY(i), position.getZ(i)], `face ${f} vertex ${v}`);
      assert.deepEqual(face.normal, [normal.getX(i), normal.getY(i), normal.getZ(i)]);
      assert.deepEqual(corner.uv, [uv.getX(i), uv.getY(i)]);
    });
  });
  // with flat AO the triangles are exactly BoxGeometry's (a, b, d), (b, c, d)
  const meshed = meshVoxelBoxes([box("k", 0, 0, 0)], buildOccupancy([], 1, 1, 0, 0), FLAT_AO).get("k");
  assert.deepEqual([...meshed.indices], [...geometry.getIndex().array]);
});

test("faces between two filled blocks are not drawn; exposed faces are", () => {
  const boxes = [box("wall", 0.5, 0.5, 0.5), box("wall", 1.5, 0.5, 0.5)];
  const grid = buildOccupancy(boxes, 2, 1, 0, 0);
  assert.equal(isOccupied(grid, 0.5, 0.5, 0.5), true);
  assert.equal(isOccupied(grid, 2.5, 0.5, 0.5), false, "outside the grid is empty");
  assert.equal(meshVoxelBoxes(boxes, grid).get("wall").faceCount, 10);
});

test("a floor tile next to a wall is darker at the wall side (ambient occlusion), and bright in the open", () => {
  const curve = [1, 0.8, 0.64, 0.5];
  // floor tiles at x=1..2 and x=2..3, a wall block standing at x=0..1 beside the first tile
  const layout = [box("floor", 1.5, -0.5, 0.5), box("wall", 0.5, 0.5, 0.5), box("floor", 2.5, -0.5, 0.5)];
  const grid = buildOccupancy(layout, 3, 1, -1, 0);
  const floor = meshVoxelBoxes(layout, grid, curve).get("floor");
  const topColors = [];
  for (let i = 0; i < floor.positions.length / 3; i += 1) {
    if (floor.normals[i * 3 + 1] === 1) topColors.push({ x: floor.positions[i * 3], light: floor.colors[i * 3] });
  }
  const nextToWall = topColors.filter((vertex) => vertex.x === 1).map((vertex) => vertex.light);
  const open = topColors.filter((vertex) => vertex.x === 3).map((vertex) => vertex.light);
  assert.ok(nextToWall.every((light) => light < 1), `wall edge ${nextToWall}`);
  assert.ok(open.every((light) => light === 1), `open edge ${open}`);
});

test("half-height blocks (the stepped ceiling) do not count as filled, so walls below them are not darkened or hidden", () => {
  const grid = buildOccupancy([box("ceiling", 0.5, 5.75, 0.5, 1, 0.5, 1)], 1, 1, -1, 7);
  assert.equal(isOccupied(grid, 0.5, 5.5, 0.5), false);
});

for (const [name, dir, cfg] of [["castle", "rainland_castle", RAINLAND_CASTLE_3D], ["throne room", "rainland_throne_room", RAINLAND_THRONE_ROOM_3D]]) {
  test(`${name}: every floor and wall block still produces visible geometry, with far fewer faces than drawing every box whole`, () => {
    const mapDir = path.join(REPO_ROOT, "assets/maps", dir);
    const manifest = readImageMapManifest(JSON.parse(readFileSync(path.join(mapDir, "map.json"), "utf-8")));
    const grid = buildBlockedCellGrid(readPngAsMask(path.join(mapDir, "collision.png")), manifest.collisionCellSize);
    const layout = buildVoxelLayout(grid, cfg.blockSize, {
      carpets: cfg.carpets, stairs: cfg.stairs, platforms: cfg.platforms, lowWalls: cfg.lowWalls, propRects: cfg.props.map((prop) => prop.rect),
    });
    const top = cfg.wallHeight;
    const boxes = [];
    for (let row = 0; row < layout.rows; row += 1) {
      for (let column = 0; column < layout.columns; column += 1) {
        const index = row * layout.columns + column;
        const x = column + 0.5;
        const z = row + 0.5;
        if (layout.kinds[index] === VOXEL_FLOOR) {
          const rise = layout.floorHeight[index];
          boxes.push(rise > 0 ? box(`floor${index}`, x, (rise - 1) / 2, z, 1, 1 + rise, 1) : box(`floor${index}`, x, -0.5, z));
          boxes.push(box("ceiling", x, top + 0.5, z));
        } else if (layout.kinds[index] === VOXEL_WALL && layout.wallTop[index] === 0) {
          for (let level = 0; level < top; level += 1) boxes.push(box("wall", x, level + 0.5, z));
        }
      }
    }
    const meshed = meshVoxelBoxes(boxes, buildOccupancy(boxes, layout.columns, layout.rows, -1, top + 1), cfg.quality.desktop.ambientOcclusion);
    // each floor tile keeps its walkable top face
    for (const [key, group] of meshed) {
      if (!key.startsWith("floor")) continue;
      let up = 0;
      for (let i = 1; i < group.normals.length; i += 3) if (group.normals[i] === 1) up += 1;
      assert.ok(up >= 4, `${key} lost its top face`);
    }
    const faces = [...meshed.values()].reduce((sum, group) => sum + group.faceCount, 0);
    assert.ok(faces < boxes.length * 6 * 0.5, `${faces} faces for ${boxes.length} boxes`);
  });
}

test("quality profile: touch devices get the lighter mobile profile, and ?castle3dQuality= only overrides in DEV", () => {
  assert.equal(chooseCastle3DQualityProfile("", false, true), "desktop");
  assert.equal(chooseCastle3DQualityProfile("", true, true), "mobile");
  assert.equal(chooseCastle3DQualityProfile("?castle3dQuality=basic", false, true), "basic");
  assert.equal(chooseCastle3DQualityProfile("?castle3dQuality=basic", false, false), "desktop");
  const { mobile, desktop, basic } = RAINLAND_CASTLE_3D.quality;
  assert.ok(mobile.shadows.mapSize <= desktop.shadows.mapSize);
  assert.deepEqual(basic.ambientOcclusion, [1, 1, 1, 1]);
  assert.equal(basic.shadows, null);
});
