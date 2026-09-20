import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { MAPS } from "../src/config/maps.ts";
import { NPC_VISUAL } from "../src/config/npc.ts";
import { PLAYER } from "../src/config/player.ts";
import { DIALOGUES, getDialogue } from "../src/data/dialogues.ts";
import { buildCollisionRects } from "../src/systems/ImageMapCollisionData.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects } from "../src/systems/ImageMapData.ts";
import { readWorldMapDestinations, readWorldMapManifest, resolveWorldMapEntryDestination } from "../src/systems/WorldMapData.ts";
import { analyseBodyReachability, readPngAsMask } from "./helpers/bodyReachability.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_DIR = path.join(REPO_ROOT, "assets/maps/rainland_castle");
const REFERENCE_DIR = path.join(REPO_ROOT, "assets/maps/reference/reference");
const MAP_ID = "map_05_rainland_castle";
const MAP = MAPS[MAP_ID];

const readJson = (file) => JSON.parse(readFileSync(file, "utf-8"));
const manifest = () => readImageMapManifest(readJson(path.join(MAP_DIR, "map.json")));
const events = () => readImageMapEvents(readJson(path.join(MAP_DIR, "events.json")));
const pngSize = (file) => { const b = readFileSync(file); return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) }; };

function collision() {
  const m = manifest();
  const rects = buildCollisionRects(readPngAsMask(path.join(MAP_DIR, "collision.png")), m.collisionCellSize);
  return (x, y) => rects.some((r) => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height);
}

// NPC body in native background px: the Scene builds a NPC_VISUAL-sized static body centred on definition.position * worldScale.
function npcBodies() {
  const scale = manifest().worldScale;
  const width = NPC_VISUAL.width / scale;
  const height = NPC_VISUAL.height / scale;
  return MAP.npcs.map((npc) => ({ npc, rect: { x: npc.position.x - width / 2, y: npc.position.y - height / 2, width, height } }));
}

test("castle: manifest is a CURRENT four-layer package at 150% like the other maps", () => {
  const m = manifest();
  assert.equal(m.id, MAP_ID);
  assert.equal(m.name, "レインランドじょう");
  assert.equal(m.coordinateSpace, "background-pixels");
  // The user-supplied 城内 artwork replaced the DEV_PLACEHOLDER layout (a data-only swap: the Scene has no special case).
  assert.equal(m.assetStatus, "CURRENT");
  assert.deepEqual([m.width, m.height], [1448, 1086]);
  assert.equal(m.worldScale, 1.5);
  assert.equal(m.collisionCellSize, 8);
  for (const file of [m.background, m.collision, m.events, m.objects]) assert.ok(existsSync(path.join(MAP_DIR, file)), `${file} must exist`);
  assert.deepEqual(readImageMapObjects(readJson(path.join(MAP_DIR, "objects.json"))), []);
  assert.deepEqual(pngSize(path.join(MAP_DIR, "background.png")), { width: m.width, height: m.height });
  assert.deepEqual(pngSize(path.join(MAP_DIR, "collision.png")), { width: m.width, height: m.height });
});

test("castle: background.png is an unmodified copy of the user-supplied 城内 artwork, and the original is kept", () => {
  const reference = path.join(REFERENCE_DIR, "レインランドじょう_城内.png");
  assert.ok(existsSync(reference), "the original reference image must still exist");
  assert.ok(readFileSync(reference).equals(readFileSync(path.join(MAP_DIR, "background.png"))), "background.png must be byte-identical to レインランドじょう_城内.png");
  // the 2D walkable background must never be the exterior establishing shot or the first-person voxel-castle reference
  for (const other of ["レインランドじょう_イメージ.png", "レインランドじょう_マイクラ風.png"]) {
    assert.equal(readFileSync(path.join(MAP_DIR, "background.png")).equals(readFileSync(path.join(REFERENCE_DIR, other))), false, `background.png must not be ${other}`);
  }
});

test("castle: registered in MAPS with the fixed entry contract (mapId + fromCastleTown) and no local exit table", () => {
  assert.equal(MAP.id, MAP_ID);
  assert.equal(MAP.sceneKey, "RainlandCastleScene");
  assert.equal(MAP.exits.length, 0);
  assert.equal(MAP.buildings.length, 0);
  assert.deepEqual(Object.keys(MAP.spawns), ["fromCastleTown"]);
  assert.equal(MAP.spawns.fromCastleTown.facing, "up");
});

test("castle: official route is the town's north gate -> castle -> back in front of that gate; the world map has no direct castle point", () => {
  const dir = path.join(REPO_ROOT, "assets/maps/world_map");
  const worldManifest = readWorldMapManifest(readJson(path.join(dir, "map.json")));
  const destinations = readWorldMapDestinations(readJson(path.join(dir, "destinations.json")), worldManifest);
  // existing world structure wins: the castle is reached from レインランドじょうかまち, not from the world map
  assert.equal(destinations.some((destination) => destination.targetMapId === MAP_ID), false, "the castle must not be a direct world-map point");
  assert.equal(Object.keys(worldManifest.entryDestinationIds).some((id) => /rainland_castle$/.test(id) && id !== "from_rainland_castle_town"), false);
  assert.ok(destinations.some((destination) => destination.targetMapId === "map_rainland_castle_town"), "the castle town itself stays on the world map");

  const townEvents = readImageMapEvents(readJson(path.join(REPO_ROOT, "assets/maps/rainland_castle_town/events.json")));
  const gate = townEvents.find((event) => event.id === "event_rainland_castle_town_castle_gate");
  assert.deepEqual(gate.commands[0], { type: "transfer", targetMapId: MAP_ID, targetSpawnId: "fromCastleTown" });
  assert.ok(MAP.spawns[gate.commands[0].targetSpawnId]);

  const exit = events().find((event) => event.id === "event_rainland_castle_exit");
  assert.deepEqual(exit.commands[0], { type: "transfer", targetMapId: "map_rainland_castle_town", targetSpawnId: "fromCastle" });
  const town = MAPS.map_rainland_castle_town;
  assert.ok(town.spawns.fromCastle, "the town needs the spawn in front of its north gate");
  // returning must not stand inside (and instantly re-trigger) the town's castle gate or south gate zones
  const bodyTouches = (spawn, zone) => spawn.x + PLAYER.width / 2 > zone.x && spawn.x - PLAYER.width / 2 < zone.x + zone.width &&
    spawn.y + PLAYER.height / 2 > zone.y && spawn.y - PLAYER.height / 2 < zone.y + zone.height;
  for (const event of townEvents) assert.equal(bodyTouches(town.spawns.fromCastle, event.bounds), false, `fromCastle overlaps ${event.id}`);
});

test("castle: event points exist for the entrance, throne room door, stairs, the reserved east-room slot and the exit", () => {
  const byId = Object.fromEntries(events().map((event) => [event.id, event]));
  for (const id of [
    "event_rainland_castle_entrance",
    "event_rainland_castle_throne_room_entrance",
    "event_rainland_castle_stairs",
    "event_rainland_castle_east_room",
    "event_rainland_castle_exit",
  ]) assert.ok(byId[id], `${id} must exist`);
  for (const event of events()) {
    assert.equal(event.once, true);
    const { x, y, width, height } = event.bounds;
    assert.ok(x >= 0 && y >= 0 && x + width <= manifest().width && y + height <= manifest().height, `${event.id} must be inside the map`);
    assert.equal(event.commands[0].type, event.id === "event_rainland_castle_exit" ? "transfer" : "message", `${event.id} has the wrong command type`);
  }
});

test("castle: the spawned body clears the exit zone (no instant re-trigger)", () => {
  const exit = events().find((event) => event.id === "event_rainland_castle_exit");
  assert.equal(exit.commands[0].type, "transfer");
  const spawn = MAP.spawns.fromCastleTown;
  const overlaps = spawn.x + PLAYER.width / 2 > exit.bounds.x && spawn.x - PLAYER.width / 2 < exit.bounds.x + exit.bounds.width &&
    spawn.y + PLAYER.height / 2 > exit.bounds.y && spawn.y - PLAYER.height / 2 < exit.bounds.y + exit.bounds.height;
  assert.equal(overlaps, false, "the spawned Player body must not overlap the exit zone");
});

test("castle: carpet, hall floor, stairs, wings and the gate are walkable; walls, pedestals, plants, furniture and the throne door are blocked", () => {
  const isBlocked = collision();
  for (const [name, x, y] of [
    ["spawn", MAP.spawns.fromCastleTown.x, MAP.spawns.fromCastleTown.y], ["exit zone", 724, 1068], ["gate stem", 724, 1030], ["entrance hall", 540, 900],
    ["hall centre carpet", 724, 650], ["hall west", 400, 650], ["hall east", 1000, 700], ["hall north strip", 500, 540], ["throne route carpet", 724, 320],
    ["throne door apron", 724, 150], ["throne strip (west)", 630, 400], ["throne strip (east)", 820, 400], ["west connect", 290, 610], ["west wing", 170, 600],
    ["west stairs", 170, 260], ["east connect", 1250, 610], ["east wing", 1280, 450], ["east room carpet", 1280, 360],
  ]) assert.equal(isBlocked(x, y), false, `${name} (${x},${y}) must be walkable`);
  for (const [name, x, y] of [
    ["pedestal (west)", 588, 560], ["pedestal (east)", 860, 770], ["topiary (north-west)", 368, 520], ["topiary (south-east)", 1080, 790], ["picture and bench", 460, 800],
    ["lamp post", 636, 960], ["entrance topiary", 606, 980], ["torch base (west wing)", 110, 430], ["console table", 1280, 320], ["floor strip behind the table (too narrow)", 1210, 330], ["throne door", 724, 100],
    ["banner wall beside the throne route", 625, 220], ["hall north wall", 450, 450], ["outer void (north-west)", 40, 40], ["void beside the throne route", 500, 300],
    ["wall beside the gate", 560, 1060], ["outer void (east)", 1400, 900], ["west stairs wall", 100, 250],
  ]) assert.equal(isBlocked(x, y), true, `${name} (${x},${y}) must be blocked`);
});

test("castle: only the gate touches the map border", () => {
  const isBlocked = collision();
  const m = manifest();
  const open = { top: [], bottom: [], left: [], right: [] };
  for (let x = 0; x < m.width; x += 1) {
    if (!isBlocked(x, 0)) open.top.push(x);
    if (!isBlocked(x, m.height - 1)) open.bottom.push(x);
  }
  for (let y = 0; y < m.height; y += 1) {
    if (!isBlocked(0, y)) open.left.push(y);
    if (!isBlocked(m.width - 1, y)) open.right.push(y);
  }
  assert.deepEqual([open.top.length, open.left.length, open.right.length], [0, 0, 0]);
  assert.ok(open.bottom.length > 0 && open.bottom.every((x) => x >= 640 && x < 816), "only the gate may reach the bottom border");
});

test("castle: 3 to 5 provisional NPCs, each with a dialogue, standing on walkable floor", () => {
  assert.ok(MAP.npcs.length >= 3 && MAP.npcs.length <= 5, `expected 3-5 NPCs, got ${MAP.npcs.length}`);
  assert.equal(new Set(MAP.npcs.map((npc) => npc.id)).size, MAP.npcs.length);
  const isBlocked = collision();
  for (const { npc, rect } of npcBodies()) {
    assert.equal(npc.mapId, MAP_ID);
    assert.ok(getDialogue(npc.dialogueId), `dialogue ${npc.dialogueId} must exist`);
    for (const [x, y] of [[rect.x, rect.y], [rect.x + rect.width - 1, rect.y], [rect.x, rect.y + rect.height - 1], [rect.x + rect.width - 1, rect.y + rect.height - 1]]) {
      assert.equal(isBlocked(x, y), false, `${npc.id} must stand on walkable floor (corner ${x},${y})`);
    }
  }
});

test("castle: provisional dialogue stays inside the NPC brief - no Mirei identity or royal-family reveal", () => {
  // docs/NPC/04_rainland_castle.md section 4 and 6: no castle NPC may reveal Mirei's identity before the story allows it.
  const castleDialogueIds = MAP.npcs.map((npc) => npc.dialogueId);
  assert.ok(castleDialogueIds.length > 0);
  for (const id of castleDialogueIds) {
    for (const page of DIALOGUES[id].pages) assert.doesNotMatch(page, /ミレイ|ひめ|姫|おうじょ|王女/, `${id} must not mention Mirei or a princess`);
    assert.equal(DIALOGUES[id].afterDialogue, undefined, `${id} has no battle / party-join event (the castle Scene does not run after-dialogue events)`);
  }
});

test("castle: with the NPC bodies blocked, the player body still walks from the spawn to every event and to every NPC", () => {
  const blockers = npcBodies().map(({ rect }) => rect);
  const result = analyseBodyReachability("rainland_castle", MAP_ID, { margin: 6, blockers });
  assert.equal(result.startFits, true, "the spawn must have room for the body");
  for (const spawn of result.spawnResults) assert.equal(spawn.ok, true, `spawn ${spawn.id} is not reachable`);
  for (const event of result.eventResults) assert.equal(event.ok, true, `${event.id} is not reachable`);
  // key walking spots: the throne door recess, the top of the stairs, the east side room, both wings' far ends, the hall's four corners
  for (const [x, y, name] of [
    [724, 150, "throne door apron"], [176, 232, "stairs (top)"], [1280, 370, "east room carpet"], [130, 640, "west wing (south-west corner)"],
    [1330, 640, "east wing (south-east corner)"], [412, 540, "hall north-west"], [1000, 540, "hall north-east"], [340, 700, "hall west edge"], [1000, 826, "hall south-east"],
    [632, 470, "throne strip (west, south of the soldier)"], [820, 400, "throne strip (east)"], [724, 1070, "exit stem"],
  ]) assert.equal(result.canReach(x, y), true, `${name} (${x},${y}) is not reachable`);
  // each NPC can be talked to: a spot next to it, with the player centre within INTERACTION_REACH (27 world px = 18 native px)
  // of the NPC edge, is reachable. Bare body (margin 0): talking is allowed while pressed up against the NPC.
  const talk = analyseBodyReachability("rainland_castle", MAP_ID, { margin: 0, blockers });
  const halfW = NPC_VISUAL.width / manifest().worldScale / 2;
  const halfH = NPC_VISUAL.height / manifest().worldScale / 2;
  const gap = 16;
  for (const { npc } of npcBodies()) {
    const neighbours = [
      [npc.position.x - halfW - gap, npc.position.y], [npc.position.x + halfW + gap, npc.position.y],
      [npc.position.x, npc.position.y - halfH - gap], [npc.position.x, npc.position.y + halfH + gap],
    ];
    assert.ok(neighbours.some(([x, y]) => talk.canReach(x, y)), `${npc.id} has no reachable spot to talk from`);
  }
});

test("castle: the Scene is registered for normal play, the world-map test and ?mapTest=rainland-castle, and stays a thin Scene", () => {
  const main = readFileSync(path.join(REPO_ROOT, "src/main.ts"), "utf-8");
  assert.match(main, /normalScenes = \[[^\]]*RainlandCastleScene[^\]]*\]/);
  assert.match(main, /\? \[WorldMapTestScene[^\]]*RainlandCastleScene[^\]]*\]/);
  assert.match(main, /mapTestRequested === "rainland-castle"\s*\n?[^\n]*\n?\s*\? \[RainlandCastleScene, RainlandCastleTownScene, WorldMapScene, MapSplashScene\]/);
  assert.match(main, /mapTestRequested === "rainland-castle-town"\s*\n?[^\n]*\n?\s*\? \[RainlandCastleTownScene, RainlandCastleScene, /);
  const scene = readFileSync(path.join(REPO_ROOT, "src/scenes/RainlandCastleScene.ts"), "utf-8");
  assert.match(scene, /super\("RainlandCastleScene"/);
  // swapping in the real background is data-only (images + map.json); the Scene carries no DEV_PLACEHOLDER special case
  assert.doesNotMatch(scene, /assetStatus\s*:/);
  assert.ok(scene.split("\n").length < 45, "RainlandCastleScene must stay a thin Scene");
});
