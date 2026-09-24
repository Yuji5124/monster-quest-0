import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { MAPS } from "../src/config/maps.ts";
import { NPC_VISUAL } from "../src/config/npc.ts";
import { PLAYER } from "../src/config/player.ts";
import { RAINLAND_THRONE_ROOM_3D } from "../src/config/rainlandCastle3D.ts";
import { getDialogue } from "../src/data/dialogues.ts";
import {
  buildBlockedCellGrid, buildVoxelLayout, findWallFace, floorHeightAt, isCellBlocked, VOXEL_WALL,
} from "../src/systems/Castle3DLayout.ts";
import { feetHalfSize, spriteToFeet } from "../src/systems/CastleViewToggle.ts";
import { readImageMapEvents, readImageMapManifest } from "../src/systems/ImageMapData.ts";
import { analyseBodyReachability, readPngAsMask } from "./helpers/bodyReachability.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_DIR = path.join(REPO_ROOT, "assets/maps/rainland_throne_room");
const MAP_ID = "map_rainland_throne_room";
const readJson = (file) => JSON.parse(readFileSync(file, "utf-8"));
const manifest = readImageMapManifest(readJson(path.join(MAP_DIR, "map.json")));
const events = readImageMapEvents(readJson(path.join(MAP_DIR, "events.json")));
const grid = buildBlockedCellGrid(readPngAsMask(path.join(MAP_DIR, "collision.png")), manifest.collisionCellSize);
const cfg = RAINLAND_THRONE_ROOM_3D;
const layout = buildVoxelLayout(grid, cfg.blockSize, {
  carpets: cfg.carpets, stairs: cfg.stairs, platforms: cfg.platforms, lowWalls: cfg.lowWalls, propRects: cfg.props.map((prop) => prop.rect),
});
const blockAt = (x, y) => Math.floor(y / cfg.blockSize) * layout.columns + Math.floor(x / cfg.blockSize);

test("throne room: CURRENT package whose background is the unmodified user artwork (レインランドじょう_城内2.png)", () => {
  assert.equal(manifest.id, MAP_ID);
  assert.equal(manifest.assetStatus, "CURRENT");
  assert.deepEqual([manifest.width, manifest.height, manifest.worldScale, manifest.collisionCellSize], [1448, 1086, 1.5, 8]);
  for (const file of [manifest.background, manifest.collision, manifest.events, manifest.objects]) assert.ok(existsSync(path.join(MAP_DIR, file)));
  const reference = path.join(REPO_ROOT, "assets/maps/reference/reference/レインランドじょう_城内2.png");
  assert.ok(readFileSync(reference).equals(readFileSync(path.join(MAP_DIR, "background.png"))));
});

test("throne room: the castle's throne door leads in, the south exit leads back in front of that door", () => {
  const castleEvents = readImageMapEvents(readJson(path.join(REPO_ROOT, "assets/maps/rainland_castle/events.json")));
  const door = castleEvents.find((event) => event.id === "event_rainland_castle_throne_room_entrance");
  assert.deepEqual(door.commands[0], { type: "transfer", targetMapId: MAP_ID, targetSpawnId: "fromCastle" });
  const exit = events.find((event) => event.id === "event_rainland_throne_room_exit");
  assert.deepEqual(exit.commands[0], { type: "transfer", targetMapId: "map_05_rainland_castle", targetSpawnId: "fromThroneRoom" });
  assert.equal(MAPS[MAP_ID].sceneKey, "RainlandThroneRoomScene");
  // neither arrival spawn may stand inside (and instantly re-trigger) the zone that sends you back
  const feetBox = (spawn) => {
    const feet = spriteToFeet(spawn.x * 1.5, spawn.y * 1.5, 1.5);
    const half = feetHalfSize(1.5);
    return { x: feet.x - half, y: feet.y - half, width: half * 2, height: half * 2 };
  };
  const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  assert.equal(overlaps(feetBox(MAPS[MAP_ID].spawns.fromCastle), exit.bounds), false);
  assert.equal(overlaps(feetBox(MAPS.map_05_rainland_castle.spawns.fromThroneRoom), door.bounds), false);
});

test("throne room: the player can walk from the entrance up the stairs onto the dais and talk to the king", () => {
  const result = analyseBodyReachability("rainland_throne_room", MAP_ID, { margin: 6 });
  assert.equal(result.startFits, true);
  for (const spawn of result.spawnResults) assert.equal(spawn.ok, true);
  for (const event of result.eventResults) assert.equal(event.ok, true, `${event.id} unreachable`);
  for (const [x, y, name] of [[724, 330, "dais stairs"], [724, 262, "in front of the throne"], [590, 262, "dais west"], [860, 262, "dais east"], [380, 560, "west wing"], [1060, 560, "east wing"], [724, 700, "hall carpet"]]) {
    assert.equal(result.canReach(x * 1.5, y * 1.5) || result.canReach(x, y), true, `${name} (${x},${y}) unreachable`);
  }
  // standing right below the throne, the king (2D NPC body) is within the 2D talk reach
  const king = MAPS[MAP_ID].npcs.find((npc) => npc.id === "rainland_throne_king");
  const kingBottom = king.position.y + NPC_VISUAL.height / 1.5 / 2;
  const throne = { y1: 248 };
  const nearestFeetCenter = throne.y1 + PLAYER.height / 1.5 / 2;
  assert.ok(nearestFeetCenter - kingBottom <= 18, "the king must be reachable for talking from the front of the throne");
  for (const npc of MAPS[MAP_ID].npcs) assert.ok(getDialogue(npc.dialogueId), `${npc.id} has no dialogue`);
});

test("throne room 3D: raised dais with stairs, a low front wall with balustrades, and the throne/tapestry on the back wall", () => {
  assert.equal(floorHeightAt(layout, 724, 262), 1, "the dais is one block up");
  assert.equal(floorHeightAt(layout, 590, 240), 1);
  assert.ok(floorHeightAt(layout, 724, 350) < floorHeightAt(layout, 724, 300), "the stairs rise towards the throne");
  assert.equal(floorHeightAt(layout, 724, 600), 0);
  // the dais front is a low wall (not a full-height wall hiding the dais)
  let lowWalls = 0;
  for (let i = 0; i < layout.kinds.length; i += 1) if (layout.kinds[i] === VOXEL_WALL && layout.wallTop[i] > 0) lowWalls += 1;
  assert.ok(lowWalls >= 4, `expected the dais front to be low walls, got ${lowWalls}`);
  assert.ok(layout.wallTop[blockAt(592, 352)] > 0 || layout.kinds[blockAt(592, 352)] !== VOXEL_WALL);
  for (const decor of cfg.wallDecor) assert.ok(findWallFace(layout, decor.x, decor.y, decor.face), `${decor.kind} at (${decor.x},${decor.y}) has no wall`);
  for (const prop of cfg.props) {
    const cx = prop.rect.x + prop.rect.width / 2;
    const cy = prop.rect.y + prop.rect.height / 2;
    if (prop.kind !== "balustrade") assert.equal(isCellBlocked(grid, Math.floor(cx / 8), Math.floor(cy / 8)), true, `${prop.kind} stands on walkable floor`);
    assert.notEqual(layout.kinds[blockAt(cx, cy)], VOXEL_WALL, `${prop.kind} was turned into a wall`);
  }
  for (const npc of MAPS[MAP_ID].npcs) assert.ok(cfg.npcModels[npc.id], `${npc.id} has no 3D character model`);
  assert.equal(cfg.npcModels.rainland_throne_king.gear.pose, "seated");
  assert.equal(cfg.npcModels.rainland_throne_king.look.outfit, "king");
});
